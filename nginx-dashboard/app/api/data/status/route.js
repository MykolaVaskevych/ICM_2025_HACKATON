import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    
    // Create a flag file to indicate if data has been initialized through upload
    // This ensures that we don't use any data that might exist in the public/data folder
    const initFlagPath = path.join(dataDir, '.initialized');
    let initialized = false;
    
    // Check if the initialization flag exists
    if (fs.existsSync(initFlagPath)) {
      initialized = true;
    }
    
    return NextResponse.json({ 
      initialized,
      status: 'success'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      initialized: false,
      status: 'error'
    }, { status: 500 });
  }
}