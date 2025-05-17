#!/bin/bash

# NGINX Dashboard PostgreSQL Setup Script
# This script sets up the PostgreSQL database for NGINX Dashboard

# Database name
DB_NAME="nginx_logs"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN} NGINX Dashboard Database Setup ${NC}"
echo -e "${GREEN}=================================${NC}"
echo

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed or not in your PATH.${NC}"
    echo -e "Please install PostgreSQL and try again."
    exit 1
fi

echo -e "${YELLOW}Using database name: ${DB_NAME}${NC}"

# Create database
echo "Creating database '$DB_NAME' if it doesn't exist..."
psql -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || createdb "$DB_NAME"

# Check if database creation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create database. Make sure PostgreSQL is running and you have proper permissions.${NC}"
    echo -e "Try running: createdb $DB_NAME"
    exit 1
fi

# Create schema
echo "Creating database schema..."
psql -d "$DB_NAME" << EOF
-- Create logs table
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

-- Create hourly_stats table
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

-- Create path_stats table
CREATE TABLE IF NOT EXISTS path_stats (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  last_accessed TIMESTAMP NOT NULL,
  UNIQUE(path)
);

-- Create status_stats table
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

-- Insert sample data if logs table is empty
DO \$\$
BEGIN
  IF (SELECT COUNT(*) FROM logs) = 0 THEN
    INSERT INTO logs (timestamp, ip, method, path, protocol, status, bytes, referrer, user_agent, is_bot)
    VALUES (
      NOW(),
      '127.0.0.1',
      'GET',
      '/index.html',
      'HTTP/1.1',
      200,
      1024,
      'https://example.com',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      FALSE
    );
    
    INSERT INTO status_stats (status, count)
    VALUES 
      (200, 1),
      (404, 0),
      (500, 0)
    ON CONFLICT (status) DO NOTHING;
    
    INSERT INTO hourly_stats (hour, total_requests, unique_visitors, bot_requests, error_count, total_bytes)
    VALUES (
      DATE_TRUNC('hour', NOW()),
      1,
      1,
      0,
      0,
      1024
    )
    ON CONFLICT (hour) DO NOTHING;
    
    INSERT INTO path_stats (path, count, error_count, last_accessed)
    VALUES (
      '/index.html',
      1,
      0,
      NOW()
    )
    ON CONFLICT (path) DO NOTHING;
  END IF;
END \$\$;
EOF

# Check if schema creation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create database schema.${NC}"
    exit 1
fi

echo
echo -e "${GREEN}Database setup completed successfully!${NC}"
echo -e "Database name: ${YELLOW}${DB_NAME}${NC}"
echo -e "Tables created: ${YELLOW}logs, hourly_stats, path_stats, status_stats${NC}"
echo
echo -e "You can now run the application with: ${YELLOW}npm run dev${NC}"
echo