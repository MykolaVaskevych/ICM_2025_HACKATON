'use server';

import { NextResponse } from 'next/server';
import { pool } from '../../db';

/**
 * GET handler for database status
 * Returns real PostgreSQL database status information
 */
export async function GET() {
  try {
    // Get database uptime
    const uptimeRes = await pool.query(`
      SELECT 
        current_timestamp - pg_postmaster_start_time() as uptime
      FROM pg_postmaster_start_time();
    `);
    
    // Calculate uptime in a human-readable format
    const uptimeInterval = uptimeRes.rows[0]?.uptime || '0';
    
    // Get database size
    const sizeRes = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    const size = sizeRes.rows[0]?.size || '0 MB';
    
    // Get active connections
    const connectionsRes = await pool.query(`
      SELECT count(*) as connections FROM pg_stat_activity WHERE state = 'active';
    `);
    const connections = parseInt(connectionsRes.rows[0]?.connections || '0');
    
    // Get PostgreSQL version
    const versionRes = await pool.query(`SELECT version();`);
    const versionFull = versionRes.rows[0]?.version || 'Unknown';
    // Extract just the PostgreSQL version from the full version string
    const versionMatch = versionFull.match(/PostgreSQL (\d+\.\d+)/);
    const version = versionMatch ? `PostgreSQL ${versionMatch[1]}` : 'PostgreSQL';
    
    return NextResponse.json({
      connected: true,
      uptime: uptimeInterval,
      size,
      connections,
      version
    });
  } catch (error) {
    console.error('Error fetching database status:', error);
    return NextResponse.json({
      connected: false,
      uptime: null,
      size: null,
      connections: null,
      version: null,
      error: error.message
    }, { status: 500 });
  }
}