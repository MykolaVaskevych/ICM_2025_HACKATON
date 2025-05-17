'use server';

/**
 * Parse NGINX log line (combined format)
 * 
 * Example log line format:
 * 127.0.0.1 - - [10/Oct/2023:13:55:36 +0000] "GET /path/to/resource HTTP/1.1" 200 2326 "http://example.com/referrer" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 * 
 * @param {string} line - The NGINX log line to parse
 * @returns {object|null} - The parsed log entry object or null if invalid format
 */
export function parseNginxLog(line) {
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

/**
 * Alternate parser for the common log format (without referrer and user agent)
 * 
 * @param {string} line - The NGINX log line to parse
 * @returns {object|null} - The parsed log entry object or null if invalid format
 */
export function parseCommonLogFormat(line) {
  // Match common log format
  const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+)/;
  const match = line.match(regex);
  
  if (!match) {
    return null;
  }
  
  const [_, ip, timeStr, method, path, protocol, status, bytes] = match;
  
  // Convert timestamp
  const parsedTimeStr = timeStr.replace(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+\-]\d+)/, '$1 $2 $3 $4:$5:$6 $7');
  const timestamp = new Date(parsedTimeStr);
  
  return {
    ip,
    timestamp,
    method,
    path,
    protocol,
    status: parseInt(status),
    bytes: parseInt(bytes),
    referrer: null,
    user_agent: null,
    is_bot: false
  };
}

/**
 * Try different log format parsers in order of likelihood
 * 
 * @param {string} line - The log line to parse
 * @returns {object|null} - The parsed log entry or null if no parser succeeds
 */
export function parseLogLine(line) {
  // First try the NGINX combined format (most common)
  const nginxLog = parseNginxLog(line);
  if (nginxLog) return nginxLog;
  
  // Try common log format without referrer/user-agent
  const commonLog = parseCommonLogFormat(line);
  if (commonLog) return commonLog;
  
  // If no parser succeeds, return null
  return null;
}