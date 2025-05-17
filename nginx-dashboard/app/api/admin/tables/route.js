import { NextResponse } from 'next/server';
import { pool } from '../../db';
import { initializeDatabase } from '../initialize-db';

/**
 * GET /api/admin/tables
 * Returns a list of tables in the database
 */
export async function GET() {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Query to get all tables and their row counts
      const result = await client.query(`
        SELECT 
          t.tablename as name,
          t.tablename as id,
          s.n_live_tup as row_count
        FROM pg_catalog.pg_tables t
        JOIN pg_catalog.pg_stat_user_tables s ON t.tablename = s.relname
        WHERE t.schemaname = 'public'
        ORDER BY s.n_live_tup DESC
      `);
      
      return NextResponse.json(result.rows);
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error getting database tables:', error);
    return NextResponse.json(
      { error: 'Failed to get database tables', message: error.message },
      { status: 500 }
    );
  }
}