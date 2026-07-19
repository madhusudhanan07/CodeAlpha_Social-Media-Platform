const db = require('../config/db');

class PostsModel {
  static async createPost(userId, content, imageUrl = null, images = []) {
    // If no imageUrl is provided but images array has items, set first one as imageUrl
    const primaryImage = imageUrl || (images && images.length > 0 ? images[0] : null);

    const query = `
      INSERT INTO posts (user_id, content, image_url)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(query, [userId, content, primaryImage]);
    const postId = result.insertId;

    if (images && images.length > 0) {
      const imageValues = images.map(img => [postId, img]);
      await db.query(`INSERT INTO post_images (post_id, image_url) VALUES ?`, [imageValues]);
    }
    
    // Fetch and return the newly created post with user details
    return await this.getPostById(postId);
  }

  static async getAllPosts(currentUserId = null, limit = 10, offset = 0) {
    const query = `
      SELECT  
        p.id, 
        p.content, 
        p.image_url, 
        (SELECT GROUP_CONCAT(pi.image_url SEPARATOR ',') FROM post_images pi WHERE pi.post_id = p.id) as images,
        p.created_at, 
        p.updated_at,
        u.firebase_uid as user_id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as userAvatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likesCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS commentsCount,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS isLikedByCurrentUser
      FROM posts p
      JOIN users u ON p.user_id = u.firebase_uid
      ORDER BY p.created_at DESC
      LIMIT ${Number(limit) || 10} OFFSET ${Number(offset) || 0}
    `;
    const [rows] = await db.execute(query, [currentUserId || '']);
    return rows.map(r => ({
      ...r,
      images: r.images ? r.images.split(',') : (r.image_url ? [r.image_url] : []),
      isLikedByCurrentUser: !!r.isLikedByCurrentUser
    }));
  }

  static async getPostById(postId, currentUserId = null) {
    const query = `
      SELECT 
        p.id, 
        p.content, 
        p.image_url, 
        (SELECT GROUP_CONCAT(pi.image_url SEPARATOR ',') FROM post_images pi WHERE pi.post_id = p.id) as images,
        p.created_at, 
        p.updated_at,
        u.firebase_uid as user_id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as userAvatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likesCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS commentsCount,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS isLikedByCurrentUser
      FROM posts p
      JOIN users u ON p.user_id = u.firebase_uid
      WHERE p.id = ?
    `;
    const [rows] = await db.execute(query, [currentUserId || '', postId]);
    return rows.length > 0 ? {
      ...rows[0],
      images: rows[0].images ? rows[0].images.split(',') : (rows[0].image_url ? [rows[0].image_url] : []),
      isLikedByCurrentUser: !!rows[0].isLikedByCurrentUser
    } : null;
  }

  static async updatePost(postId, userId, content) {
    const query = `
      UPDATE posts 
      SET content = ? 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await db.execute(query, [content, postId, userId]);
    if (result.affectedRows === 0) return null;
    return await this.getPostById(postId);
  }

  static async deletePost(postId, userId) {
    const query = `
      DELETE FROM posts 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await db.execute(query, [postId, userId]);
    return result.affectedRows > 0;
  }

  static async getPostsByUser(userId, limit = 10, offset = 0) {
    const query = `
      SELECT 
        p.id, 
        p.content, 
        p.image_url, 
        (SELECT GROUP_CONCAT(pi.image_url SEPARATOR ',') FROM post_images pi WHERE pi.post_id = p.id) as images_list,
        p.created_at, 
        p.updated_at,
        u.firebase_uid as user_id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as user_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked_by_current_user
      FROM posts p
      JOIN users u ON p.user_id = u.firebase_uid
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ${Number(limit) || 10} OFFSET ${Number(offset) || 0}
    `;
    // We pass userId twice (once for existence of likes by the user, and once for the where clause)
    const [rows] = await db.execute(query, [userId, userId]);
    return rows.map(r => ({
      ...r,
      images: r.images_list ? r.images_list.split(',') : (r.image_url ? [r.image_url] : []),
      is_liked_by_current_user: !!r.is_liked_by_current_user
    }));
  }
}

module.exports = PostsModel;
