import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions
const gunzip = promisify(zlib.gunzip);

// Regular expression for parsing NGINX logs
// Updated pattern to be more flexible with different NGINX log formats
const LOG_PATTERN = /^(\S+) - - \[([\w:/]+\s[+\-]\d{4})\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;

// Bot patterns for detection in user agents
const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawl/i, /slurp/i, /scraper/i, /fetcher/i,
  /archiver/i, /validator/i, /baidu/i, /pingdom/i, /scanner/i,
  /http[s]?-client/i, /curl/i, /wget/i, /monitor/i, /health-check/i,
  /gptbot/i, /claudebot/i, /anthropic/i, /openai/i, /googlebot/i,
  /bingbot/i, /yandexbot/i, /duckduckbot/i
];

/**
 * Detect if a user agent string belongs to a bot
 */
function isBot(userAgent) {
  if (!userAgent || userAgent === '-') {
    return false;
  }
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Parse NGINX log files with various formats
 */
export async function parseLogFile(fileBuffer, fileName) {
  try {
    let fileContent;
    const fileExt = path.extname(fileName).toLowerCase();
    
    // Handle gzipped files
    if (fileExt === '.gz') {
      try {
        const unzippedBuffer = await gunzip(fileBuffer);
        fileContent = unzippedBuffer.toString('utf-8');
      } catch (error) {
        console.error('Error decompressing .gz file:', error);
        throw new Error(`Failed to decompress .gz file: ${error.message}`);
      }
    } else {
      // Handle txt, log, and files without extensions
      try {
        fileContent = fileBuffer.toString('utf-8');
        // Check if the content is valid text
        if (!fileContent || !fileContent.trim()) {
          throw new Error('File content appears to be empty or invalid');
        }
      } catch (error) {
        console.error('Error reading plain log file:', error);
        throw new Error(`Failed to read log file: ${error.message}`);
      }
    }
    
    // Parse log lines
    const lines = fileContent.split('\n').filter(line => line.trim());
    console.log(`Processing ${lines.length} log lines from ${fileName}`);
    
    if (lines.length === 0) {
      throw new Error('No valid log lines found in the file');
    }
    
    return parseLogLines(lines);
  } catch (error) {
    console.error('Error parsing log file:', error);
    throw new Error(`Log parsing error: ${error.message}`);
  }
}

/**
 * Parse individual log lines using regex pattern matching
 */
function parseLogLines(lines) {
  const parsedLogs = [];
  const stats = initializeStats();
  
  for (const line of lines) {
    const match = line.match(LOG_PATTERN);
    
    if (match) {
      const [, ip, dateStr, request, status, bytes, referrer, userAgent] = match;
      
      // Parse request
      let method = 'GET';
      let path = '/';
      let protocol = '';
      
      const requestParts = request.split(' ');
      if (requestParts.length >= 2) {
        method = requestParts[0];
        path = requestParts[1];
        if (requestParts.length > 2) {
          protocol = requestParts[2];
        }
      }
      
      // Get file extension from path
      const fileExtension = getFileExtension(path);
      
      // Determine path depth
      const pathDepth = getPathDepth(path);
      
      // Detect if the user agent is a bot
      const isBotRequest = isBot(userAgent);
      
      // Parse timestamp
      let timestamp = new Date().toISOString();
      let hourFormatted = "unknown";
      let dayFormatted = "unknown";
      
      try {
        // Convert nginx date format to ISO string
        const dateMatch = /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+\-]\d{4})/.exec(dateStr);
        if (dateMatch) {
          const [, dayValue, month, year, hours, minute, second, timezone] = dateMatch;
          
          // Convert month name to month number
          const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
          const monthNum = months[month];
          
          // Create date object and convert to ISO string
          const date = new Date(Date.UTC(year, monthNum, dayValue, hours, minute, second));
          timestamp = date.toISOString();
          
          // Format hour and day for statistics
          hourFormatted = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(dayValue).padStart(2, '0')} ${String(hours).padStart(2, '0')}:00`;
          dayFormatted = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(dayValue).padStart(2, '0')}`;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
      
      // Create log entry
      const statusCode = parseInt(status, 10);
      const bytesTransferred = parseInt(bytes, 10);
      
      const logEntry = {
        ip,
        timestamp,
        request,
        status: statusCode,
        bytes: bytesTransferred,
        referrer: referrer === '-' ? '' : referrer,
        user_agent: userAgent,
        is_bot: isBotRequest,
        path,
        method,
        protocol,
        file_extension: fileExtension,
        path_depth: pathDepth,
        hour: hourFormatted,
        day: dayFormatted
      };
      
      parsedLogs.push(logEntry);
      
      // Update statistics
      updateStats(stats, logEntry);
    }
  }
  
  // Calculate derived statistics
  calculateDerivedStats(stats);
  
  return {
    logs: parsedLogs,
    stats
  };
}

/**
 * Initialize statistics object
 */
