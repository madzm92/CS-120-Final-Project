// configure database here
require('dotenv').config();

const mysql = require('mysql');

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    connectionLimit: 5
  });

  pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log('Connected to the database.');
    connection.release(); // Release the connection back to the pool
  });

  module.exports = pool;