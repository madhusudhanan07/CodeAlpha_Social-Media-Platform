const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const NotificationsModel = require('./notificationsModel');

const followsCol = db.collection('follows');
const usersCol = db.collection('users');

class FollowsModel {
  static async toggleFollow(followerId, followingId) {
    if (followerId === followingId) throw new Error("Cannot follow yourself");

    const followId = `${followerId}_${followingId}`;
    const followRef = followsCol.doc(followId);
    const followDoc = await followRef.get();

    if (followDoc.exists) {
      // Unfollow
      await followRef.delete();
      return { followed: false };
    } else {
      // Follow
      await followRef.set({
        follower_id: followerId,
        following_id: followingId,
        created_at: FieldValue.serverTimestamp()
      });
      await NotificationsModel.createNotification(followingId, followerId, 'follow');
      return { followed: true };
    }
  }

  static async getSuggestions(userId) {
    // Get IDs of users currently followed
    const followingSnap = await followsCol.where('follower_id', '==', userId).get();
    const followingIds = new Set(followingSnap.docs.map(d => d.data().following_id));
    followingIds.add(userId); // Exclude self

    // Fetch all users and filter out followed + self, then pick random 5
    const usersSnap = await usersCol.limit(50).get();
    
    const candidates = usersSnap.docs
      .filter(doc => !followingIds.has(doc.id))
      .map(doc => {
        const u = doc.data();
        return {
          id: doc.id,
          username: u.username || '',
          displayName: u.full_name || '',
          avatar: u.profile_picture || ''
        };
      });

    // Shuffle and take 5
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, 5);
  }

  static async getFollowStats(userId) {
    const followersSnap = await followsCol.where('following_id', '==', userId).count().get();
    const followingSnap = await followsCol.where('follower_id', '==', userId).count().get();
    return {
      followers: followersSnap.data().count,
      following: followingSnap.data().count
    };
  }

  static async isFollowing(followerId, followingId) {
    const followDoc = await followsCol.doc(`${followerId}_${followingId}`).get();
    return followDoc.exists;
  }
}

module.exports = FollowsModel;
