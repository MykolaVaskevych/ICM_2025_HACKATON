import { NextResponse } from 'next/server';
import { pool } from '../../../../../db';
import { initializeDatabase } from '../../../../initialize-db';

/**
 * PUT /api/admin/tables/[table]/rows/[id]
 * Updates a row in the database
 */
export async function PUT(request, { params }) {
  // Next.js Router: We need to await params to make sure they're fully resolved
  const resolvedParams = await Promise.resolve(params);
  const table = resolvedParams.table;
  const id = resolvedParams.id;
  
  try {
    // Get the updates from the request body
    const updates = await request.json();
    
    // Validate table name (simple validation to prevent SQL injection)
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }
    
    // Validate ID (should be a number)
    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    // Initialize database if needed
    await initializeDatabase();
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Check if table exists
      const tableExistsResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!tableExistsResult.rows[0].exists) {
        return NextResponse.json(
          { error: 'Table not found' },
          { status: 404 }
        );
      }
      
      // Get column information
      const columnResult = await client.query(`
        SELECT 
          column_name, 
          data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name != 'id'
      `, [table]);
      
      // Build the update query
      const columns = columnResult.rows.map(col => col.column_name);
      const updateColumns = Object.keys(updates).filter(key => key !== 'id' && columns.includes(key));
      
      if (updateColumns.length === 0) {
        return NextResponse.json(
          { error: 'No valid columns to update' },
          { status: 400 }
        );
      }
      
      // Build SET part of the query
      const setClause = updateColumns.map((col, index) => `"${col}" = $${index + 2}`).join(', ');
      const queryParams = [id, ...updateColumns.map(col => updates[col])];
      
      // Execute the update
      const updateQuery = `
        UPDATE "${table}"
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, queryParams);
      
      // Check if row was found
      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: `Row with ID ${id} not found in table ${table}` },
          { status: 404 }
        );
      }
      
      // Return the updated row
      return NextResponse.json({
        success: true,
        message: `Row with ID ${id} updated successfully`,
        updatedRow: result.rows[0]
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error(`Error updating row in table ${table}:`, error);
    return NextResponse.json(
      { error: `Failed to update row in table ${table}`, message: error.message },
      { status: 500 }
    );
  }
}