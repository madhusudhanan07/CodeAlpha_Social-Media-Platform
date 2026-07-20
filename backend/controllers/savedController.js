const db = require('../config/db');

// Save a post
exports.savePost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const postId = req.params.postId;
    const { collectionId } = req.body; // optional

    // Check if post exists
    const [posts] = await db.execute(`SELECT id FROM posts WHERE id = ?`, [postId]);
    if (posts.length === 0) return res.status(404).json({ success: false, message: 'Post not found' });

    // Check if already saved
    const [existing] = await db.execute(`SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?`, [userId, postId]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Post already saved' });

    await db.execute(`
      INSERT INTO saved_posts (user_id, post_id, collection_id)
      VALUES (?, ?, ?)
    `, [userId, postId, collectionId || null]);

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

    await db.execute(`DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?`, [userId, postId]);

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

    const query = `
      SELECT 
        p.id,
        p.content,
        p.image_url,
        (SELECT GROUP_CONCAT(pi.image_url SEPARATOR ',') FROM post_images pi WHERE pi.post_id = p.id) as images_concat,
        p.created_at,
        p.updated_at,
        u.firebase_uid as user_id,
        u.username,
        u.full_name as displayName,
        u.profile_picture as userAvatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likesCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS commentsCount,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS isLikedByCurrentUser,
        sp.collection_id,
        sp.created_at as saved_at
      FROM saved_posts sp
      JOIN posts p ON sp.post_id = p.id
      JOIN users u ON p.user_id = u.firebase_uid
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `;

    const [rows] = await db.execute(query, [userId, userId]);

    const formattedPosts = rows.map(r => ({
      ...r,
      images: r.images_concat ? r.images_concat.split(',') : (r.image_url ? [r.image_url] : []),
      isLikedByCurrentUser: !!r.isLikedByCurrentUser,
      images_concat: undefined
    }));

    res.status(200).json({ success: true, posts: formattedPosts });
  } catch (error) {
    console.error('getSavedPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
};

// Fetch IDs of all saved posts to globally manage UI states in Context natively.
exports.getSavedPostIds = async (req, res) => {
  try {
    const userId = req.user.uid;
    const [rows] = await db.execute(`SELECT post_id FROM saved_posts WHERE user_id = ?`, [userId]);
    const ids = rows.map(r => r.post_id);
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
    const [rows] = await db.execute(`SELECT * FROM saved_collections WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    res.status(200).json({ success: true, collections: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Name is required' });

    const [result] = await db.execute(`INSERT INTO saved_collections (user_id, name) VALUES (?, ?)`, [userId, name]);
    res.status(200).json({ success: true, collection: { id: result.insertId, name, user_id: userId } });
  } catch (error) {
    console.error('Failed to create collection:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, stack: error.stack });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    await db.execute(`DELETE FROM saved_collections WHERE id = ? AND user_id = ?`, [id, userId]);
    // Posts belonging to this collection will have collection_id SET NULL mapped.
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

    const [result] = await db.execute(
      `UPDATE saved_collections SET name = ? WHERE id = ? AND user_id = ?`,
      [name.trim(), id, userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Collection not found' });

    res.status(200).json({ success: true, collection: { id: Number(id), name: name.trim() } });
  } catch (error) {
    console.error('renameCollection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
