const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const NotificationsModel = require('./notificationsModel');

const likesCol = db.collection('likes');
const postsCol = db.collection('posts');

class LikesModel {
  static async toggleLike(postId, userId) {
    const likeId = `${postId}_${userId}`;
    const likeRef = likesCol.doc(likeId);
    const likeDoc = await likeRef.get();

    if (likeDoc.exists) {
      // Unlike
      await likeRef.delete();
      return { liked: false };
    } else {
      // Like
      await likeRef.set({
        post_id: String(postId),
        user_id: userId,
        created_at: FieldValue.serverTimestamp()
      });

      // Create notification for the post owner
      const postDoc = await postsCol.doc(String(postId)).get();
      if (postDoc.exists) {
        await NotificationsModel.createNotification(postDoc.data().user_id, userId, 'like', String(postId));
      }

      return { liked: true };
    }
  }

  static async getLikeCountForPost(postId) {
    const snapshot = await likesCol.where('post_id', '==', String(postId)).count().get();
    return snapshot.data().count;
  }
}

module.exports = LikesModel;
