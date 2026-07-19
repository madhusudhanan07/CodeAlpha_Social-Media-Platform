const db = require('../config/db');

exports.searchUsers = async (req, res) => {
  try {
    const queryTerm = req.query.q;
    if (!queryTerm) {
      return res.status(200).json({ success: true, users: [] });
    }

    const searchQuery = `%${queryTerm}%`;
    const sql = `
      SELECT 
        firebase_uid as id, 
        username, 
        full_name as displayName, 
        profile_picture as avatar
      FROM users 
      WHERE username LIKE ? OR full_name LIKE ?
      LIMIT 10
    `;
    const [rows] = await db.execute(sql, [searchQuery, searchQuery]);
    
    res.status(200).json({ success: true, users: rows });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
