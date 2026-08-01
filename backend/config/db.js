const mysql = require('mysql2');
require('dotenv').config();

// Railway URL or DB_URL to connect directly
const connectionUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

const pool = mysql.createPool(connectionUrl + '?ssl={"rejectUnauthorized":false}');

module.exports = pool.promise();