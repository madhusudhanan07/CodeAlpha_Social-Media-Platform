const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const NotificationsModel = require('./notificationsModel');

const commentsCol = db.collection('comments');
const usersCol = db.collection('users');
const postsCol = db.collection('posts');

class CommentsModel {
  static async getCommentsForPost(postId) {
    const snapshot = await commentsCol
      .where('post_id', '==', String(postId))
      .orderBy('created_at', 'asc')
      .get();

    const comments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await usersCol.doc(data.user_id).get();
        const user = userDoc.exists ? userDoc.data() : {};

        return {
          id: doc.id,
          content: data.content,
          created_at: data.created_at ? data.created_at.toDate() : new Date(),
          user_id: data.user_id,
          username: user.username || 'unknown',
          displayName: user.full_name || 'Unknown',
          userAvatar: user.profile_picture || ''
        };
      })
    );

    return comments;
  }

  static async createComment(postId, userId, content) {
    const commentData = {
      post_id: String(postId),
      user_id: userId,
      content,
      created_at: FieldValue.serverTimestamp()
    };

    const commentRef = await commentsCol.add(commentData);

    // Notification for comment
    const postDoc = await postsCol.doc(String(postId)).get();
    if (postDoc.exists) {
      await NotificationsModel.createNotification(postDoc.data().user_id, userId, 'comment', String(postId));
    }

    // Fetch and return the newly created comment with user info
    const userDoc = await usersCol.doc(userId).get();
    const user = userDoc.exists ? userDoc.data() : {};

    return {
      id: commentRef.id,
      content,
      created_at: new Date(),
      user_id: userId,
      username: user.username || 'unknown',
      displayName: user.full_name || 'Unknown',
      userAvatar: user.profile_picture || ''
    };
  }
}

module.exports = CommentsModel;
