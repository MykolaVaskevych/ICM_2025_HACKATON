'use server';

import { NextResponse } from 'next/server';
import { initializeDatabase } from '../initialize-db';

/**
 * GET handler for database initialization
 * Initializes the database tables if they don't exist
 */
export async function GET() {
  try {
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}