import { NextResponse } from 'next/server';
import { pool } from '../../db';
import { initializeDatabase } from '../../admin/initialize-db';

/**
 * GET /api/import/database
 * Retrieves log data from the database for dashboard display
 */
export async function GET(request) {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Get request parameters
    const searchParams = new URL(request.url).searchParams;
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Get the most recent logs
      const result = await client.query(`
        SELECT 
          id,
          ip,
          timestamp,
          method,
          path,
          protocol,
          status,
          bytes,
          referrer,
          user_agent,
          is_bot
        FROM logs
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      // Transform database timestamp and boolean values
      const formattedLogs = result.rows.map(log => ({
        id: log.id,
        ip: log.ip,
        timestamp: log.timestamp.toISOString(),
        method: log.method,
        path: log.path,
        protocol: log.protocol,
        status: log.status.toString(),
        bytes: log.bytes,
        referrer: log.referrer,
        user_agent: log.user_agent,
        is_bot: log.is_bot
      }));
      
      // Get count of total logs
      const countResult = await client.query('SELECT COUNT(*) FROM logs');
      const totalCount = parseInt(countResult.rows[0].count);
      
      return NextResponse.json({
        success: true,
        message: `Retrieved ${formattedLogs.length} logs from database (out of ${totalCount} total)`,
        count: formattedLogs.length,
        totalCount: totalCount,
        data: formattedLogs
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error importing from database:', error);
    return NextResponse.json(
      { error: 'Failed to import from database', message: error.message },
      { status: 500 }
    );
  }
}