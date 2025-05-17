/**
 * PostgreSQL Database Setup Script
 * This script sets up the database schema for the NGINX log dashboard.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration - no password for internal tool
const config = {
  user: 'postgres',      // Using postgres user for simplicity
  host: 'localhost',     // PostgreSQL host
  database: 'nginx_logs', // Database name
  port: 5432,            // Default PostgreSQL port
  // Adding connection options for better stability
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
};

// Create a connection pool
const pool = new Pool(config);

/**
 * Execute the database setup
 */
async function setupDatabase() {
  console.log('Starting database setup...');
  
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Create logs table for raw log entries
      console.log('Creating logs table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS logs (
          id SERIAL PRIMARY KEY,
          ip VARCHAR(45) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          method VARCHAR(10) NOT NULL,
          path TEXT NOT NULL,
          protocol VARCHAR(10) NOT NULL,
          status INTEGER NOT NULL,
          bytes INTEGER NOT NULL,
          referrer TEXT,
          user_agent TEXT,
          is_bot BOOLEAN DEFAULT FALSE,
          processing_time FLOAT
        )
      `);
      
      // Create status_stats table for status code statistics
      console.log('Creating status_stats table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS status_stats (
          id SERIAL PRIMARY KEY,
          status_code INTEGER NOT NULL,
          count INTEGER NOT NULL,
          last_updated TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create hourly_stats table for hourly traffic statistics
      console.log('Creating hourly_stats table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS hourly_stats (
          id SERIAL PRIMARY KEY,
          hour TIMESTAMP NOT NULL,
          requests INTEGER NOT NULL,
          bot_requests INTEGER DEFAULT 0,
          errors INTEGER DEFAULT 0,
          bytes_transferred BIGINT DEFAULT 0
        )
      `);
      
      // Create path_stats table for path usage statistics
      console.log('Creating path_stats table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS path_stats (
          id SERIAL PRIMARY KEY,
          path TEXT NOT NULL,
          count INTEGER NOT NULL,
          last_accessed TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create indexes for better performance
      console.log('Creating indexes...');
      await client.query('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_logs_is_bot ON logs(is_bot)');
      
      // Create user_agents table to track user agents and bot status
      console.log('Creating user_agents table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_agents (
          id SERIAL PRIMARY KEY,
          user_agent TEXT UNIQUE NOT NULL,
          is_bot BOOLEAN DEFAULT FALSE,
          count INTEGER DEFAULT 1,
          first_seen TIMESTAMP DEFAULT NOW(),
          last_seen TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Database schema created successfully');
      
      // Insert some sample status codes for demonstration
      const statusCodes = [
        { code: 200, count: 12453 },
        { code: 301, count: 523 },
        { code: 404, count: 1243 },
        { code: 500, count: 187 }
      ];
      
      console.log('Inserting sample status codes...');
      for (const status of statusCodes) {
        await client.query(
          'INSERT INTO status_stats (status_code, count) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [status.code, status.count]
        );
      }
      
      console.log('Database setup completed successfully');
    } catch (err) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      console.error('Error setting up database:', err);
      throw err;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });