import { NextResponse } from 'next/server';
import { pool } from '../../../../db';
import { initializeDatabase } from '../../../initialize-db';

/**
 * GET /api/admin/tables/[table]/data
 * Returns paginated data for a specific table
 */
export async function GET(request, { params }) {
  // Next.js Router: We need to await params to make sure they're fully resolved
  const resolvedParams = await Promise.resolve(params);
  const table = resolvedParams.table;
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  
  // Calculate offset
  const offset = (page - 1) * pageSize;
  
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Validate table name (simple validation to prevent SQL injection)
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return NextResponse.json(
          { error: 'Invalid table name' },
          { status: 400 }
        );
      }
      
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
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      // Get total row count
      const countResult = await client.query(`
        SELECT COUNT(*) FROM "${table}"
      `);
      
      // Get paginated data
      const dataResult = await client.query(`
        SELECT * FROM "${table}"
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
      `, [pageSize, offset]);
      
      // Format column information
      const columns = columnResult.rows.map(col => ({
        id: col.column_name,
        name: col.column_name,
        type: mapPostgreSQLTypeToClientType(col.data_type),
        nullable: col.is_nullable === 'YES',
        editable: col.column_name !== 'id'
      }));
      
      // Return formatted response
      return NextResponse.json({
        columns,
        rows: dataResult.rows,
        totalRows: parseInt(countResult.rows[0].count),
        page,
        pageSize
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error(`Error getting data for table ${table}:`, error);
    return NextResponse.json(
      { error: `Failed to get data for table ${table}`, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Maps PostgreSQL data types to client-side types
 */
function mapPostgreSQLTypeToClientType(pgType) {
  switch (pgType.toLowerCase()) {
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'decimal':
    case 'numeric':
    case 'real':
    case 'double precision':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'date':
      return 'datetime';
    case 'json':
    case 'jsonb':
      return 'json';
    default:
      return 'string';
  }
}