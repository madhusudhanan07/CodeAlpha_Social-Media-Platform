const mysql = require('mysql2');
require('dotenv').config();

// Extract database connection configuration from environment
const rawUrl =
  process.env.MYSQL_PUBLIC_URL ||
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.JAWSDB_URL ||
  process.env.CLEARDB_DATABASE_URL;

let poolConfig;

if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
  try {
    const parsedUrl = new URL(rawUrl);
    poolConfig = {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3306,
      user: decodeURIComponent(parsedUrl.username || ''),
      password: decodeURIComponent(parsedUrl.password || ''),
      database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Enable SSL for cloud hosting unless DB_SSL is explicitly false
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
  } catch (parseErr) {
    // If URL parsing fails, pass uri directly
    poolConfig = {
      uri: rawUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
  }
} else {
  // Use individual environment variables (with sensible defaults for local development)
  const isCloud = !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production');
  poolConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'social_media',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true' || (isCloud && process.env.DB_SSL !== 'false')) 
      ? { rejectUnauthorized: false } 
      : false
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool.promise();