import { NextResponse } from 'next/server';
import { pool } from '../db';
import { initializeDatabase } from '../admin/initialize-db';

/**
 * API endpoint for checking database status
 * GET /api/status
 * 
 * Returns information about database connection and tables
 */
export async function GET() {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Get PostgreSQL version
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0].version;
      
      // Get table statistics
      const tableStats = await client.query(`
        SELECT 
          relname as table_name,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(relid)) as size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);
      
      // Get total number of logs
      const logCount = await client.query('SELECT COUNT(*) FROM logs');
      const totalLogs = parseInt(logCount.rows[0].count || '0');
      
      // Get first and last log timestamp
      const timeRange = await client.query(`
        SELECT 
          MIN(timestamp) as first_log,
          MAX(timestamp) as last_log
        FROM logs
      `);
      
      const firstLog = timeRange.rows[0]?.first_log || null;
      const lastLog = timeRange.rows[0]?.last_log || null;
      
      // Get database size
      const dbSize = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      return NextResponse.json({
        status: 'connected',
        version: version,
        totalLogs: totalLogs,
        timeRange: {
          firstLog: firstLog,
          lastLog: lastLog
        },
        dbSize: dbSize.rows[0].size,
        tables: tableStats.rows
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Database Status Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message
    }, { status: 500 });
  }
}