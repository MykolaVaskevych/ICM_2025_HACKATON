const { Pool } = require('pg');

const pool = new Pool({
  user: 'nginx_user',
  host: 'localhost',
  database: 'nginx_logs',
  password: 'secure_password',
  port: 5432,
});

// Helper function to execute queries with proper error handling
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Error executing query', { text, error: err });
    throw err;
  }
}

// Get summary statistics
async function getSummary() {
  const totalRequests = await query('SELECT COUNT(*) as total FROM logs');
  const uniqueIPs = await query('SELECT COUNT(DISTINCT ip) as count FROM logs');
  const errorCount = await query('SELECT COUNT(*) as count FROM logs WHERE status >= 400');
  const botRequests = await query('SELECT COUNT(*) as count FROM logs WHERE is_bot = true');
  const totalBytes = await query('SELECT SUM(bytes) as total FROM logs');
  
  return {
    totalRequests: parseInt(totalRequests.rows[0].total),
    uniqueIPs: parseInt(uniqueIPs.rows[0].count),
    errorCount: parseInt(errorCount.rows[0].count),
    botRequests: parseInt(botRequests.rows[0].count),
    totalBytes: parseInt(totalBytes.rows[0].total) || 0
  };
}

// Get status code distribution
async function getStatusCodes() {
  const result = await query('SELECT status, COUNT(*) as count FROM logs GROUP BY status ORDER BY count DESC');
  
  return result.rows.map(row => ({
    status: row.status.toString(),
    count: parseInt(row.count)
  }));
}

// Get hourly/daily timeline data
async function getTimeline(timeRange = 'hourly') {
  let result;
  
  if (timeRange === 'hourly') {
    result = await query(`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:00:00') as full_time,
        COUNT(*) as count
      FROM logs
      GROUP BY hour, date, full_time
      ORDER BY date, hour
    `);
    
    return result.rows.map(row => ({
      hour: `${row.hour}:00`,
      count: parseInt(row.count),
      fullTime: row.full_time
    }));
  } else {
    result = await query(`
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM logs
      GROUP BY date
      ORDER BY date
    `);
    
    return result.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count),
      fullDate: row.date
    }));
  }
}

// Get traffic data (bytes transferred)
async function getTrafficData(timeRange = 'hourly') {
  let result;
  
  if (timeRange === 'hourly') {
    result = await query(`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:00:00') as full_time,
        SUM(bytes) / 1024 / 1024 as megabytes
      FROM logs
      GROUP BY hour, date, full_time
      ORDER BY date, hour
    `);
    
    return result.rows.map(row => ({
      hour: `${row.hour}:00`,
      megabytes: parseFloat(row.megabytes),
      fullTime: row.full_time
    }));
  } else {
    result = await query(`
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
        SUM(bytes) / 1024 / 1024 as megabytes
      FROM logs
      GROUP BY date
      ORDER BY date
    `);
    
    return result.rows.map(row => ({
      date: row.date,
      megabytes: parseFloat(row.megabytes),
      fullDate: row.date
    }));
  }
}

// Get top IP addresses
async function getTopIPs(limit = 100) {
  const result = await query(`
    SELECT 
      ip, 
      COUNT(*) as count,
      (SUM(CASE WHEN is_bot THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as bot_percentage
    FROM logs
    GROUP BY ip
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    ip: row.ip,
    count: parseInt(row.count),
    botPercentage: parseFloat(row.bot_percentage)
  }));
}

// Get top endpoints
async function getTopEndpoints(limit = 100) {
  const result = await query(`
    SELECT path as endpoint, COUNT(*) as count
    FROM logs
    GROUP BY path
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    endpoint: row.endpoint,
    count: parseInt(row.count)
  }));
}

// Get error paths
async function getErrorPaths(limit = 100) {
  const result = await query(`
    SELECT 
      path, 
      COUNT(*) as count,
      mode() WITHIN GROUP (ORDER BY status) as common_status
    FROM logs
    WHERE status >= 400
    GROUP BY path
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    path: row.path,
    count: parseInt(row.count),
    status: row.common_status.toString()
  }));
}

// Get bot/user data
async function getBotUserData() {
  const result = await query(`
    SELECT 
      CASE WHEN is_bot THEN 'Bot' ELSE 'User' END as type,
      COUNT(*) as count
    FROM logs
    GROUP BY is_bot
  `);
  
  return result.rows.map(row => ({
    type: row.type,
    count: parseInt(row.count)
  }));
}

// Get file types
async function getFileTypes(limit = 20) {
  const result = await query(`
    SELECT 
      CASE 
        WHEN path ~ '\\.\\w+$' THEN SUBSTRING(path FROM '\\.([^.]+)$')
        ELSE 'none' 
      END as type,
      COUNT(*) as count
    FROM logs
    GROUP BY type
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    type: row.type,
    count: parseInt(row.count)
  }));
}

// Get raw logs with filtering
async function getRawLogs(filters = {}, limit = 1000) {
  // Build dynamic query with filters
  let query = 'SELECT * FROM logs';
  const params = [];
  const conditions = [];
  
  // Add filters
  if (filters.ip) {
    params.push(filters.ip);
    conditions.push(`ip = $${params.length}`);
  }
  
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status::text = $${params.length}`);
  }
  
  if (filters.method) {
    params.push(filters.method);
    conditions.push(`method = $${params.length}`);
  }
  
  if (filters.path) {
    params.push(`%${filters.path}%`);
    conditions.push(`path LIKE $${params.length}`);
  }
  
  if (filters.date) {
    params.push(`${filters.date}%`);
    conditions.push(`timestamp::text LIKE $${params.length}`);
  }
  
  if (filters.is_bot !== undefined) {
    params.push(filters.is_bot);
    conditions.push(`is_bot = $${params.length}`);
  }
  
  // Add WHERE clause if we have conditions
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add ordering and limit
  query += ' ORDER BY timestamp DESC';
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  
  const result = await pool.query(query, params);
  
  return result.rows.map(row => ({
    id: row.id,
    ip: row.ip,
    timestamp: row.timestamp,
    method: row.method,
    path: row.path,
    protocol: row.protocol,
    status: row.status.toString(),
    bytes: row.bytes,
    referrer: row.referrer,
    user_agent: row.user_agent,
    is_bot: row.is_bot
  }));
}

module.exports = {
  query,
  getSummary,
  getStatusCodes,
  getTimeline,
  getTrafficData,
  getTopIPs,
  getTopEndpoints,
  getErrorPaths,
  getBotUserData,
  getFileTypes,
  getRawLogs
};