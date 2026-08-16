const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const usersCol = db.collection('users');
const postsCol = db.collection('posts');
const followsCol = db.collection('follows');
const likesCol = db.collection('likes');

class ProfileModel {
  static async getProfileByUid(firebase_uid, callerUid = null) {
    let userDoc = await usersCol.doc(firebase_uid).get();

    if (!userDoc.exists) {
      // Auto-create profile if it doesn't exist
      try {
        await usersCol.doc(firebase_uid).set({
          firebase_uid,
          email: 'user@app.com',
          full_name: 'User',
          username: 'user_' + firebase_uid.substring(0, 5),
          bio: '',
          profile_picture: '',
          cover_photo: null,
          location: '',
          website: '',
          joined_date: FieldValue.serverTimestamp()
        });
        userDoc = await usersCol.doc(firebase_uid).get();
      } catch (e) {
        console.warn('Auto-create profile error:', e.message);
      }
    }

    if (!userDoc.exists) return null;

    const userData = userDoc.data();
    const userProfile = {
      firebase_uid: userData.firebase_uid || firebase_uid,
      full_name: userData.full_name || '',
      username: userData.username || '',
      email: userData.email || '',
      bio: userData.bio || '',
      profile_picture: userData.profile_picture || '',
      cover_photo: userData.cover_photo || null,
      location: userData.location || '',
      website: userData.website || '',
      joined_date: userData.joined_date ? userData.joined_date.toDate() : new Date()
    };

    // Fetch stats
    const postsSnap = await postsCol.where('user_id', '==', firebase_uid).count().get();
    userProfile.total_posts = postsSnap.data().count;

    const followersSnap = await followsCol.where('following_id', '==', firebase_uid).count().get();
    userProfile.followers = followersSnap.data().count;

    const followingSnap = await followsCol.where('follower_id', '==', firebase_uid).count().get();
    userProfile.following = followingSnap.data().count;

    // Likes received: count likes on all user's posts
    const userPostsSnap = await postsCol.where('user_id', '==', firebase_uid).get();
    let likesReceived = 0;
    if (userPostsSnap.docs.length > 0) {
      const postIds = userPostsSnap.docs.map(d => d.id);
      // Batch count likes for each post
      for (const postId of postIds) {
        const likesSnap = await likesCol.where('post_id', '==', postId).count().get();
        likesReceived += likesSnap.data().count;
      }
    }
    userProfile.likes_received = likesReceived;

    // Check if caller is following this user
    if (callerUid && callerUid !== firebase_uid) {
      const followDoc = await followsCol.doc(`${callerUid}_${firebase_uid}`).get();
      userProfile.is_following_current = followDoc.exists;
    }

    return userProfile;
  }

  static async findByUsername(username, excludeUid = null) {
    let query = usersCol.where('username', '==', username);
    const snapshot = await query.get();

    if (snapshot.empty) return false;

    // If excluding a UID, check if the match is a different user
    if (excludeUid) {
      return snapshot.docs.some(doc => doc.id !== excludeUid);
    }

    return true;
  }

  static async updateProfile(firebase_uid, { full_name, username, bio, location, website }) {
    const userRef = usersCol.doc(firebase_uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return false;

    await userRef.update({
      full_name: full_name || '',
      username: username || '',
      bio: bio || '',
      location: location || '',
      website: website || ''
    });

    return true;
  }

  static async updateProfilePicture(firebase_uid, imagePath) {
    const userRef = usersCol.doc(firebase_uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return false;

    await userRef.update({ profile_picture: imagePath });
    return true;
  }

  static async updateCoverPhoto(firebase_uid, imagePath) {
    const userRef = usersCol.doc(firebase_uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return false;

    await userRef.update({ cover_photo: imagePath });
    return true;
  }
}

module.exports = ProfileModel;
