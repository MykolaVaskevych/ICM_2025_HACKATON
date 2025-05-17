# Database Migration Plan

## Overview
Migrate from Python data processing to JavaScript with PostgreSQL database for improved performance, scalability, and real-time data handling.

## Goals
- Replace Python log processing with JavaScript implementation
- Set up PostgreSQL database for efficient log storage and querying
- Implement line-by-line file reading for large log files
- Create a service to update database incrementally (every ~3 minutes)
- Modify dashboard to query database directly instead of static JSON files

## Tasks

### 1. PostgreSQL Setup
- [ ] Install PostgreSQL
  ```bash
  # For macOS (using Homebrew)
  brew install postgresql@15
  brew services start postgresql@15
  ```
- [ ] Create database and user
  ```sql
  CREATE DATABASE nginx_logs;
  CREATE USER nginx_user WITH ENCRYPTED PASSWORD 'secure_password';
  GRANT ALL PRIVILEGES ON DATABASE nginx_logs TO nginx_user;
  ```
- [ ] Configure PostgreSQL for local development

### 2. Database Schema Design
- [ ] Design schema for NGINX logs with proper indexing
  ```sql
  CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    ip TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    method TEXT,
    path TEXT,
    protocol TEXT,
    status INTEGER,
    bytes INTEGER,
    referrer TEXT,
    user_agent TEXT,
    is_bot BOOLEAN,
    processing_time DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Add indexes for common query patterns
  CREATE INDEX idx_logs_timestamp ON logs(timestamp);
  CREATE INDEX idx_logs_status ON logs(status);
  CREATE INDEX idx_logs_is_bot ON logs(is_bot);
  CREATE INDEX idx_logs_ip ON logs(ip);
  CREATE INDEX idx_logs_path ON logs(path);
  ```
- [ ] Create additional tables for aggregated statistics
  ```sql
  -- For status code statistics
  CREATE TABLE status_stats (
    id SERIAL PRIMARY KEY,
    status INTEGER,
    count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- For hourly traffic
  CREATE TABLE hourly_stats (
    id SERIAL PRIMARY KEY,
    hour INTEGER,
    day DATE,
    count INTEGER,
    bytes_total BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- For path statistics
  CREATE TABLE path_stats (
    id SERIAL PRIMARY KEY,
    path TEXT,
    count INTEGER,
    avg_time DOUBLE PRECISION,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

### 3. Log Processor Implementation (JavaScript)
- [ ] Create JavaScript log parser utility
  - [ ] Implement line-by-line reader for large files using streams
  - [ ] Add NGINX log format parsing
  - [ ] Implement bot detection logic
- [ ] Create incremental processing functionality
  - [ ] Track file position between runs
  - [ ] Process only new log entries
- [ ] Add database connection and insert operations
  - [ ] Use parameterized queries to prevent SQL injection
  - [ ] Implement bulk insert for better performance
- [ ] Set up periodic updates (every 3 minutes)
  - [ ] Use node-cron for scheduled tasks
  - [ ] Implement file change detection

### 4. API Development
- [ ] Create API endpoints for dashboard data
  - [ ] `/api/summary` - General statistics
  - [ ] `/api/status` - HTTP status code distribution
  - [ ] `/api/timeline` - Hourly/daily request timeline
  - [ ] `/api/ips` - Top IP addresses
  - [ ] `/api/paths` - Top requested paths
  - [ ] `/api/bots` - Bot traffic analysis
  - [ ] `/api/errors` - Error analysis
  - [ ] `/api/logs` - Raw logs with filtering
- [ ] Implement query optimization and caching
  - [ ] Use prepared statements
  - [ ] Add Redis caching for frequent queries
  - [ ] Implement pagination for large result sets

### 5. Dashboard Updates
- [ ] Modify dashboard components to fetch from API
  - [ ] Update data fetching logic in page.js
  - [ ] Add loading states for API requests
  - [ ] Implement error handling
- [ ] Add real-time updates to dashboard
  - [ ] Use websockets or polling for live updates
  - [ ] Add visual indicators for new data

### 6. Testing
- [ ] Create test suite for log processor
- [ ] Test database queries for performance
- [ ] Load testing with large log files
- [ ] End-to-end testing of dashboard with API

### 7. Deployment
- [ ] Set up PostgreSQL in production environment
- [ ] Configure log processor service
- [ ] Deploy updated dashboard
- [ ] Set up monitoring and alerts

## Implementation Details

### Log Processing Flow
1. Monitor log file for changes
2. When new lines are detected:
   - Read from the last processed position
   - Parse each new line into structured data
   - Insert new records into the database
   - Update aggregated statistics tables
   - Store the new file position for next run
3. Trigger API cache invalidation if needed

### Example Code for Line-by-Line Reading
```javascript
const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'nginx_user',
  host: 'localhost',
  database: 'nginx_logs',
  password: 'secure_password',
  port: 5432,
});

