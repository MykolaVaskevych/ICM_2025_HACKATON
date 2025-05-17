/**
 * NGINX Log Dashboard - Data Generator
 * 
 * This script processes NGINX logs and generates JSON files for dashboard visualization.
 * It replaces the Python-based solution with a JavaScript implementation.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createGzip } = require('zlib');
const { promisify } = require('util');

// Configuration
const config = {
  logFile: path.resolve(__dirname, 'access.log'),
  outputDir: path.resolve(__dirname, 'nginx-dashboard/public/data'),
  sampleSize: 10000, // Number of log entries to process (0 for all entries)
};

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

// Calculate statistics from parsed logs
function calculateStatistics(logs) {
  console.log(`Calculating statistics for ${logs.length} log entries...`);
  
  // Basic summary statistics
  const totalRequests = logs.length;
  const uniqueIPs = new Set(logs.map(log => log.ip)).size;
  const errorRequests = logs.filter(log => log.status >= 400).length;
  const botRequests = logs.filter(log => log.is_bot).length;
  const totalBytes = logs.reduce((sum, log) => sum + log.bytes, 0);
  
  // Status code statistics
  const statusCodes = {};
  logs.forEach(log => {
    const status = log.status.toString();
    statusCodes[status] = (statusCodes[status] || 0) + 1;
  });
  
  // HTTP methods statistics
  const httpMethods = {};
  logs.forEach(log => {
    const method = log.method;
    httpMethods[method] = (httpMethods[method] || 0) + 1;
  });
  
  // Timeline statistics (hourly)
  const hourlyTimeline = {};
  logs.forEach(log => {
    const date = log.timestamp.toISOString().split('T')[0];
    const hour = log.timestamp.getHours();
    const key = `${date} ${hour}:00`;
    hourlyTimeline[key] = (hourlyTimeline[key] || 0) + 1;
  });
  
  // Timeline statistics (daily)
  const dailyTimeline = {};
  logs.forEach(log => {
    const date = log.timestamp.toISOString().split('T')[0];
    dailyTimeline[date] = (dailyTimeline[date] || 0) + 1;
  });
  
  // Traffic data (bytes per hour)
  const hourlyTraffic = {};
  logs.forEach(log => {
    const date = log.timestamp.toISOString().split('T')[0];
    const hour = log.timestamp.getHours();
    const key = `${date} ${hour}:00`;
    hourlyTraffic[key] = (hourlyTraffic[key] || 0) + log.bytes;
  });
  
  // Top IPs
  const ipCounts = {};
  logs.forEach(log => {
    ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
  });
  
  // Top endpoints
  const endpointCounts = {};
  logs.forEach(log => {
    endpointCounts[log.path] = (endpointCounts[log.path] || 0) + 1;
  });
  
  // Top referrers
  const referrerCounts = {};
  logs.forEach(log => {
    if (log.referrer) {
      referrerCounts[log.referrer] = (referrerCounts[log.referrer] || 0) + 1;
    }
  });
  
  // Bot vs user data
  const botUserData = [
    { type: 'Bot', count: botRequests },
    { type: 'User', count: totalRequests - botRequests }
  ];
  
  // Status categories
  const statusCategories = [
    { category: '2xx', count: logs.filter(log => log.status >= 200 && log.status < 300).length },
    { category: '3xx', count: logs.filter(log => log.status >= 300 && log.status < 400).length },
    { category: '4xx', count: logs.filter(log => log.status >= 400 && log.status < 500).length },
    { category: '5xx', count: logs.filter(log => log.status >= 500 && log.status < 600).length }
  ];
  
  // File types
  const fileTypes = {};
  logs.forEach(log => {
    const match = log.path.match(/\.([^.?]+)(?:\?.*)?$/);
    const fileType = match ? match[1] : 'none';
    fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
  });
  
  // Path depth
  const pathDepth = {};
  logs.forEach(log => {
    const depth = log.path.split('/').filter(Boolean).length;
    pathDepth[depth] = (pathDepth[depth] || 0) + 1;
  });
  
  // Error paths
  const errorPaths = {};
  logs.filter(log => log.status >= 400).forEach(log => {
    const key = `${log.path} (${log.status})`;
    errorPaths[key] = (errorPaths[key] || 0) + 1;
  });
  
  // Format the data for the dashboard
  return {
    summary: [
      { metric: 'Total Requests', value: totalRequests },
      { metric: 'Unique IPs', value: uniqueIPs },
      { metric: 'Error Requests', value: errorRequests },
      { metric: 'Bot Requests', value: botRequests },
      { metric: 'Total Bytes', value: totalBytes }
    ],
    statusCodes: Object.entries(statusCodes).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    httpMethods: Object.entries(httpMethods).map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
    requestsTimeline: Object.entries(hourlyTimeline).map(([time, count]) => {
      const [date, hour] = time.split(' ');
      return { hour, count, fullTime: time };
    }).sort((a, b) => a.fullTime.localeCompare(b.fullTime)),
    dailyRequests: Object.entries(dailyTimeline).map(([date, count]) => ({
      date,
      count,
      fullDate: date
    })).sort((a, b) => a.fullDate.localeCompare(b.fullDate)),
    trafficTimeline: Object.entries(hourlyTraffic).map(([time, bytes]) => {
      const [date, hour] = time.split(' ');
      return { hour, megabytes: bytes / (1024 * 1024), fullTime: time };
    }).sort((a, b) => a.fullTime.localeCompare(b.fullTime)),
    topIps: Object.entries(ipCounts).map(([ip, count]) => ({
      ip,
      count,
      botPercentage: (logs.filter(log => log.ip === ip && log.is_bot).length / ipCounts[ip]) * 100
    })).sort((a, b) => b.count - a.count).slice(0, 100),
    topEndpoints: Object.entries(endpointCounts).map(([endpoint, count]) => ({ endpoint, count })).sort((a, b) => b.count - a.count).slice(0, 100),
    topReferrers: Object.entries(referrerCounts).map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count).slice(0, 100),
    botUser: botUserData,
    statusCategories: statusCategories,
    fileTypes: Object.entries(fileTypes).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    pathDepth: Object.entries(pathDepth).map(([depth, count]) => ({ depth: parseInt(depth), count })).sort((a, b) => a.depth - b.depth),
    errorPaths: Object.entries(errorPaths).map(([path, count]) => {
      const match = path.match(/^(.*) \((\d+)\)$/);
      return { path: match[1], count, status: match[2] };
    }).sort((a, b) => b.count - a.count).slice(0, 100),
    filteredLogs: logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      ip: log.ip,
      method: log.method,
      path: log.path,
      protocol: log.protocol,
      status: log.status.toString(),
      bytes: log.bytes,
      referrer: log.referrer,
      user_agent: log.user_agent,
      is_bot: log.is_bot
    })).slice(0, 1000)
  };
}

// Save statistics to JSON files
async function saveStatistics(stats) {
  console.log('Saving statistics to JSON files...');
  
  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  const files = {
    'summary.json': stats.summary,
    'status_codes.json': stats.statusCodes,
    'http_methods.json': stats.httpMethods,
    'requests_timeline.json': stats.requestsTimeline,
    'daily_requests.json': stats.dailyRequests,
    'traffic_timeline.json': stats.trafficTimeline,
    'top_ips.json': stats.topIps,
    'top_endpoints.json': stats.topEndpoints,
    'top_referrers.json': stats.topReferrers,
    'bot_user.json': stats.botUser,
    'status_categories.json': stats.statusCategories,
    'file_types.json': stats.fileTypes,
    'path_depth.json': stats.pathDepth,
    'error_paths.json': stats.errorPaths,
    'filtered_logs.json': stats.filteredLogs,
    'raw_stats.json': stats // Complete data set
  };
  
  // Save each file
  for (const [filename, data] of Object.entries(files)) {
    const filePath = path.join(config.outputDir, filename);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${filePath}`);
  }
}

// Process log file
async function processLogFile() {
  console.log(`Processing log file: ${config.logFile}`);
  
  // Check if the file exists
  try {
    await fs.promises.access(config.logFile, fs.constants.F_OK);
  } catch (error) {
    console.error(`Log file does not exist: ${config.logFile}`);
    return;
  }
  
  const logs = [];
  let lineCount = 0;
  
  // Create read stream
  const fileStream = fs.createReadStream(config.logFile);
  
  // Create readline interface
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  // Process each line
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    
    // Parse NGINX log line
    const parsedLine = parseNginxLog(line);
    if (parsedLine) {
      logs.push(parsedLine);
      lineCount++;
      
      // Show progress
      if (lineCount % 10000 === 0) {
        console.log(`Processed ${lineCount} lines...`);
      }
      
      // Stop if we reach the sample size
      if (config.sampleSize > 0 && lineCount >= config.sampleSize) {
        break;
      }
    } else {
      console.warn(`Invalid log format: ${line}`);
    }
  }
  
  console.log(`Processing complete. Processed ${lineCount} lines.`);
  
  // Calculate and save statistics
  const stats = calculateStatistics(logs);
  await saveStatistics(stats);
  
  // Also save parsed logs to JSON file for inspection
  const parsedLogsPath = path.join(__dirname, 'parsed_logs.json');
  await fs.promises.writeFile(parsedLogsPath, JSON.stringify(logs.slice(0, 1000), null, 2));
  console.log(`Saved parsed logs to ${parsedLogsPath}`);
  
  return stats;
}

// Main function
async function main() {
  try {
    await processLogFile();
    console.log('Data generation complete!');
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);