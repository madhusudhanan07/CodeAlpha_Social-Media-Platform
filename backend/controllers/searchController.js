const { db } = require('../config/firebase');

const usersCol = db.collection('users');

exports.searchUsers = async (req, res) => {
  try {
    const queryTerm = req.query.q;
    if (!queryTerm) {
      return res.status(200).json({ success: true, users: [] });
    }

    const searchLower = queryTerm.toLowerCase();

    // Firestore doesn't support SQL LIKE queries.
    // Strategy: fetch users and filter in memory for small datasets,
    // or use prefix matching for larger datasets.
    
    // Try prefix match on username first
    const usernameSnap = await usersCol
      .where('username', '>=', searchLower)
      .where('username', '<=', searchLower + '\uf8ff')
      .limit(10)
      .get();

    const results = new Map();
    usernameSnap.docs.forEach(doc => {
      const u = doc.data();
      results.set(doc.id, {
        id: doc.id,
        username: u.username || '',
        displayName: u.full_name || '',
        avatar: u.profile_picture || ''
      });
    });

    // If we don't have enough results, also try full_name prefix match
    if (results.size < 10) {
      const nameSnap = await usersCol
        .where('full_name', '>=', queryTerm)
        .where('full_name', '<=', queryTerm + '\uf8ff')
        .limit(10)
        .get();

      nameSnap.docs.forEach(doc => {
        if (!results.has(doc.id)) {
          const u = doc.data();
          results.set(doc.id, {
            id: doc.id,
            username: u.username || '',
            displayName: u.full_name || '',
            avatar: u.profile_picture || ''
          });
        }
      });
    }

    res.status(200).json({ success: true, users: Array.from(results.values()).slice(0, 10) });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
