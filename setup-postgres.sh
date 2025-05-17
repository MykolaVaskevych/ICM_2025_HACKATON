#!/bin/bash
# PostgreSQL Database Setup Script
# This script creates the PostgreSQL database and schema for the NGINX dashboard

# Configuration
DB_NAME="nginx_logs"
DB_USER="stnikolas" # Use current OS user

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
pg_isready -q
if [ $? -ne 0 ]; then
    echo "Error: PostgreSQL is not running. Please start PostgreSQL first."
    echo "  macOS: brew services start postgresql"
    echo "  Linux: sudo systemctl start postgresql"
    exit 1
fi

# Create database
echo "Creating database '$DB_NAME' if it doesn't exist..."
psql -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || createdb "$DB_NAME"

# Create schema
echo "Creating database schema..."
psql -d "$DB_NAME" << EOF
-- Main logs table
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    ip VARCHAR(45) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    protocol VARCHAR(10) NOT NULL,
    status INTEGER NOT NULL,
    bytes INTEGER NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    is_bot BOOLEAN DEFAULT FALSE
);

-- Hourly statistics table
CREATE TABLE IF NOT EXISTS hourly_stats (
    id SERIAL PRIMARY KEY,
    hour TIMESTAMP NOT NULL,
    total_requests INTEGER NOT NULL,
    unique_visitors INTEGER NOT NULL,
    bot_requests INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    total_bytes BIGINT NOT NULL,
    UNIQUE(hour)
);

-- Path statistics table
CREATE TABLE IF NOT EXISTS path_stats (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    count INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    last_accessed TIMESTAMP NOT NULL,
    UNIQUE(path)
);

-- Status code statistics table
CREATE TABLE IF NOT EXISTS status_stats (
    id SERIAL PRIMARY KEY,
    status INTEGER NOT NULL,
    count INTEGER NOT NULL,
    UNIQUE(status)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip);
CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path);
CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_is_bot ON logs(is_bot);

EOF

echo "Database setup complete!"
echo "To start using the database, run the log processor:"
echo "  node log_processor.js"
echo ""
echo "To access the dashboard:"
echo "  cd nginx-dashboard && npm run dev"