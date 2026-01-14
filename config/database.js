const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_street_light',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Add these for better compatibility with some MySQL versions
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully to', process.env.DB_NAME);
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Host:', process.env.DB_HOST);
        console.error('Port:', process.env.DB_PORT);
        console.error('User:', process.env.DB_USER);
        console.error('Please ensure MySQL is running and credentials in .env are correct');
    }
}

testConnection();

module.exports = pool;
