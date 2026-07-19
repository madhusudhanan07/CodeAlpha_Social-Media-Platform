const db = require('../config/db');

class ProfileModel {
  static async getProfileByUid(firebase_uid, callerUid = null) {
    const query = `
      SELECT 
        firebase_uid, full_name, username, email, bio, profile_picture, location, website, joined_date
      FROM users 
      WHERE firebase_uid = ?
    `;
    const [rows] = await db.execute(query, [firebase_uid]);
    
    if (rows.length === 0) return null;

    const userProfile = rows[0];

    // Fetch stats
    const [postsRows] = await db.execute('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [firebase_uid]);
    const [followersRows] = await db.execute('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [firebase_uid]);
    const [followingRows] = await db.execute('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [firebase_uid]);
    const [likesRows] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM likes 
      INNER JOIN posts ON likes.post_id = posts.id 
      WHERE posts.user_id = ?
    `, [firebase_uid]);

    userProfile.total_posts = postsRows[0].count;
    userProfile.followers = followersRows[0].count;
    userProfile.following = followingRows[0].count;
    userProfile.likes_received = likesRows[0].count;

    if (callerUid) {
      const [followingCheck] = await db.execute('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [callerUid, firebase_uid]);
      userProfile.is_following_current = followingCheck.length > 0;
    }

    return userProfile;
  }

  static async findByUsername(username, excludeUid = null) {
    let query = 'SELECT id FROM users WHERE username = ?';
    const params = [username];
    
    if (excludeUid) {
      query += ' AND firebase_uid != ?';
      params.push(excludeUid);
    }

    const [rows] = await db.execute(query, params);
    return rows.length > 0;
  }

  static async updateProfile(firebase_uid, { full_name, username, bio, location, website }) {
    const query = `
      UPDATE users 
      SET full_name = ?, username = ?, bio = ?, location = ?, website = ?
      WHERE firebase_uid = ?
    `;
    const [result] = await db.execute(query, [full_name, username, bio, location || '', website || '', firebase_uid]);
    return result.affectedRows > 0;
  }

  static async updateProfilePicture(firebase_uid, imagePath) {
    const query = `
      UPDATE users 
      SET profile_picture = ?
      WHERE firebase_uid = ?
    `;
    const [result] = await db.execute(query, [imagePath, firebase_uid]);
    return result.affectedRows > 0;
  }
}

module.exports = ProfileModel;
