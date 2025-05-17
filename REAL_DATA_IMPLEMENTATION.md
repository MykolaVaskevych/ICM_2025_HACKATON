# NGINX Dashboard with Real PostgreSQL Data

## Overview

This implementation completely removes all mock data and uses only real NGINX logs and a direct PostgreSQL database connection. The dashboard provides comprehensive analytics, visualization, and management capabilities for NGINX logs with a focus on real data processing.

## Key Components

### Real Data Processing

1. **Direct Log Processor**
   - Processes actual NGINX logs without any simulated data
   - Supports both standard (.log) and compressed (.gz) log files
   - Uses incremental processing with file position tracking
   - Implements efficient batch database operations

2. **PostgreSQL Integration**
   - Direct database connection without authentication layers
   - Actual database schema with appropriate tables and indexes
   - Real-time data queries and updates
   - Full SQL query capabilities

3. **Data Management**
   - Real database admin tools with actual table browsing
   - Direct data editing with database updates
   - Comprehensive SQL query interface
   - Real-time statistics generation

### Complete API Endpoints

All API endpoints have been implemented to handle real data:

1. **Database Management Endpoints**
   - `/api/admin/status` - Get real-time PostgreSQL status
   - `/api/admin/tables` - List actual database tables with row counts
   - `/api/admin/tables/[table]/data` - Fetch real table data with pagination
   - `/api/admin/tables/[table]/rows/[id]` - Update/delete actual database rows
   - `/api/admin/schema` - Get real database schema
   - `/api/admin/toggle-source` - Toggle between file and database modes
   - `/api/query` - Execute SQL queries against the real database

2. **Import/Export Endpoints**
   - `/api/import/gz` - Process compressed logs into database
   - `/api/import/database` - Import actual database records
   - `/api/export/gz` - Export real logs to compressed file
   - `/api/export/database` - Export logs to database

### Enhanced PDF Reports

The PDF report generator now captures actual charts and visualizations from the dashboard:

- Uses `html2canvas` to capture real chart elements
- Creates comprehensive reports with actual analytics data
- Includes multi-page reports with cover page, statistics, and visualizations
- All charts are based on real data from the database

## Database Schema

```sql
-- Logs table to store raw NGINX logs
CREATE TABLE logs (
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
);

-- Table for hourly statistics
CREATE TABLE hourly_stats (
  id SERIAL PRIMARY KEY,
  hour TIMESTAMP NOT NULL UNIQUE,
  total_requests INTEGER NOT NULL,
  unique_visitors INTEGER NOT NULL,
  bot_requests INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  total_bytes BIGINT NOT NULL
);

-- Table for path statistics
CREATE TABLE path_stats (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  last_accessed TIMESTAMP NOT NULL
);

-- Table for HTTP status statistics
CREATE TABLE status_stats (
  id SERIAL PRIMARY KEY,
  status INTEGER NOT NULL UNIQUE,
  count INTEGER NOT NULL
);
```

## How to Use

1. **Process Real Logs**
   ```bash
   npm run process:logs
   ```
   This processes actual NGINX logs into the PostgreSQL database.

2. **Start Dashboard**
   ```bash
   npm run dashboard
   ```
   Launches the dashboard with real database connection.

3. **Database Admin**
   Access `/admin` to manage the PostgreSQL database directly.

4. **Import/Export Real Data**
   Use the Import/Export panel to work with actual log files and database data.

## Key Implementation Features

1. **Direct Database Operations**
   ```javascript
   // Example of direct database connection and query
   const result = await pool.query(`
     SELECT 
       date_trunc('hour', timestamp) as hour,
       COUNT(*) as total_requests,
       COUNT(DISTINCT ip) as unique_visitors,
       SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_requests,
       SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
       SUM(bytes) as total_bytes
     FROM logs
     GROUP BY hour
   `);
   ```

2. **Real Log Processing**
   ```javascript
   // Example of processing a real log file
   for await (const line of rl) {
     if (line.trim()) {
       const match = line.match(regex);
       
       if (match) {
         const [_, ip, timeStr, method, path, protocol, status, bytes, referrer, userAgent] = match;
         // Process and insert actual log data...
       }
     }
   }
   ```

3. **PDF Chart Capture**
   ```javascript
   // Example of capturing real charts for PDF
   const trafficChartElement = document.querySelector('.traffic-chart canvas');
   if (trafficChartElement) {
     const canvas = await html2canvas(trafficChartElement);
     const imgData = canvas.toDataURL('image/png');
     doc.addImage(imgData, 'PNG', 20, 30, 170, 80);
   }
   ```

4. **Real-time Database Status**
   ```javascript
   // Example of fetching actual database status
   const uptimeRes = await pool.query(`
     SELECT 
       current_timestamp - pg_postmaster_start_time() as uptime
     FROM pg_postmaster_start_time();
   `);
   ```

## Conclusion

This implementation completely eliminates all mock data and dummy functionalities, replacing them with real log processing and direct database operations. The dashboard now provides a true representation of NGINX log data with complete functionality for analysis, visualization, and management.