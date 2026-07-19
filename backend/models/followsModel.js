const db = require('../config/db');
const NotificationsModel = require('./notificationsModel');

class FollowsModel {
  static async toggleFollow(followerId, followingId) {
    if (followerId === followingId) throw new Error("Cannot follow yourself");

    const checkQuery = `SELECT id FROM follows WHERE follower_id = ? AND following_id = ?`;
    const [existing] = await db.execute(checkQuery, [followerId, followingId]);

    if (existing.length > 0) {
      await db.execute(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`, [followerId, followingId]);
      return { followed: false };
    } else {
      await db.execute(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [followerId, followingId]);
      await NotificationsModel.createNotification(followingId, followerId, 'follow');
      return { followed: true };
    }
  }

  static async getSuggestions(userId) {
    // Return users not currently followed by userId (exclude self)
    const query = `
      SELECT 
        u.firebase_uid as id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as avatar 
      FROM users u
      WHERE u.firebase_uid != ? 
      AND u.firebase_uid NOT IN (
        SELECT following_id FROM follows WHERE follower_id = ?
      )
      ORDER BY RAND()
      LIMIT 5
    `;
    const [rows] = await db.execute(query, [userId, userId]);
    return rows;
  }

  static async getFollowStats(userId) {
    const [followers] = await db.execute(`SELECT COUNT(*) as count FROM follows WHERE following_id = ?`, [userId]);
    const [following] = await db.execute(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`, [userId]);
    return {
      followers: followers[0].count,
      following: following[0].count
    };
  }

  static async isFollowing(followerId, followingId) {
    const [rows] = await db.execute(`SELECT id FROM follows WHERE follower_id = ? AND following_id = ?`, [followerId, followingId]);
    return rows.length > 0;
  }
}

module.exports = FollowsModel;
