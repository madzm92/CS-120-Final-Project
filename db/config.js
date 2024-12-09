// configure database here
require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    charset: 'utf8mb4',
    connectionLimit: 5,
    collation: 'utf8mb4_unicode_ci'
});

module.exports = pool;