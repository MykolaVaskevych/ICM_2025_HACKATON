'use server';

import { NextResponse } from 'next/server';
import { pool } from '../../db';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { mkdir } from 'fs/promises';

/**
 * POST handler for importing compressed logs
 * Processes a gzipped log file and imports it into the database
 */
export async function POST(request) {
  // Create temp directory if it doesn't exist
  const tempDir = join(process.cwd(), 'tmp');
  await mkdir(tempDir, { recursive: true });
  
  // Generate a unique temporary file name
  const tempFilePath = join(tempDir, `${uuidv4()}.gz`);
  
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        error: 'Compressed file upload requires multipart/form-data' 
      }, { status: 400 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ 
        error: 'No file uploaded' 
      }, { status: 400 });
    }
    
    // Save the file temporarily
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);
    
    // Process the file line by line
    const fileStream = createReadStream(tempFilePath);
    const gunzip = createGunzip();
    const rl = createInterface({
      input: fileStream.pipe(gunzip),
      crlfDelay: Infinity
    });
    
    // Parse and store log entries
    const parsedLogs = [];
    let count = 0;
    
    // Regular expression for NGINX combined log format
    const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;
    
    for await (const line of rl) {
      if (line.trim()) {
        const match = line.match(regex);
        
        if (match) {
          const [_, ip, timeStr, method, path, protocol, status, bytes, referrer, userAgent] = match;
          
          // Parse the timestamp
          const timestamp = parseLogDate(timeStr);
          
          // Check if this is a bot
          const isBot = detectBot(userAgent);
          
          parsedLogs.push({
            ip,
            timestamp,
            method,
            path,
            protocol,
            status: parseInt(status),
            bytes: parseInt(bytes),
            referrer: referrer === '-' ? null : referrer,
            user_agent: userAgent,
            is_bot: isBot
          });
          
          count++;
          
          // Process in batches to avoid memory issues
          if (parsedLogs.length >= 1000) {
            await insertLogBatch(parsedLogs);
            parsedLogs.length = 0;
          }
        }
      }
    }
    
    // Insert any remaining logs
    if (parsedLogs.length > 0) {
      await insertLogBatch(parsedLogs);
    }
    
    // Clean up the temporary file
    await unlink(tempFilePath);
    
    return NextResponse.json({ 
      message: 'Compressed log file processed successfully',
      count
    });
  } catch (error) {
    console.error('Error processing compressed log file:', error);
    
    // Clean up the temporary file if it exists
    try {
      await unlink(tempFilePath);
    } catch (err) {
      // Ignore errors during cleanup
    }
    
    return NextResponse.json({ 
      error: 'Failed to process compressed log file',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Parse NGINX log date format to a JavaScript Date
 */
function parseLogDate(dateStr) {
  // Format: "10/Oct/2023:13:55:36 +0000"
  const [datePart, timePart] = dateStr.split(' ');
  
  // Split into components
  const [day, month, yearTime] = datePart.split('/');
  const [year, time] = yearTime.split(':');
  
  // Map month names to numbers
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  // Create Date object
  const date = new Date(`${year}-${months[month] + 1}-${day}T${time}${timePart}`);
  return date;
}

/**
 * Detect if a user agent belongs to a bot
 */
function detectBot(userAgent) {
  if (!userAgent) return false;
  
  // Common bot patterns
  const botPatterns = [
    /bot/i, /spider/i, /crawl/i, /scrape/i, /fetch/i,
    /slurp/i, /lighthouse/i, /headless/i, /archive/i,
    /googlebot/i, /bingbot/i, /yandex/i, /baidu/i,
    /monitoring/i, /checker/i, /scanner/i, /http-client/i,
    /phantomjs/i, /curl/i, /wget/i, /axios/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
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
    const values = logs.map((log, i) => `(
      $${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, 
      $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9}
    )`).join(',');
    
    // Flatten all parameters
    const params = logs.flatMap(log => [
      log.timestamp,
      log.ip,
      log.method,
      log.path,
      log.protocol,
      log.status,
      log.bytes,
      log.referrer,
      log.is_bot
    ]);
    
    // Insert logs
    await client.query(`
      INSERT INTO logs (
        timestamp, ip, method, path, protocol, status, bytes, referrer, is_bot
      ) VALUES ${values}
    `, params);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error during batch insert:', err);
    throw err;
  } finally {
    client.release();
  }
}