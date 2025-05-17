'use server';

import { NextResponse } from 'next/server';
import { pool } from '../../db';

/**
 * POST handler for exporting logs to database
 * Inserts logs directly into the database
 */
export async function POST(request) {
  try {
    // Parse the request body
    const logs = await request.json();
    
    if (!Array.isArray(logs)) {
      return NextResponse.json({ 
        error: 'Invalid request body, expected array of logs' 
      }, { status: 400 });
    }
    
    let insertedCount = 0;
    
    // Process logs in batches for better performance
    for (let i = 0; i < logs.length; i += 1000) {
      const batch = logs.slice(i, i + 1000);
      await insertLogBatch(batch);
      insertedCount += batch.length;
    }
    
    // Update statistics after inserting logs
    await updateStatistics();
    
    return NextResponse.json({ 
      message: 'Logs exported to database successfully',
      count: insertedCount
    });
  } catch (error) {
    console.error('Error exporting logs to database:', error);
    return NextResponse.json({ 
      error: 'Failed to export logs to database',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Insert a batch of log entries into the database
 */
async function insertLogBatch(logs) {
  if (!logs || logs.length === 0) return;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Prepare values for bulk insert
    const values = logs.map((log, i) => {
      const valueParams = [];
      let valueString = '';
      
      // Add timestamp if it exists
      if (log.timestamp) {
        valueParams.push(new Date(log.timestamp));
        valueString += `$${valueParams.length}`;
      } else {
        valueString += 'NOW()';
      }
      
      // Add required fields
      valueParams.push(
        log.ip || '0.0.0.0',
        log.method || 'GET',
        log.path || '/',
        log.protocol || 'HTTP/1.1',
        log.status || 200,
        log.bytes || 0
      );
      
      valueString += `, $${valueParams.length - 5}, $${valueParams.length - 4}, $${valueParams.length - 3}, `;
      valueString += `$${valueParams.length - 2}, $${valueParams.length - 1}, $${valueParams.length}`;
      
      // Add optional fields
      valueParams.push(
        log.referrer || null,
        log.user_agent || null,
        log.is_bot === true
      );
      
      valueString += `, $${valueParams.length - 2}, $${valueParams.length - 1}, $${valueParams.length}`;
      
      return {
        valueString: `(${valueString})`,
        params: valueParams
      };
    });
    
    // Build the complete query
    const query = `
      INSERT INTO logs (
        timestamp, ip, method, path, protocol, status, bytes, referrer, user_agent, is_bot
      ) VALUES ${values.map(v => v.valueString).join(',')}
    `;
    
    // Flatten all parameters
    const allParams = values.flatMap(v => v.params);
    
    // Execute the insert
    await client.query(query, allParams);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error during batch insert:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update statistics tables based on raw logs
 */
async function updateStatistics() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update hourly statistics
    await client.query(`
      INSERT INTO hourly_stats (hour, total_requests, unique_visitors, bot_requests, error_count, total_bytes)
      SELECT 
        date_trunc('hour', timestamp) as hour,
        COUNT(*) as total_requests,
        COUNT(DISTINCT ip) as unique_visitors,
        SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_requests,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(bytes) as total_bytes
      FROM logs
      GROUP BY hour
      ON CONFLICT (hour) DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        unique_visitors = EXCLUDED.unique_visitors,
        bot_requests = EXCLUDED.bot_requests,
        error_count = EXCLUDED.error_count,
        total_bytes = EXCLUDED.total_bytes
    `);
    
    // Update path statistics
    await client.query(`
      INSERT INTO path_stats (path, count, error_count, last_accessed)
      SELECT 
        path,
        COUNT(*) as count,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        MAX(timestamp) as last_accessed
      FROM logs
      GROUP BY path
      ON CONFLICT (path) DO UPDATE SET
        count = EXCLUDED.count,
        error_count = EXCLUDED.error_count,
        last_accessed = EXCLUDED.last_accessed
    `);
    
    // Update status statistics
    await client.query(`
      INSERT INTO status_stats (status, count)
      SELECT 
        status,
        COUNT(*) as count
      FROM logs
      GROUP BY status
      ON CONFLICT (status) DO UPDATE SET
        count = EXCLUDED.count
    `);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating statistics:', err);
    throw err;
  } finally {
    client.release();
  }
}