const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const savedPostsCol = db.collection('saved_posts');
const savedCollectionsCol = db.collection('saved_collections');
const postsCol = db.collection('posts');
const usersCol = db.collection('users');
const likesCol = db.collection('likes');
const commentsCol = db.collection('comments');
const postImagesCol = db.collection('post_images');

// Save a post
exports.savePost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const postId = req.params.postId;
    const { collectionId } = req.body; // optional

    // Check if post exists
    const postDoc = await postsCol.doc(String(postId)).get();
    if (!postDoc.exists) return res.status(404).json({ success: false, message: 'Post not found' });

    // Check if already saved (composite ID)
    const saveId = `${userId}_${postId}`;
    const existingDoc = await savedPostsCol.doc(saveId).get();
    if (existingDoc.exists) return res.status(400).json({ success: false, message: 'Post already saved' });

    await savedPostsCol.doc(saveId).set({
      user_id: userId,
      post_id: String(postId),
      collection_id: collectionId || null,
      created_at: FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, message: 'Post saved' });
  } catch (error) {
    console.error('savePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Remove a saved post
exports.removeSavedPost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const postId = req.params.postId;

    const saveId = `${userId}_${postId}`;
    await savedPostsCol.doc(saveId).delete();

    res.status(200).json({ success: true, message: 'Post removed from saved' });
  } catch (error) {
    console.error('removeSavedPost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Return a list of completely formatted Posts that are saved.
exports.getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.uid;

    const savedSnap = await savedPostsCol
      .where('user_id', '==', userId)
      .get();

    // Sort in memory to avoid needing a Firestore composite index
    const sortedDocs = savedSnap.docs.sort((a, b) => {
      const dateA = a.data().created_at?.toDate() || new Date(0);
      const dateB = b.data().created_at?.toDate() || new Date(0);
      return dateB - dateA; // desc
    });

    const formattedPosts = await Promise.all(
      sortedDocs.map(async (savedDoc) => {
        const savedData = savedDoc.data();
        const postDoc = await postsCol.doc(savedData.post_id).get();
        if (!postDoc.exists) return null;

        const post = postDoc.data();
        const userDoc = await usersCol.doc(post.user_id).get();
        const user = userDoc.exists ? userDoc.data() : {};

        // Get likes count
        const likesSnap = await likesCol.where('post_id', '==', savedData.post_id).count().get();
        const likesCount = likesSnap.data().count;

        // Get comments count
        const commentsSnap = await commentsCol.where('post_id', '==', savedData.post_id).count().get();
        const commentsCount = commentsSnap.data().count;

        // Check if current user liked
        const likeDoc = await likesCol.doc(`${savedData.post_id}_${userId}`).get();
        const isLikedByCurrentUser = likeDoc.exists;

        // Get post images
        const imagesSnap = await postImagesCol.where('post_id', '==', savedData.post_id).get();
        const additionalImages = imagesSnap.docs.map(d => d.data().image_url);

        const images = additionalImages.length > 0
          ? additionalImages
          : (post.image_url ? [post.image_url] : []);

        return {
          id: postDoc.id,
          content: post.content || '',
          image_url: post.image_url || null,
          images,
          created_at: post.created_at ? post.created_at.toDate() : new Date(),
          updated_at: post.updated_at ? post.updated_at.toDate() : new Date(),
          user_id: post.user_id,
          username: user.username || '',
          displayName: user.full_name || '',
          userAvatar: user.profile_picture || '',
          likesCount,
          commentsCount,
          isLikedByCurrentUser,
          collection_id: savedData.collection_id || null,
          saved_at: savedData.created_at ? savedData.created_at.toDate() : new Date()
        };
      })
    );

    // Filter out nulls (deleted posts)
    const validPosts = formattedPosts.filter(p => p !== null);

    res.status(200).json({ success: true, posts: validPosts });
  } catch (error) {
    console.error('getSavedPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
};

// Fetch IDs of all saved posts to globally manage UI states in Context natively.
exports.getSavedPostIds = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await savedPostsCol.where('user_id', '==', userId).get();
    const ids = snapshot.docs.map(d => d.data().post_id);
    res.status(200).json({ success: true, savedIds: ids });
  } catch (error) {
    console.error('getSavedPostIds error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Optional Collections */
exports.getCollections = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await savedCollectionsCol
      .where('user_id', '==', userId)
      .get();

    // Sort in memory to avoid needing a Firestore composite index
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const dateA = a.data().created_at?.toDate() || new Date(0);
      const dateB = b.data().created_at?.toDate() || new Date(0);
      return dateB - dateA;
    });

    const collections = sortedDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at ? doc.data().created_at.toDate() : new Date()
    }));
    res.status(200).json({ success: true, collections });
  } catch (error) {
    console.error('getCollections error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Name is required' });

    const colRef = await savedCollectionsCol.add({
      user_id: userId,
      name: name.trim(),
      created_at: FieldValue.serverTimestamp()
    });
    res.status(200).json({ success: true, collection: { id: colRef.id, name: name.trim(), user_id: userId } });
  } catch (error) {
    console.error('Failed to create collection:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const colRef = savedCollectionsCol.doc(id);
    const colDoc = await colRef.get();

    if (colDoc.exists && colDoc.data().user_id === userId) {
      await colRef.delete();
    }

    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.renameCollection = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Name is required' });

    const colRef = savedCollectionsCol.doc(id);
    const colDoc = await colRef.get();

    if (!colDoc.exists || colDoc.data().user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    await colRef.update({ name: name.trim() });

    res.status(200).json({ success: true, collection: { id, name: name.trim() } });
  } catch (error) {
    console.error('renameCollection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
