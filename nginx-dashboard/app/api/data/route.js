import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const files = fs.readdirSync(dataDir);
    
    return NextResponse.json({ 
      files,
      status: 'success'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
}