'use server';

import { NextResponse } from 'next/server';
import { pool } from '../../db';

/**
 * GET handler for database schema
 * Returns the schema information for all tables in the database
 */
export async function GET() {
  try {
    // Query to get all table names
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Build schema object for each table
    const schema = {};
    
    for (const table of tables) {
      // Query to get column information for the table
      const columnsQuery = `
        SELECT 
          column_name as name,
          data_type as type,
          CASE 
            WHEN is_nullable = 'NO' THEN 'NOT NULL'
            ELSE ''
          END as constraint,
          column_default as default_value
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await pool.query(columnsQuery, [table]);
      schema[table] = columnsResult.rows.map(col => ({
        name: col.name,
        type: col.type.toUpperCase(),
        constraint: col.constraint,
        default: col.default_value
      }));
    }
    
    return NextResponse.json(schema);
  } catch (error) {
    console.error('Error fetching database schema:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch database schema',
      details: error.message 
    }, { status: 500 });
  }
}