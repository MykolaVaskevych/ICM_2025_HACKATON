/**
 * Enhanced NGINX log processor with real-time database updates
 * This version handles both compressed and uncompressed log files
 * and has improved error handling and performance
 */
const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');
const path = require('path');
const cron = require('node-cron');
const zlib = require('zlib');

// Configuration
const config = {
  // Primary log file (uncompressed)
  logFile: path.resolve(__dirname, 'sample_access.log'),
  // Secondary log files (compressed) - these will be processed in order if they exist
  compressedLogFiles: [
    path.resolve(__dirname, 'access.log.gz'),
    path.resolve(__dirname, 'access_log.gz')
  ],
  // File to store the position in each log file
  positionDir: path.resolve(__dirname, '.positions'),
  // Process logs every 3 minutes
  updateInterval: '*/3 * * * *',
  // Process logs in batches for better performance
  batchSize: 1000,
  // PostgreSQL configuration - matches the dashboard's db.js
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'nginx_logs',
    user: 'stnikolas', // Using current OS user
    // Increase connection timeouts for better reliability
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  }
};

// Initialize PostgreSQL pool with better error handling
const pool = new Pool(config.postgres);

// Add error listener to handle connection issues
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Ensure position directory exists
if (!fs.existsSync(config.positionDir)) {
  fs.mkdirSync(config.positionDir, { recursive: true });
}

// Store file position
async function savePosition(logFilePath, position) {
  try {
    const positionFile = path.join(
      config.positionDir, 
      path.basename(logFilePath) + '.position'
    );
    await fs.promises.writeFile(positionFile, position.toString());
    console.log(`Position saved for ${path.basename(logFilePath)}: ${position}`);
  } catch (error) {
    console.error(`Error saving position for ${path.basename(logFilePath)}:`, error);
  }
}

// Get last position for a log file
async function getLastPosition(logFilePath) {
  try {
    const positionFile = path.join(
      config.positionDir, 
      path.basename(logFilePath) + '.position'
    );
    const position = await fs.promises.readFile(positionFile, 'utf8');
    return parseInt(position);
  } catch (error) {
    console.log(`No position file found for ${path.basename(logFilePath)}, starting from beginning`);
    return 0;
  }
}

// Initialize database tables
async function initializeDatabase() {
  let client;
  
  try {
    console.log('Initializing database...');
    
    // Acquire a client from the pool
    client = await pool.connect();
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create logs table
    console.log('Creating logs table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        ip VARCHAR(45) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path TEXT NOT NULL,
        protocol VARCHAR(10) NOT NULL,
        status INTEGER NOT NULL,
        bytes INTEGER NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        is_bot BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Create hourly_stats table
    console.log('Creating hourly_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        id SERIAL PRIMARY KEY,
        hour TIMESTAMP NOT NULL,
        total_requests INTEGER NOT NULL,
        unique_visitors INTEGER NOT NULL,
        bot_requests INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        total_bytes BIGINT NOT NULL,
        UNIQUE(hour)
      )
    `);
    
    // Create path_stats table
    console.log('Creating path_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS path_stats (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        last_accessed TIMESTAMP NOT NULL,
        UNIQUE(path)
      )
    `);
    
    // Create status_stats table
    console.log('Creating status_stats table if it doesn\'t exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_stats (
        id SERIAL PRIMARY KEY,
        status INTEGER NOT NULL,
        count INTEGER NOT NULL,
        UNIQUE(status)
      )
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes if they don\'t exist...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_logs_is_bot ON logs(is_bot)');
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully');
    return { success: true };
  } catch (error) {
    // Rollback in case of error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

// Parse NGINX log line (combined format)
function parseNginxLog(line) {
  // Match NGINX combined log format
  const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;
  const match = line.match(regex);
  
  if (!match) {
    return null;
  }
  
  const [_, ip, timeStr, method, path, protocol, status, bytes, referrer, userAgent] = match;
  
  // Convert timestamp (format: "10/Oct/2023:13:55:36 +0000")
  // Replace colons in the date part to make it parseable
  const parsedTimeStr = timeStr.replace(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+\-]\d+)/, '$1 $2 $3 $4:$5:$6 $7');
  const timestamp = new Date(parsedTimeStr);
  
  // Simple bot detection based on user agent
  const isBot = 
    /bot|crawl|spider|preview|scan|check|index|monitor/i.test(userAgent) || 
    /googlebot|bingbot|yandexbot|baiduspider|facebookexternalhit/i.test(userAgent);
  
  return {
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
  };
}

// Insert batch of logs
async function insertBatch(batch) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert log records
    const query = `
      INSERT INTO logs(ip, timestamp, method, path, protocol, status, bytes, referrer, user_agent, is_bot)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    for (const log of batch) {
      await client.query(query, [
        log.ip,
        log.timestamp,
        log.method,
        log.path,
        log.protocol,
        log.status,
        log.bytes,
        log.referrer,
        log.user_agent,
        log.is_bot
      ]);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Inserted ${batch.length} log records`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting batch:', error);
    return false;
  } finally {
    client.release();
  }
}

