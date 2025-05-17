/**
 * PostgreSQL Connection Test Script
 * 
 * This script tests the connection to the PostgreSQL database and
 * provides detailed error messages if the connection fails.
 * 
 * Run this script with: node check-db-connection.js
 */

const { Pool } = require('pg');

// Get the current OS username
const currentUser = process.env.USER || process.env.USERNAME;

// Database configuration - using current OS user
const config = {
  host: 'localhost',
  port: 5432,
  database: 'nginx_logs',
  user: currentUser // Using the current OS user
};

console.log('Testing database connection with config:', config);

// Create a new pool
const pool = new Pool(config);

// Test the connection
async function testConnection() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    console.log('Connection successful! ✅');
    
    // Test query execution
    console.log('Testing query execution...');
    
    // Create a test table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_date TIMESTAMP DEFAULT NOW(),
        message TEXT
      )
    `);
    
    // Insert a record
    await client.query(`
      INSERT INTO connection_test (message) 
      VALUES ('Connection test at ${new Date().toISOString()}')
    `);
    
    // Query the test table
    const result = await client.query('SELECT COUNT(*) FROM connection_test');
    console.log('Query executed successfully! ✅');
    console.log(`Connection test table has ${result.rows[0].count} entries`);
    
    console.log('Connection test complete');
  } catch (err) {
    console.error('❌ Connection failed with error:', err);
    
    // Provide helpful troubleshooting tips based on error type
    if (err.code === 'ECONNREFUSED') {
      console.error('\nTroubleshooting tips:');
      console.error('• Make sure PostgreSQL is running');
      console.error('• Check if PostgreSQL is listening on port 5432');
      console.error('• Try running: pg_isready -h localhost');
    } else if (err.code === '28P01') {
      console.error('\nTroubleshooting tips:');
      console.error('• Authentication failed - password is incorrect');
      console.error('• Check your PostgreSQL user permissions');
    } else if (err.code === '3D000') {
      console.error('\nTroubleshooting tips:');
      console.error('• Database "nginx_logs" does not exist');
      console.error('• Create it with: createdb nginx_logs');
      console.error('• Or run the setup script: ./setup-postgres.sh');
    } else if (err.code === '42P01') {
      console.error('\nTroubleshooting tips:');
      console.error('• Table does not exist - schema issue');
      console.error('• Run the database initialization: npm run setup:db');
    } else {
      console.error('\nTroubleshooting tips:');
      console.error('• Check if PostgreSQL is installed and running');
      console.error('• Verify that the database "nginx_logs" exists');
      console.error('• Verify that your current user has access to PostgreSQL');
      console.error('• Try to connect with: psql -d nginx_logs');
    }
  } finally {
    if (client) {
      client.release();
    }
    pool.end();
  }
}

testConnection();