// Store file position
async function savePosition(filePath, position) {
  await fs.promises.writeFile(
    `${filePath}.position`, 
    position.toString()
  );
}

// Get last position
async function getLastPosition(filePath) {
  try {
    const position = await fs.promises.readFile(
      `${filePath}.position`, 
      'utf8'
    );
    return parseInt(position);
  } catch (error) {
    return 0; // Start from beginning if no position file
  }
}

// Process log file incrementally
async function processLogFile(filePath) {
  const lastPosition = await getLastPosition(filePath);
  const fileSize = (await fs.promises.stat(filePath)).size;
  
  // No new data
  if (lastPosition >= fileSize) {
    console.log('No new data to process');
    return;
  }
  
  // Create read stream starting from last position
  const stream = fs.createReadStream(filePath, {
    start: lastPosition,
    highWaterMark: 64 * 1024 // 64KB chunks
  });
  
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });
  
  const batchSize = 1000;
  let batch = [];
  let currentPosition = lastPosition;
  
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    
    // Parse NGINX log line
    const parsedLine = parseNginxLog(line);
    if (parsedLine) {
      batch.push(parsedLine);
    }
    
    // Update position (line length + newline character)
    currentPosition += Buffer.byteLength(line) + 1;
    
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
  
  // Save the new position
  await savePosition(filePath, currentPosition);
  console.log(`Processed log file up to position ${currentPosition}`);
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
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting batch:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Parse NGINX log line
function parseNginxLog(line) {
  // Example NGINX combined log format parser
  const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;
  const match = line.match(regex);
  
  if (!match) return null;
  
  const [
    _, ip, timeStr, method, path, protocol, 
    status, bytes, referrer, userAgent
  ] = match;
  
  // Convert to proper timestamp
  const timestamp = new Date(timeStr.replace(':', ' '));
  
  // Simple bot detection (could be more sophisticated)
  const is_bot = userAgent.toLowerCase().includes('bot') || 
                userAgent.toLowerCase().includes('crawler') ||
                userAgent.toLowerCase().includes('spider');
  
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
    is_bot
  };
}

// Update aggregated statistics
async function updateStatistics(client) {
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
}

// Run the processor every 3 minutes
setInterval(() => {
  processLogFile('/path/to/nginx/access.log')
    .catch(error => console.error('Error processing log file:', error));
}, 3 * 60 * 1000);

// Initial run
processLogFile('/path/to/nginx/access.log')
  .catch(error => console.error('Error processing log file:', error));
```

## Benefits of Database Migration
1. **Better Performance**: Optimized queries will be much faster than parsing large JSON files
2. **Incremental Processing**: Only process new log entries instead of re-processing the entire file
3. **Real-time Updates**: Dashboard will show the latest data without manual refresh
4. **Scalability**: Database can handle much larger log files than in-memory JSON processing
5. **Advanced Queries**: SQL enables complex filtering and aggregation not easily done with JSON
6. **Reduced Memory Usage**: Stream processing uses minimal memory even for gigabyte-sized logs