import { NextResponse } from 'next/server';
import { pool } from '../../db';
import { initializeDatabase } from '../../admin/initialize-db';
// Import log parser utility
import { parseNginxLog, parseCommonLogFormat, parseLogLine } from '../../../utils/log-parser';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import zlib from 'zlib';
import fs from 'fs';
import { createReadStream } from 'fs';
import readline from 'readline';
import util from 'util';

const pipeline = util.promisify(require('stream').pipeline);

// Configure batch size for DB operations
const BATCH_SIZE = 500;

/**
 * POST /api/import/file
 * Handles the import of log files (both plain text and compressed)
 */
export async function POST(request) {
  try {
    // Initialize database if needed
    await initializeDatabase();
    
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Create temp directory for file storage if it doesn't exist
    const tmpDir = join(os.tmpdir(), 'nginx-dashboard');
    await mkdir(tmpDir, { recursive: true });
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${randomUUID()}.${fileExt}`;
    const filePath = join(tmpDir, fileName);
    
    // Convert the file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write the file to disk
    await writeFile(filePath, buffer);
    
    console.log(`File saved to ${filePath}. Processing...`);
    
    // Process the log file based on type
    let logEntries = [];
    
    try {
      if (fileExt === 'gz') {
        logEntries = await processCompressedLogFile(filePath);
      } else if (fileExt === 'log' || fileExt === 'txt') {
        logEntries = await processTextLogFile(filePath);
      } else if (fileExt === 'json') {
        // Read the JSON file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        logEntries = JSON.parse(fileContent);
        
        // Verify format
        if (!Array.isArray(logEntries)) {
          throw new Error('Invalid JSON format. Expected an array of log entries.');
        }
      } else {
        throw new Error(`Unsupported file format: ${fileExt}`);
      }
      
      // Insert logs into database
      if (logEntries.length > 0) {
        await insertLogsToDatabase(logEntries);
      }
      
      // Clean up the temp file
      await unlink(filePath);
      
      return NextResponse.json({
        success: true,
        message: `Successfully processed ${logEntries.length} log entries`,
        count: logEntries.length
      });
    } catch (error) {
      // Clean up the temp file if it exists
      try {
        await unlink(filePath);
      } catch (e) {
        // Ignore errors during cleanup
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error processing log file:', error);
    return NextResponse.json({
      error: 'Failed to process log file',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Processes a compressed log file (.gz) and returns parsed log entries
 */
async function processCompressedLogFile(filePath) {
  console.log(`Processing compressed log file: ${filePath}`);
  
  // Create temporary uncompressed file
  const uncompressedPath = filePath + '.uncompressed';
  
  try {
    // Uncompress the file
    await pipeline(
      createReadStream(filePath),
      zlib.createGunzip(),
      fs.createWriteStream(uncompressedPath)
    );
    
    // Process the uncompressed file
    const logEntries = await processTextLogFile(uncompressedPath);
    
    return logEntries;
  } finally {
    // Clean up the uncompressed file
    try {
      await unlink(uncompressedPath);
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Processes a text log file and returns parsed log entries
 */
async function processTextLogFile(filePath) {
  console.log(`Processing text log file: ${filePath}`);
  
  const stream = createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });
  
  const logEntries = [];
  
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    
    // Parse NGINX log line
    const parsedLine = parseNginxLog(line);
    if (parsedLine) {
      logEntries.push(parsedLine);
    } else {
      console.warn(`Invalid log format: ${line}`);
    }
  }
  
  console.log(`Processed ${logEntries.length} lines from text file`);
  return logEntries;
}

/**
 * Inserts log entries into the database in batches
 */
async function insertLogsToDatabase(logEntries) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Process in batches
    for (let i = 0; i < logEntries.length; i += BATCH_SIZE) {
      const batch = logEntries.slice(i, i + BATCH_SIZE);
      
      // Prepare a batch insert
      const valueStrings = [];
      const valueParams = [];
      let paramIndex = 1;
      
      for (const log of batch) {
        const paramPlaceholders = [];
        for (let j = 0; j < 10; j++) {
          paramPlaceholders.push(`$${paramIndex++}`);
        }
        
        valueStrings.push(`(${paramPlaceholders.join(', ')})`);
        
        valueParams.push(
          log.ip,
          log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
          log.method,
          log.path,
          log.protocol,
          parseInt(log.status),
          parseInt(log.bytes),
          log.referrer || null,
          log.user_agent || null,
          log.is_bot === true || log.is_bot === 'true' || false
        );
      }
      
      // Execute batch insert
      const query = `
        INSERT INTO logs(ip, timestamp, method, path, protocol, status, bytes, referrer, user_agent, is_bot)
        VALUES ${valueStrings.join(', ')}
      `;
      
      await client.query(query, valueParams);
      console.log(`Inserted batch of ${batch.length} logs`);
    }
    
    // Update statistics
    await updateStatistics(client);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Successfully inserted ${logEntries.length} logs and updated statistics`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting logs to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates aggregated statistics tables
 */
async function updateStatistics(client) {
  console.log('Updating statistics tables...');
  
  // Update status statistics
  await client.query(`
    TRUNCATE TABLE status_stats;
    INSERT INTO status_stats(status, count)
    SELECT status, COUNT(*) FROM logs
    GROUP BY status
    ORDER BY count DESC;
  `);
  
  // Update hourly statistics
  await client.query(`
    TRUNCATE TABLE hourly_stats;
    INSERT INTO hourly_stats(hour, day, count, bytes_total)
    SELECT 
      EXTRACT(HOUR FROM timestamp)::integer AS hour,
      DATE_TRUNC('day', timestamp)::date AS day,
      COUNT(*) AS count,
      SUM(bytes) AS bytes_total
    FROM logs
    GROUP BY hour, day
    ORDER BY day, hour;
  `);
  
  // Update path statistics
  await client.query(`
    TRUNCATE TABLE path_stats;
    INSERT INTO path_stats(path, count, avg_time)
    SELECT 
      path,
      COUNT(*) AS count,
      0.0 AS avg_time
    FROM logs
    GROUP BY path
    ORDER BY count DESC
    LIMIT 100;
  `);
  
  console.log('Statistics updated successfully');
}