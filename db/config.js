require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a MySQL connection pool
const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
});

// Function to execute queries with retry logic
async function queryWithRetry(sql, params = [], retries = 3) {
    let connection;
    while (retries > 0) {
        try {
            connection = await pool.getConnection(); // Get a connection from the pool
            const [rows] = await connection.execute(sql, params); // Execute the query on the connection
            connection.release(); // Release the connection back to the pool
            return rows;
        } catch (error) {
            if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
                console.warn('Connection lost. Retrying...');
                retries -= 1;
                if (connection) connection.release(); // Ensure the connection is released in case of error
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            } else {
                if (connection) connection.release(); // Release the connection in case of non-retryable error
                throw error; // Re-throw other errors
            }
        }
    }
    throw new Error('Failed to execute query after retries.');
}

module.exports = { pool, queryWithRetry };
