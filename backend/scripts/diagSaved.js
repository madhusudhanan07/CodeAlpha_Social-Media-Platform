require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function test() {
  try {
    // Test 1: saved_posts table exists
    const [t1] = await db.execute('DESCRIBE saved_posts');
    console.log('saved_posts columns:', t1.map(c => c.Field).join(', '));

    // Test 2: saved_collections table exists
    const [t2] = await db.execute('DESCRIBE saved_collections');
    console.log('saved_collections columns:', t2.map(c => c.Field).join(', '));

    // Test 3: Run the actual getSavedPosts query with a dummy uid
    const userId = 'test_uid_123';
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
    console.log('✅ Main query OK, rows returned:', rows.length);

    // Test 4: collections query
    const [cols] = await db.execute(
      'SELECT * FROM saved_collections WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    console.log('✅ Collections query OK, rows:', cols.length);

    process.exit(0);
  } catch(e) {
    console.error('❌ ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

test();