function initializeStats() {
  return {
    total_requests: 0,
    status_codes: {},
    ip_addresses: {},
    user_agents: {},
    requests_per_hour: {},
    requests_per_day: {},
    endpoints: {},
    bytes_transferred: 0,
    http_methods: {},
    bot_requests: 0,
    user_requests: 0,
    file_types: {},
    referrers: {},
    path_depth: {},
    protocol_versions: {},
    traffic_per_hour: {},
    top_error_paths: {},
    ip_classification: {
      private: 0,
      public: 0,
      loopback: 0,
      other: 0
    }
  };
}

/**
 * Update statistics with a log entry
 */
function updateStats(stats, log) {
  // Basic counters
  stats.total_requests += 1;
  stats.bytes_transferred += log.bytes;
  
  // Update counters
  incrementCounter(stats.status_codes, String(log.status));
  incrementCounter(stats.ip_addresses, log.ip);
  incrementCounter(stats.user_agents, log.user_agent);
  incrementCounter(stats.requests_per_hour, log.hour);
  incrementCounter(stats.requests_per_day, log.day);
  incrementCounter(stats.endpoints, log.path);
  incrementCounter(stats.http_methods, log.method);
  incrementCounter(stats.file_types, log.file_extension);
  incrementCounter(stats.path_depth, String(log.path_depth));
  incrementCounter(stats.protocol_versions, log.protocol);
  
  // Traffic per hour
  incrementCounter(stats.traffic_per_hour, log.hour, log.bytes);
  
  // Process referrer if not empty
  if (log.referrer && log.referrer !== '-') {
    incrementCounter(stats.referrers, log.referrer);
  }
  
  // Classify as bot or user
  if (log.is_bot) {
    stats.bot_requests += 1;
  } else {
    stats.user_requests += 1;
  }
  
  // Process errors
  const status = log.status;
  if (status >= 400) {
    incrementCounter(stats.top_error_paths, log.path);
  }
  
  // Simplified IP classification
  stats.ip_classification.public += 1; // Simplified for this implementation
}

/**
 * Extract file extension from path
 */
function getFileExtension(path) {
  if (!path || path === '/' || path === '-') {
    return 'no_extension';
  }
  
  // Check for query parameters and remove them
  const pathWithoutQuery = path.split('?')[0];
  
  // Extract the file extension
  const ext = pathWithoutQuery.split('.').pop();
  
  // If the extension is the same as the path or contains a slash, it's not a real extension
  if (ext === pathWithoutQuery || ext.includes('/')) {
    return 'no_extension';
  }
  
  return ext.toLowerCase();
}

/**
 * Calculate the depth of a URL path
 */
function getPathDepth(path) {
  if (!path || path === '-') {
    return 0;
  }
  
  // Count path segments
  const segments = path.split('/').filter(s => s);
  return segments.length;
}

/**
 * Helper function to increment a counter in a statistics object
 */
function incrementCounter(obj, key, increment = 1) {
  if (!key) return;
  
  if (obj[key] === undefined) {
    obj[key] = increment;
  } else {
    obj[key] += increment;
  }
}

/**
 * Calculate derived statistics from raw counts
 */
function calculateDerivedStats(stats) {
  // Calculate success, error, and other category counts
  stats.success_requests = 0;
  stats.redirect_requests = 0;
  stats.client_error_requests = 0;
  stats.server_error_requests = 0;
  
  Object.entries(stats.status_codes).forEach(([status, count]) => {
    const statusNum = parseInt(status, 10);
    if (statusNum >= 200 && statusNum < 300) {
      stats.success_requests += count;
    } else if (statusNum >= 300 && statusNum < 400) {
      stats.redirect_requests += count;
    } else if (statusNum >= 400 && statusNum < 500) {
      stats.client_error_requests += count;
    } else if (statusNum >= 500) {
      stats.server_error_requests += count;
    }
  });
  
  // Calculate percentages
  if (stats.total_requests > 0) {
    stats.bot_percentage = (stats.bot_requests / stats.total_requests) * 100;
    stats.user_percentage = (stats.user_requests / stats.total_requests) * 100;
    stats.success_percentage = (stats.success_requests / stats.total_requests) * 100;
    stats.redirect_percentage = (stats.redirect_requests / stats.total_requests) * 100;
    stats.client_error_percentage = (stats.client_error_requests / stats.total_requests) * 100;
    stats.server_error_percentage = (stats.server_error_requests / stats.total_requests) * 100;
  }
  
  // Convert traffic to MB
  stats.total_transferred_mb = stats.bytes_transferred / (1024 * 1024);
  
  // Convert objects to sorted arrays for top N lists
  stats.top_ips = objectToSortedArray(stats.ip_addresses, 50);
  stats.top_user_agents = objectToSortedArray(stats.user_agents, 30);
  stats.top_endpoints = objectToSortedArray(stats.endpoints, 50);
  stats.top_file_types = objectToSortedArray(stats.file_types, 20);
  stats.top_referrers = objectToSortedArray(stats.referrers, 20);
  stats.top_http_methods = objectToSortedArray(stats.http_methods, 10);
  stats.path_depth_distribution = objectToSortedArray(stats.path_depth);
  stats.top_error_paths = objectToSortedArray(stats.top_error_paths, 20);
  
  // Timeline data
  stats.requests_timeline = objectToSortedArray(stats.requests_per_hour);
  stats.daily_requests = objectToSortedArray(stats.requests_per_day);
  
  // Traffic timeline in MB
  const trafficTimelineMb = {};
  Object.entries(stats.traffic_per_hour).forEach(([hour, bytes]) => {
    trafficTimelineMb[hour] = bytes / (1024 * 1024);
  });
  stats.traffic_timeline_mb = objectToSortedArray(trafficTimelineMb);
}

