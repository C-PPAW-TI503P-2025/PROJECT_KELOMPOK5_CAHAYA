-- Smart Street Light System Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS smart_street_light;
USE smart_street_light;

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices table for street lamp management
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
);

-- Sensor data table for LDR readings
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    light_intensity INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device_timestamp (device_id, timestamp)
);

-- Control logs table for action history
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
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
('auto_mode_enabled', 'true'),
('light_threshold', '300'),
('polling_interval', '5000')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2a$10$8K1p/a0dL3LKzao0gMlYi.WY9hKKdONKKKKKKKKKKKKKKKKKKKKKKK', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- Note: The password hash above is a placeholder. 
-- It will be properly generated when running the init-db.js script