// Update aggregated statistics
async function updateStatistics() {
  const client = await pool.connect();
  console.log('Updating statistics tables...');
  
  try {
    await client.query('BEGIN');
    
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
      INSERT INTO hourly_stats(hour, total_requests, unique_visitors, bot_requests, error_count, total_bytes)
      SELECT 
        DATE_TRUNC('hour', timestamp) AS hour,
        COUNT(*) AS total_requests,
        COUNT(DISTINCT ip) AS unique_visitors,
        SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) AS bot_requests,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS error_count,
        SUM(bytes) AS total_bytes
      FROM logs
      GROUP BY hour
      ORDER BY hour;
    `);
    
    // Update path statistics
    await client.query(`
      TRUNCATE TABLE path_stats;
      INSERT INTO path_stats(path, count, error_count, last_accessed)
      SELECT 
        path,
        COUNT(*) AS count,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS error_count,
        MAX(timestamp) AS last_accessed
      FROM logs
      GROUP BY path
      ORDER BY count DESC
      LIMIT 100;
    `);
    
    await client.query('COMMIT');
    console.log('Statistics updated successfully');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating statistics:', error);
    return false;
  } finally {
    client.release();
  }
}

// Process uncompressed log file
async function processLogFile(filePath) {
  console.log(`Processing log file: ${filePath}`);
  
  try {
    // Check if the file exists
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
    console.log(`Log file does not exist: ${filePath}`);
    return 0; // Return 0 processed lines
  }
  
  const lastPosition = await getLastPosition(filePath);
  const fileStats = await fs.promises.stat(filePath);
  const fileSize = fileStats.size;
  
  // No new data
  if (lastPosition >= fileSize) {
    console.log(`No new data to process in ${path.basename(filePath)}`);
    return 0;
  }
  
  console.log(`Processing from position ${lastPosition} to ${fileSize} (${fileSize - lastPosition} bytes)`);
  
  // Create read stream starting from last position
  const stream = fs.createReadStream(filePath, {
    start: lastPosition,
    highWaterMark: 64 * 1024 // 64KB chunks
  });
  
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });
  
  const batchSize = config.batchSize;
  let batch = [];
  let currentPosition = lastPosition;
  let lineCount = 0;
  
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) {
      currentPosition += Buffer.byteLength(line) + 1;
      continue;
    }
    
    // Parse NGINX log line
    const parsedLine = parseNginxLog(line);
    if (parsedLine) {
      batch.push(parsedLine);
      lineCount++;
    } else {
      console.warn(`Invalid log format: ${line}`);
    }
    
    // Update position (line length + newline character)
    currentPosition += Buffer.byteLength(line) + 1;
    
    // Insert batch when it reaches the size limit
    if (batch.length >= batchSize) {
      const success = await insertBatch(batch);
      if (success) {
        await savePosition(filePath, currentPosition);
      }
      batch = [];
    }
  }
  
  // Insert any remaining records
  if (batch.length > 0) {
    const success = await insertBatch(batch);
    if (success) {
      await savePosition(filePath, currentPosition);
    }
  }
  
  console.log(`Processed ${lineCount} lines from ${path.basename(filePath)}`);
  return lineCount;
}

// Process compressed log file (.gz)
async function processCompressedLogFile(filePath) {
  console.log(`Processing compressed log file: ${filePath}`);
  
  try {
    // Check if the file exists
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
    console.log(`Compressed log file does not exist: ${filePath}`);
    return 0; // Return 0 processed lines
  }
  
  const lastPosition = await getLastPosition(filePath);
  
  // For compressed files, we either process the whole file or skip it if already processed
  // This is because seeking in compressed files is not straightforward
  if (lastPosition > 0) {
    console.log(`Compressed file ${path.basename(filePath)} already processed`);
    return 0;
  }
  
  console.log(`Processing entire compressed file ${path.basename(filePath)}`);
  
  // Create read stream with decompression
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });
  
  const batchSize = config.batchSize;
  let batch = [];
  let lineCount = 0;
  
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    
    // Parse NGINX log line
    const parsedLine = parseNginxLog(line);
    if (parsedLine) {
      batch.push(parsedLine);
      lineCount++;
    } else {
      console.warn(`Invalid log format in compressed file: ${line}`);
    }
    
    // Insert batch when it reaches the size limit
    if (batch.length >= batchSize) {
      await insertBatch(batch);
      batch = [];
    }
  }
  
  // Insert any remaining records
  if (batch.length > 0) {
    await insertBatch(batch);
  }
  
  // Mark the file as fully processed
  await savePosition(filePath, 1);
  
  console.log(`Processed ${lineCount} lines from compressed file ${path.basename(filePath)}`);
  return lineCount;
}

// Process all log files
async function processAllLogFiles() {
  let totalProcessed = 0;
  
  // Process uncompressed log file
  totalProcessed += await processLogFile(config.logFile);
  
  // Process compressed log files
  for (const compressedFile of config.compressedLogFiles) {
    totalProcessed += await processCompressedLogFile(compressedFile);
  }
  
  // Update statistics if any logs were processed
  if (totalProcessed > 0) {
    await updateStatistics();
  } else {
    console.log('No new logs to process, skipping statistics update');
  }
  
  return totalProcessed;
}

// Main execution
async function main() {
  try {
    // Initialize database tables
    await initializeDatabase();
    
    // Initial database connection test
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
    
    // Run immediately on startup
    const processed = await processAllLogFiles();
    console.log(`Initial run complete. Processed ${processed} log entries.`);
    
    // Schedule periodic processing
    console.log(`Scheduling processing every 3 minutes (cron: ${config.updateInterval})`);
    cron.schedule(config.updateInterval, async () => {
      try {
        const processed = await processAllLogFiles();
        console.log(`Scheduled run complete. Processed ${processed} log entries.`);
      } catch (error) {
        console.error('Error in scheduled processing:', error);
      }
    });
    
    console.log('Log processor initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});