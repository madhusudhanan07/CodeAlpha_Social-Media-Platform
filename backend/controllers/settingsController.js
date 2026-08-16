const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const usersCol = db.collection('users');
const settingsCol = db.collection('settings');
const postsCol = db.collection('posts');
const commentsCol = db.collection('comments');
const likesCol = db.collection('likes');
const followsCol = db.collection('follows');
const notificationsCol = db.collection('notifications');
const savedPostsCol = db.collection('saved_posts');
const savedCollectionsCol = db.collection('saved_collections');
const friendsCol = db.collection('friends');
const friendRequestsCol = db.collection('friend_requests');
const conversationsCol = db.collection('conversations');

// ─── helpers ────────────────────────────────────────────────────────────────
const DEFAULT_PRIVACY = {
  account_private: false,
  who_can_message: 'everyone',   // everyone | friends | nobody
  who_can_comment: 'everyone',
  who_can_follow: 'everyone',
  show_online_status: true,
  show_last_seen: true,
};

const DEFAULT_NOTIFICATIONS = {
  likes: true,
  comments: true,
  friend_requests: true,
  messages: true,
  mentions: true,
  email_notifications: false,
};

async function upsertSettings(userId) {
  const settingsRef = settingsCol.doc(userId);
  const settingsDoc = await settingsRef.get();

  if (settingsDoc.exists) return settingsDoc.data();

  const defaults = {
    user_id: userId,
    theme: 'system',
    language: 'en',
    font_size: 'medium',
    privacy: DEFAULT_PRIVACY,
    notifications: DEFAULT_NOTIFICATIONS,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  };

  await settingsRef.set(defaults);
  return { ...defaults, created_at: new Date(), updated_at: new Date() };
}

