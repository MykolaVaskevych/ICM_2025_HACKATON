import { NextResponse } from 'next/server';
import { pool } from '../db';
import { initializeDatabase } from '../admin/initialize-db';

/**
 * POST /api/query
 * Executes a SQL query against the database.
 * 
 * For safety, this implementation restricts queries to SELECT statements only.
 * In a production environment, additional measures would be taken to secure
 * this endpoint or remove it entirely.
 */
export async function POST(request) {
  try {
    // Get the query from the request body
    const { query } = await request.json();
    
    // Safety check: Only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed for security reasons' },
        { status: 403 }
      );
    }
    
    // Initialize database if needed
    await initializeDatabase();
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the query
      const result = await client.query(query);
      
      // Calculate execution time
      const executionTime = Math.round(performance.now() - startTime);
      
      // Get column names from the field definitions
      const columns = result.fields.map(field => field.name);
      
      // Return the results
      return NextResponse.json({
        columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        message: `Query executed successfully. ${result.rowCount} rows returned.`
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { error: 'Failed to execute query', message: error.message },
      { status: 500 }
    );
  }
}