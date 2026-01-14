const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initializeDatabase() {
    let connection;

    try {
        // Connect to MySQL server (without database)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to MySQL server');

        // Create database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'smart_street_light'}`);
        console.log(`Database '${process.env.DB_NAME || 'smart_street_light'}' created or already exists`);

        // Use the dat
        await connection.query(`USE ${process.env.DB_NAME || 'smart_street_light'}`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table created');

        // Create devices table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(50) UNIQUE NOT NULL,
                device_name VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                status ENUM('ON', 'OFF') DEFAULT 'OFF',
                mode ENUM('AUTO', 'MANUAL') DEFAULT 'AUTO',
                is_online BOOLEAN DEFAULT false,
                last_seen TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Devices table created');

        // Create sensor_data table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                light_intensity INT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                INDEX idx_device_timestamp (device_id, timestamp)
            )
        `);
        console.log('Sensor data table created');

        // Create control_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS control_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                action VARCHAR(50) NOT NULL,
                mode VARCHAR(20),
                user_id INT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_timestamp (timestamp)
            )
        `);
        console.log('Control logs table created');

        // Create system_settings table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) UNIQUE NOT NULL,
                setting_value VARCHAR(255) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('System settings table created');

        // Insert default system settings
        await connection.query(`
            INSERT INTO system_settings (setting_key, setting_value) VALUES
            ('auto_mode_enabled', 'true'),
            ('light_threshold', '2000'),
            ('polling_interval', '5000')
            ON DUPLICATE KEY UPDATE setting_value = setting_value
        `);
        console.log('Default system settings inserted');

        // Create default admin user
        const defaultPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await connection.query(`
            INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
            ON DUPLICATE KEY UPDATE username = username
        `, ['admin', hashedPassword]);

        console.log('\n✅ Database initialization completed successfully!');
        console.log('\nDefault Admin Credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('\n⚠️  Please change the default password after first login!\n');

        // Insert sample devices for testing
        const sampleDevices = [
            ['LAMP_001', 'Street Lamp 1', 'Main Street - North']
        ];

        for (const device of sampleDevices) {
            await connection.query(`
                INSERT INTO devices (device_id, device_name, location, status, mode, is_online)
                VALUES (?, ?, ?, 'OFF', 'AUTO', false)
                ON DUPLICATE KEY UPDATE device_name = device_name
            `, device);
        }
        console.log('Sample devices inserted for testing\n');

    } catch (error) {
        console.error('Error initializing database:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run initialization
initializeDatabase();
