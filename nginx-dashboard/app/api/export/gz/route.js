'use server';

import { NextResponse } from 'next/server';
import { pool } from '../../db';
import { createGzip } from 'zlib';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import fs from 'fs';

/**
 * POST handler for exporting logs as gz
 * Exports logs to a compressed gzip file
 */
export async function POST(request) {
  // Create temp directory if it doesn't exist
  const tempDir = join(process.cwd(), 'tmp');
  await mkdir(tempDir, { recursive: true });
  
  // Generate a unique temporary file name
  const tempFilePath = join(tempDir, `${uuidv4()}.gz`);
  
  try {
    // If request has body, it's specific logs to export
    // Otherwise export all logs from database
    let logsToExport = [];
    
    if (request.headers.get('content-type')?.includes('application/json')) {
      // Export specific logs from the request
      const body = await request.json();
      
      if (Array.isArray(body)) {
        logsToExport = body;
      } else {
        return NextResponse.json({ 
          error: 'Invalid request body, expected array of logs' 
        }, { status: 400 });
      }
    } else {
      // Export all logs from the database
      const query = 'SELECT * FROM logs ORDER BY timestamp DESC';
      const result = await pool.query(query);
      logsToExport = result.rows;
    }
    
    // Create gzip compression stream
    const gzip = createGzip();
    
    // Create readable stream from logs
    const logsStream = Readable.from(
      logsToExport.map(log => {
        // Format each log entry in NGINX combined log format
        const timestamp = new Date(log.timestamp);
        const dateStr = formatLogDate(timestamp);
        const referrer = log.referrer || '-';
        
        return `${log.ip} - - [${dateStr}] "${log.method} ${log.path} ${log.protocol}" ${log.status} ${log.bytes} "${referrer}" "${log.user_agent}"\n`;
      })
    );
    
    // Create write stream to temporary file
    const writeStream = fs.createWriteStream(tempFilePath);
    
    // Pipe the streams
    await pipeline(logsStream, gzip, writeStream);
    
    // Read the compressed file
    const fileBuffer = await fs.promises.readFile(tempFilePath);
    
    // Clean up the temporary file
    await unlink(tempFilePath);
    
    // Return the compressed file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="nginx_logs_export.gz"'
      }
    });
  } catch (error) {
    console.error('Error exporting logs as gz:', error);
    
    // Clean up the temporary file if it exists
    try {
      await unlink(tempFilePath);
    } catch (err) {
      // Ignore errors during cleanup
    }
    
    return NextResponse.json({ 
      error: 'Failed to export logs as gz',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Format a JavaScript Date to NGINX log date format
 */
function formatLogDate(date) {
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[date.getUTCMonth()];
  
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year}:${hours}:${minutes}:${seconds} +0000`;
}