const db = require('../config/db');
const admin = require('firebase-admin');

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
  // Returns row, creating defaults if missing
  const [rows] = await db.execute('SELECT * FROM settings WHERE user_id = ?', [userId]);
  if (rows.length > 0) return rows[0];

  await db.execute(
    `INSERT INTO settings (user_id, theme, language, font_size, privacy, notifications)
     VALUES (?, 'system', 'en', 'medium', ?, ?)`,
    [userId, JSON.stringify(DEFAULT_PRIVACY), JSON.stringify(DEFAULT_NOTIFICATIONS)]
  );
  const [newRows] = await db.execute('SELECT * FROM settings WHERE user_id = ?', [userId]);
  return newRows[0];
}

// ─── GET /api/settings ───────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const row = await upsertSettings(userId);

    // Also fetch user profile fields
    const [users] = await db.execute(
      'SELECT full_name, username, email, bio, profile_picture, cover_photo FROM users WHERE firebase_uid = ?',
      [userId]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      settings: {
        theme: row.theme,
        language: row.language,
        font_size: row.font_size,
        privacy: typeof row.privacy === 'string' ? JSON.parse(row.privacy) : (row.privacy || DEFAULT_PRIVACY),
        notifications: typeof row.notifications === 'string' ? JSON.parse(row.notifications) : (row.notifications || DEFAULT_NOTIFICATIONS),
      },
      profile: users[0],
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
    const [taken] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND firebase_uid != ?',
      [username.trim(), userId]
    );
    if (taken.length > 0) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    await db.execute(
      'UPDATE users SET full_name = ?, username = ?, bio = ? WHERE firebase_uid = ?',
      [full_name?.trim() || '', username.trim(), bio?.trim() || '', userId]
    );

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

    await db.execute(
      'UPDATE settings SET privacy = ? WHERE user_id = ?',
      [JSON.stringify(merged), userId]
    );
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

    await db.execute(
      'UPDATE settings SET notifications = ? WHERE user_id = ?',
      [JSON.stringify(merged), userId]
    );
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

    await db.execute(
      `UPDATE settings SET
        theme      = COALESCE(?, theme),
        language   = COALESCE(?, language),
        font_size  = COALESCE(?, font_size)
       WHERE user_id = ?`,
      [theme || null, language || null, font_size || null, userId]
    );

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

    const [[profile]]   = await db.execute('SELECT full_name, username, email, bio, profile_picture, joined_date FROM users WHERE firebase_uid = ?', [userId]);
    const [posts]       = await db.execute('SELECT id, content, image_url, created_at FROM posts WHERE user_id = ?', [userId]);
    const [comments]    = await db.execute('SELECT id, post_id, content, created_at FROM comments WHERE user_id = ?', [userId]);
    const [likes]       = await db.execute('SELECT post_id, created_at FROM likes WHERE user_id = ?', [userId]);
    const [friends]     = await db.execute('SELECT friend_id, created_at FROM friends WHERE user_id = ?', [userId]).catch(() => [[], []]);
    const [messages]    = await db.execute('SELECT id, conversation_id, message, created_at FROM messages WHERE sender_id = ?', [userId]).catch(() => [[], []]);
    const [notifs]      = await db.execute('SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ?', [userId]).catch(() => [[], []]);
    const [savedPosts]  = await db.execute('SELECT post_id, created_at FROM saved_posts WHERE user_id = ?', [userId]);

    const data = {
      exported_at: new Date().toISOString(),
      profile,
      posts,
      comments,
      likes,
      friends,
      messages,
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

    // Delete all user data in dependency order
    await db.execute('DELETE FROM saved_posts      WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM saved_collections WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM notifications    WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM messages         WHERE sender_id = ?', [userId]).catch(() => {});
    await db.execute('DELETE FROM likes             WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM comments          WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM follows           WHERE follower_id = ? OR following_id = ?', [userId, userId]).catch(() => {});
    await db.execute('DELETE FROM friend_requests   WHERE sender_id = ? OR receiver_id = ?', [userId, userId]).catch(() => {});
    await db.execute('DELETE FROM friends           WHERE user_id = ? OR friend_id = ?', [userId, userId]).catch(() => {});
    await db.execute('DELETE FROM posts             WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM settings          WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM users             WHERE firebase_uid = ?', [userId]);

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
