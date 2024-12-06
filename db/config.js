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

// Promisify pool query to use async/await
pool.queryPromise = function (sql, values) {
    return new Promise((resolve, reject) => {
        pool.query(sql, values, (error, results) => {
            if (error) reject(error);
            resolve(results);
        });
    });
};

module.exports = pool;