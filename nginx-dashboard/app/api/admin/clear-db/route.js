import { NextResponse } from 'next/server';
import { pool } from '../../db';

/**
 * API endpoint for clearing the database
 * DELETE /api/admin/clear-db
 * 
 * Clears all data from all log-related tables
 */
export async function DELETE() {
  let client;
  
  try {
    console.log('Clearing database tables...');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Truncate all tables in the correct order (respecting foreign keys if any)
    await client.query('TRUNCATE TABLE logs CASCADE');
    await client.query('TRUNCATE TABLE hourly_stats CASCADE');
    await client.query('TRUNCATE TABLE path_stats CASCADE');
    await client.query('TRUNCATE TABLE status_stats CASCADE');
    
    // Reset sequences
    await client.query('ALTER SEQUENCE logs_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE hourly_stats_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE path_stats_id_seq RESTART WITH 1'); 
    await client.query('ALTER SEQUENCE status_stats_id_seq RESTART WITH 1');
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database cleared successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database cleared successfully' 
    });
  } catch (error) {
    // Rollback in case of error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error clearing database:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to clear database',
      error: error.message
    }, { status: 500 });
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}