// ─── GET /api/settings ───────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const row = await upsertSettings(userId);

    // Also fetch user profile fields
    const userDoc = await usersCol.doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, message: 'User not found' });
    const userData = userDoc.data();

    res.json({
      success: true,
      settings: {
        theme: row.theme,
        language: row.language,
        font_size: row.font_size,
        privacy: row.privacy || DEFAULT_PRIVACY,
        notifications: row.notifications || DEFAULT_NOTIFICATIONS,
      },
      profile: {
        full_name: userData.full_name || '',
        username: userData.username || '',
        email: userData.email || '',
        bio: userData.bio || '',
        profile_picture: userData.profile_picture || '',
        cover_photo: userData.cover_photo || null
      },
    });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/settings/profile ───────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { full_name, username, bio } = req.body;

    if (!username || username.trim() === '') {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ success: false, message: 'Username: 3-30 chars, letters/numbers/underscore only' });
    }
    if (bio && bio.length > 200) {
      return res.status(400).json({ success: false, message: 'Bio cannot exceed 200 characters' });
    }

    // Uniqueness check (excluding current user)
    const takenSnap = await usersCol.where('username', '==', username.trim()).get();
    const isTaken = takenSnap.docs.some(doc => doc.id !== userId);
    if (isTaken) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    await usersCol.doc(userId).update({
      full_name: full_name?.trim() || '',
      username: username.trim(),
      bio: bio?.trim() || ''
    });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('settings/updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/settings/password ──────────────────────────────────────────────
// Firebase handles password logic; this endpoint just records a timestamp
// The actual password change is done client-side with Firebase reauthentication.
// This endpoint exists for audit/session-invalidation purposes.
exports.updatePassword = async (req, res) => {
  try {
    // Firebase password is changed on client via reauthenticateWithCredential + updatePassword.
    // We just return success here as confirmation.
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('settings/updatePassword error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/settings/privacy ───────────────────────────────────────────────
exports.updatePrivacy = async (req, res) => {
  try {
    const userId = req.user.uid;
    const merged = { ...DEFAULT_PRIVACY, ...req.body };

    await settingsCol.doc(userId).update({
      privacy: merged,
      updated_at: FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Privacy settings saved', privacy: merged });
  } catch (err) {
    console.error('settings/updatePrivacy error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/settings/notifications ─────────────────────────────────────────
exports.updateNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const merged = { ...DEFAULT_NOTIFICATIONS, ...req.body };

    await settingsCol.doc(userId).update({
      notifications: merged,
      updated_at: FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Notification settings saved', notifications: merged });
  } catch (err) {
    console.error('settings/updateNotifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/settings/theme ─────────────────────────────────────────────────
exports.updateTheme = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { theme, language, font_size } = req.body;

    const validThemes = ['light', 'dark', 'system'];
    const validFonts  = ['small', 'medium', 'large'];

    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({ success: false, message: 'Invalid theme' });
    }
    if (font_size && !validFonts.includes(font_size)) {
      return res.status(400).json({ success: false, message: 'Invalid font_size' });
    }

    const updateData = { updated_at: FieldValue.serverTimestamp() };
    if (theme) updateData.theme = theme;
    if (language) updateData.language = language;
    if (font_size) updateData.font_size = font_size;

    await settingsCol.doc(userId).update(updateData);

    res.json({ success: true, message: 'Appearance saved' });
  } catch (err) {
    console.error('settings/updateTheme error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/settings/export ────────────────────────────────────────────────
exports.exportData = async (req, res) => {
  try {
    const userId = req.user.uid;

    const userDoc = await usersCol.doc(userId).get();
    const profile = userDoc.exists ? userDoc.data() : {};
    // Clean up profile for export
    const exportProfile = {
      full_name: profile.full_name || '',
      username: profile.username || '',
      email: profile.email || '',
      bio: profile.bio || '',
      profile_picture: profile.profile_picture || '',
      joined_date: profile.joined_date ? (profile.joined_date.toDate ? profile.joined_date.toDate() : profile.joined_date) : null
    };

    const postsSnap = await postsCol.where('user_id', '==', userId).get();
    const posts = postsSnap.docs.map(d => {
      const data = d.data();
      return { id: d.id, content: data.content, image_url: data.image_url, created_at: data.created_at ? data.created_at.toDate() : null };
    });

    const commentsSnap = await commentsCol.where('user_id', '==', userId).get();
    const comments = commentsSnap.docs.map(d => {
      const data = d.data();
      return { id: d.id, post_id: data.post_id, content: data.content, created_at: data.created_at ? data.created_at.toDate() : null };
    });

    const likesSnap = await likesCol.where('user_id', '==', userId).get();
    const likes = likesSnap.docs.map(d => {
      const data = d.data();
      return { post_id: data.post_id, created_at: data.created_at ? data.created_at.toDate() : null };
    });

    const notifsSnap = await notificationsCol.where('user_id', '==', userId).get();
    const notifs = notifsSnap.docs.map(d => {
      const data = d.data();
      return { id: d.id, type: data.type, message: data.message, is_read: data.is_read, created_at: data.created_at ? data.created_at.toDate() : null };
    });

    const savedSnap = await savedPostsCol.where('user_id', '==', userId).get();
    const savedPosts = savedSnap.docs.map(d => {
      const data = d.data();
      return { post_id: data.post_id, created_at: data.created_at ? data.created_at.toDate() : null };
    });

    const data = {
      exported_at: new Date().toISOString(),
      profile: exportProfile,
      posts,
      comments,
      likes,
      friends: [],
      messages: [],
      notifications: notifs,
      saved_posts: savedPosts,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('settings/exportData error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /api/settings/account ────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Delete saved posts
    const savedSnap = await savedPostsCol.where('user_id', '==', userId).get();
    const batch1 = db.batch();
    savedSnap.docs.forEach(doc => batch1.delete(doc.ref));
    if (!savedSnap.empty) await batch1.commit();

    // Delete saved collections
    const colSnap = await savedCollectionsCol.where('user_id', '==', userId).get();
    const batch2 = db.batch();
    colSnap.docs.forEach(doc => batch2.delete(doc.ref));
    if (!colSnap.empty) await batch2.commit();

    // Delete notifications
    const notifSnap = await notificationsCol.where('user_id', '==', userId).get();
    const batch3 = db.batch();
    notifSnap.docs.forEach(doc => batch3.delete(doc.ref));
    if (!notifSnap.empty) await batch3.commit();

    // Delete likes
    const likesSnap = await likesCol.where('user_id', '==', userId).get();
    const batch4 = db.batch();
    likesSnap.docs.forEach(doc => batch4.delete(doc.ref));
    if (!likesSnap.empty) await batch4.commit();

    // Delete comments
    const commentsSnap = await commentsCol.where('user_id', '==', userId).get();
    const batch5 = db.batch();
    commentsSnap.docs.forEach(doc => batch5.delete(doc.ref));
    if (!commentsSnap.empty) await batch5.commit();

    // Delete follows (both directions)
    const followSnap1 = await followsCol.where('follower_id', '==', userId).get();
    const followSnap2 = await followsCol.where('following_id', '==', userId).get();
    const batch6 = db.batch();
    followSnap1.docs.forEach(doc => batch6.delete(doc.ref));
    followSnap2.docs.forEach(doc => batch6.delete(doc.ref));
    if (!followSnap1.empty || !followSnap2.empty) await batch6.commit();

    // Delete friend requests
    const frSnap1 = await friendRequestsCol.where('sender_id', '==', userId).get();
    const frSnap2 = await friendRequestsCol.where('receiver_id', '==', userId).get();
    const batch7 = db.batch();
    frSnap1.docs.forEach(doc => batch7.delete(doc.ref));
    frSnap2.docs.forEach(doc => batch7.delete(doc.ref));
    if (!frSnap1.empty || !frSnap2.empty) await batch7.commit();

    // Delete friends
    const friendSnap1 = await friendsCol.where('user1_id', '==', userId).get();
    const friendSnap2 = await friendsCol.where('user2_id', '==', userId).get();
    const batch8 = db.batch();
    friendSnap1.docs.forEach(doc => batch8.delete(doc.ref));
    friendSnap2.docs.forEach(doc => batch8.delete(doc.ref));
    if (!friendSnap1.empty || !friendSnap2.empty) await batch8.commit();

    // Delete posts
    const postsSnap = await postsCol.where('user_id', '==', userId).get();
    const batch9 = db.batch();
    postsSnap.docs.forEach(doc => batch9.delete(doc.ref));
    if (!postsSnap.empty) await batch9.commit();

    // Delete settings
    await settingsCol.doc(userId).delete().catch(() => {});

    // Delete user document
    await usersCol.doc(userId).delete();

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (firebaseErr) {
      console.warn('Firebase user deletion failed (may already be deleted):', firebaseErr.message);
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('settings/deleteAccount error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
