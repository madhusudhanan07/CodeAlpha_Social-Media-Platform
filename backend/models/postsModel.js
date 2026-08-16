const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const postsCol = db.collection('posts');
const usersCol = db.collection('users');
const likesCol = db.collection('likes');
const commentsCol = db.collection('comments');
const postImagesCol = db.collection('post_images');

// Helper: fetch user profile data for embedding in post response
async function getUserData(userId) {
  const userDoc = await usersCol.doc(userId).get();
  if (!userDoc.exists) return { user_id: userId, username: 'unknown', displayName: 'Unknown', userAvatar: '' };
  const u = userDoc.data();
  return {
    user_id: userId,
    username: u.username || 'unknown',
    displayName: u.full_name || 'Unknown',
    userAvatar: u.profile_picture || ''
  };
}

// Helper: enrich a post doc with user info, like/comment counts, and current-user like status
async function enrichPost(postDoc, currentUserId = null) {
  const data = postDoc.data();
  const postId = postDoc.id;
  const userData = await getUserData(data.user_id);

  // Get likes count
  const likesSnap = await likesCol.where('post_id', '==', postId).count().get();
  const likesCount = likesSnap.data().count;

  // Get comments count
  const commentsSnap = await commentsCol.where('post_id', '==', postId).count().get();
  const commentsCount = commentsSnap.data().count;

  // Check if current user liked
  let isLikedByCurrentUser = false;
  if (currentUserId) {
    const likeDoc = await likesCol.doc(`${postId}_${currentUserId}`).get();
    isLikedByCurrentUser = likeDoc.exists;
  }

  // Get additional images
  const imagesSnap = await postImagesCol.where('post_id', '==', postId).get();
  const additionalImages = imagesSnap.docs.map(d => d.data().image_url);

  const images = additionalImages.length > 0
    ? additionalImages
    : (data.image_url ? [data.image_url] : []);

  return {
    id: postId,
    content: data.content || '',
    image_url: data.image_url || null,
    images,
    created_at: data.created_at ? data.created_at.toDate() : new Date(),
    updated_at: data.updated_at ? data.updated_at.toDate() : new Date(),
    ...userData,
    likesCount,
    commentsCount,
    isLikedByCurrentUser
  };
}

class PostsModel {
  static async createPost(userId, content, imageUrl = null, images = []) {
    const primaryImage = imageUrl || (images && images.length > 0 ? images[0] : null);

    const postData = {
      user_id: userId,
      content: content || '',
      image_url: primaryImage,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };

    const postRef = await postsCol.add(postData);
    const postId = postRef.id;

    // Save additional images
    if (images && images.length > 0) {
      const batch = db.batch();
      images.forEach(img => {
        const imgRef = postImagesCol.doc();
        batch.set(imgRef, { post_id: postId, image_url: img, created_at: FieldValue.serverTimestamp() });
      });
      await batch.commit();
    }

    // Fetch and return the newly created post with user details
    return await this.getPostById(postId, userId);
  }

  static async getTrendingPosts(currentUserId = null, limit = 10, offset = 0) {
    // Firestore doesn't support ORDER BY aggregation directly.
    // Fetch more posts, compute likesCount, sort in memory, then paginate.
    const snapshot = await postsCol.orderBy('created_at', 'desc').limit(100).get();
    
    const enriched = await Promise.all(
      snapshot.docs.map(doc => enrichPost(doc, currentUserId))
    );

    // Sort by likes descending, then by created_at descending
    enriched.sort((a, b) => {
      if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return enriched.slice(offset, offset + limit);
  }

  static async getAllPosts(currentUserId = null, limit = 10, offset = 0) {
    // For offset-based pagination, we fetch offset+limit and slice
    const snapshot = await postsCol
      .orderBy('created_at', 'desc')
      .limit(offset + limit)
      .get();

    const docs = snapshot.docs.slice(offset);

    const posts = await Promise.all(
      docs.map(doc => enrichPost(doc, currentUserId))
    );

    return posts;
  }

  static async getPostById(postId, currentUserId = null) {
    const postDoc = await postsCol.doc(String(postId)).get();
    if (!postDoc.exists) return null;
    return await enrichPost(postDoc, currentUserId);
  }

  static async updatePost(postId, userId, content) {
    const postRef = postsCol.doc(String(postId));
    const postDoc = await postRef.get();

    if (!postDoc.exists || postDoc.data().user_id !== userId) return null;

    await postRef.update({
      content,
      updated_at: FieldValue.serverTimestamp()
    });

    return await this.getPostById(postId, userId);
  }

  static async deletePost(postId, userId) {
    const postRef = postsCol.doc(String(postId));
    const postDoc = await postRef.get();

    if (!postDoc.exists || postDoc.data().user_id !== userId) return false;

    // Delete related data (likes, comments, post_images)
    const batch = db.batch();

    const likesSnap = await likesCol.where('post_id', '==', String(postId)).get();
    likesSnap.docs.forEach(doc => batch.delete(doc.ref));

    const commentsSnap = await commentsCol.where('post_id', '==', String(postId)).get();
    commentsSnap.docs.forEach(doc => batch.delete(doc.ref));

    const imagesSnap = await postImagesCol.where('post_id', '==', String(postId)).get();
    imagesSnap.docs.forEach(doc => batch.delete(doc.ref));

    batch.delete(postRef);
    await batch.commit();

    return true;
  }

  static async getPostsByUser(userId, limit = 10, offset = 0) {
    const snapshot = await postsCol
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(offset + limit)
      .get();

    const docs = snapshot.docs.slice(offset);

    const posts = await Promise.all(
      docs.map(async (doc) => {
        const enriched = await enrichPost(doc, userId);
        // Return with snake_case aliases matching the original MySQL query
        return {
          ...enriched,
          user_avatar: enriched.userAvatar,
          likes_count: enriched.likesCount,
          comments_count: enriched.commentsCount,
          images_list: enriched.images.join(','),
          is_liked_by_current_user: enriched.isLikedByCurrentUser
        };
      })
    );

    return posts;
  }
}

module.exports = PostsModel;
