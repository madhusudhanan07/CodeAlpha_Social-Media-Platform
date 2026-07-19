const PostsModel = require('./models/postsModel');
const db = require('./config/db');

async function test() {
  try {
    const posts = await PostsModel.getPostsByUser('test_uid', 10, 0);
    console.log(posts);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

test();
