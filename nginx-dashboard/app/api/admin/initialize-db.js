'use server';

import { pool } from '../db';

/**
 * Initialize the database tables if they don't exist
 * This should be called before using the database
 */
export async function initializeDatabase() {
  let client;
  
  try {
    console.log('Initializing database...');
    
    // Acquire a client from the pool
    client = await pool.connect();
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create logs table
    console.log('Creating logs table if it doesn\'t exist...');
    await client.query(`
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
      )
    `);
    
    // Create hourly_stats table
    console.log('Creating hourly_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        id SERIAL PRIMARY KEY,
        hour INTEGER,
        day DATE,
        count INTEGER,
        bytes_total BIGINT,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create path_stats table
    console.log('Creating path_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS path_stats (
        id SERIAL PRIMARY KEY,
        path TEXT,
        count INTEGER,
        avg_time DOUBLE PRECISION,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create status_stats table
    console.log('Creating status_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_stats (
        id SERIAL PRIMARY KEY,
        status INTEGER,
        count INTEGER,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes if they don\'t exist...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_is_bot ON logs(is_bot)');
    
    // Check if there's already some data in the tables
    const logsCount = await client.query('SELECT COUNT(*) FROM logs');
    
    // Insert sample data if the tables are empty
    if (parseInt(logsCount.rows[0].count) === 0) {
      console.log('No data found, inserting sample data...');
      
      // Insert sample log entry
      await client.query(`
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
        )
      `);
      
      // Insert sample status stats
      await client.query(`
        INSERT INTO status_stats (status, count)
        VALUES 
          (200, 1),
          (404, 0),
          (500, 0)
      `);
      
      // Insert sample hourly stats
      await client.query(`
        INSERT INTO hourly_stats (hour, day, count, bytes_total)
        VALUES (
          EXTRACT(HOUR FROM NOW())::integer,
          DATE_TRUNC('day', NOW())::date,
          1,
          1024
        )
      `);
      
      // Insert sample path stats
      await client.query(`
        INSERT INTO path_stats (path, count, avg_time)
        VALUES (
          '/index.html',
          1,
          0.0
        )
      `);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully');
    return { success: true };
  } catch (error) {
    // Rollback in case of error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}