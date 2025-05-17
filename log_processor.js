const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');
const path = require('path');
const cron = require('node-cron');

// Configuration
const config = {
  logFile: path.resolve(__dirname, 'sample_access.log'),
  positionFile: path.resolve(__dirname, '.sample_access.log.position'),
  updateInterval: '*/3 * * * *', // Every 3 minutes
  batchSize: 1000,
  postgres: {
    user: 'nginx_user',
    host: 'localhost',
    database: 'nginx_logs',
    password: 'secure_password',
    port: 5432,
  }
};

// Database connection
const pool = new Pool(config.postgres);

// Store file position
async function savePosition(position) {
  try {
    await fs.promises.writeFile(config.positionFile, position.toString());
    console.log(`Position saved: ${position}`);
  } catch (error) {
    console.error('Error saving position:', error);
  }
}

// Get last position
async function getLastPosition() {
  try {
    const position = await fs.promises.readFile(config.positionFile, 'utf8');
    return parseInt(position);
  } catch (error) {
    console.log('No position file found, starting from beginning');
    return 0;
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
  const timestamp = new Date(timeStr.replace(':', ' '));
  
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
    
    // Update aggregated statistics
    await updateStatistics(client);
    
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
async function updateStatistics(client) {
  console.log('Updating statistics tables...');
  
  try {
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
        EXTRACT(HOUR FROM timestamp) AS hour,
        DATE(timestamp) AS day,
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
        AVG(processing_time) AS avg_time
      FROM logs
      GROUP BY path
      ORDER BY count DESC
      LIMIT 100;
    `);
    
    console.log('Statistics updated successfully');
  } catch (error) {
    console.error('Error updating statistics:', error);
    throw error;
  }
}

// Process log file incrementally
async function processLogFile() {
  console.log(`Processing log file: ${config.logFile}`);
  
  try {
    // Check if the file exists
    await fs.promises.access(config.logFile, fs.constants.F_OK);
  } catch (error) {
    console.error(`Log file does not exist: ${config.logFile}`);
    return;
  }
  
  const lastPosition = await getLastPosition();
  const fileStats = await fs.promises.stat(config.logFile);
  const fileSize = fileStats.size;
  
  // No new data
  if (lastPosition >= fileSize) {
    console.log('No new data to process');
    return;
  }
  
  console.log(`Processing from position ${lastPosition} to ${fileSize} (${fileSize - lastPosition} bytes)`);
  
  // Create read stream starting from last position
  const stream = fs.createReadStream(config.logFile, {
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
        await savePosition(currentPosition);
      }
      batch = [];
    }
  }
  
  // Insert any remaining records
  if (batch.length > 0) {
    const success = await insertBatch(batch);
    if (success) {
      await savePosition(currentPosition);
    }
  }
  
  console.log(`Processing complete. Processed ${lineCount} lines up to position ${currentPosition}`);
}

// Main execution
async function main() {
  try {
    // Initial database connection test
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
    
    // Run immediately on startup
    await processLogFile();
    
    // Schedule periodic processing
    console.log(`Scheduling processing every 3 minutes (cron: ${config.updateInterval})`);
    cron.schedule(config.updateInterval, async () => {
      try {
        await processLogFile();
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