/**
 * Convert an object of {key: count} to a sorted array of [{name: key, count: count}]
 */
function objectToSortedArray(obj, limit = null) {
  const array = Object.entries(obj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  return limit ? array.slice(0, limit) : array;
}

/**
 * Format statistics for the dashboard visualizations
 */
export function formatStats(stats) {
  // Create the properly formatted data objects for each chart
  return {
    // Summary data
    summary: [
      { metric: 'Total Requests', value: stats.total_requests },
      { metric: 'Unique IPs', value: Object.keys(stats.ip_addresses).length },
      { metric: 'Data Transferred', value: stats.total_transferred_mb.toFixed(2), unit: 'MB' },
      { metric: 'Success Rate', value: stats.success_percentage.toFixed(1), unit: '%' },
      { metric: 'Error Rate', value: (stats.client_error_percentage + stats.server_error_percentage).toFixed(1), unit: '%' },
      { metric: 'Bot Traffic', value: stats.bot_percentage.toFixed(1), unit: '%' }
    ],
    
    // Status codes
    status_codes: Object.entries(stats.status_codes).map(([code, count]) => ({
      status: code,
      count
    })),
    
    // Status categories
    status_categories: [
      { category: 'Success (2xx)', count: stats.success_requests, percentage: stats.success_percentage },
      { category: 'Redirect (3xx)', count: stats.redirect_requests, percentage: stats.redirect_percentage },
      { category: 'Client Error (4xx)', count: stats.client_error_requests, percentage: stats.client_error_percentage },
      { category: 'Server Error (5xx)', count: stats.server_error_requests, percentage: stats.server_error_percentage }
    ],
    
    // Timeline data
    requests_timeline: stats.requests_timeline.map(({ name, count }) => ({
      hour: name,
      count
    })),
    
    // Daily requests
    daily_requests: stats.daily_requests.map(({ name, count }) => ({
      date: name,
      count
    })),
    
    // Traffic timeline
    traffic_timeline: stats.traffic_timeline_mb.map(({ name, count }) => ({
      hour: name,
      megabytes: parseFloat(count.toFixed(2))
    })),
    
    // Top endpoints
    top_endpoints: stats.top_endpoints.map(({ name, count }) => ({
      endpoint: name,
      count
    })),
    
    // Top IPs
    top_ips: stats.top_ips.map(({ name, count }) => ({
      ip: name,
      count
    })),
    
    // Bot vs. User
    bot_user: [
      { type: 'Bot', count: stats.bot_requests, percentage: stats.bot_percentage },
      { type: 'User', count: stats.user_requests, percentage: stats.user_percentage }
    ],
    
    // HTTP methods
    http_methods: stats.top_http_methods.map(({ name, count }) => ({
      method: name,
      count
    })),
    
    // File types
    file_types: stats.top_file_types.map(({ name, count }) => ({
      type: name,
      count
    })),
    
    // Path depth
    path_depth: stats.path_depth_distribution.map(({ name, count }) => ({
      depth: parseInt(name, 10),
      count
    })),
    
    // Protocols
    protocols: Object.entries(stats.protocol_versions).map(([protocol, count]) => ({
      protocol: protocol || 'Unknown',
      count
    })),
    
    // Top error paths
    error_paths: stats.top_error_paths.map(({ name, count }) => ({
      path: name,
      count,
      // We're simplifying here - in a full implementation we would track more error details
      status: 'Error'
    })),
    
    // IP classification
    ip_classification: Object.entries(stats.ip_classification).map(([className, count]) => ({
      class: className,
      count
    })),
    
    // Top referrers
    top_referrers: stats.top_referrers.map(({ name, count }) => ({
      referrer: name || 'Direct',
      count
    }))
  };
}

/**
 * Save uploaded file to temporary directory
 */
export async function saveUploadedFile(formData, fieldName = 'file') {
  try {
    const file = formData.get(fieldName);
    
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    // Get file content as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let fileName = file.name;
    
    console.log(`Received file: ${fileName}, type: ${file.type}, size: ${fileBuffer.length} bytes`);
    
    // Handle files without extensions based on the content
    if (!path.extname(fileName)) {
      // Check for gzip magic number (first few bytes)
      if (fileBuffer.length > 2 && fileBuffer[0] === 0x1F && fileBuffer[1] === 0x8B) {
        console.log('Detected gzipped content without .gz extension, treating as .gz file');
        fileName += '.gz';
      } else {
        // Default to .log for text files without extensions
        console.log('File has no extension, treating as .log file');
        fileName += '.log';
      }
    }
    
    return {
      fileName,
      fileBuffer
    };
  } catch (error) {
    console.error('Error handling file upload:', error);
    throw error;
  }
}