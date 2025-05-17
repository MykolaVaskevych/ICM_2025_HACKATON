# ICM_2025_HACKATON - NGINX Log Dashboard

A comprehensive dashboard for monitoring and analyzing NGINX access logs with PostgreSQL integration.

## Project Components

1. **log_parser.py**: Python script to parse Nginx access logs and generate statistics
2. **dashboard_data_generator.py**: Generates formatted JSON data for the Next.js dashboard
3. **nginx-dashboard/**: Next.js application for visualizing the log data
4. **log_processor.js**: Node.js script for incremental log processing with PostgreSQL integration
5. **DB_MIGRATION_TODO.md**: Database migration plan and implementation details

## Features

- Real-time log analysis with both file-based and PostgreSQL database options
- Efficient line-by-line log processing
- Interactive visualizations using D3.js
- Dark/light mode support
- Customizable time range (hourly/daily views)
- Multiple analysis tabs:
  - Overview with key metrics
  - Traffic analysis with bandwidth metrics
  - Error analysis with detailed breakdowns
  - Client/bot traffic inspection with geo-distribution
  - Raw logs with advanced filtering
- Import/export capabilities (JSON, Excel, PDF)
- Responsive design for all screen sizes

## Getting Started

### Python File-Based Method (Original)

```bash
# 1. Parse the logs and generate dashboard data
uv run dashboard_data_generator.py access_log.gz

# 2. Start the Next.js dashboard
cd nginx-dashboard
npm install  # Only needed first time
npm run dev

# 3. For continuous monitoring (in a separate terminal)
cd ..  # Back to project root
uv run log_monitor.py access_log.gz
```

Visit http://localhost:3000 to access the dashboard.

### JavaScript with PostgreSQL Method (New)

1. Set up PostgreSQL:
   ```bash
   # Install PostgreSQL (MacOS example)
   brew install postgresql@15
   brew services start postgresql@15

   # Create database and user
   createdb nginx_logs
   psql -c "CREATE USER nginx_user WITH ENCRYPTED PASSWORD 'secure_password';" nginx_logs
   psql -c "GRANT ALL PRIVILEGES ON DATABASE nginx_logs TO nginx_user;" nginx_logs

   # Initialize schema (run the SQL in DB_MIGRATION_TODO.md)
   ```

2. Configure the log processor:
   ```javascript
   // In log_processor.js
   const config = {
     logFile: path.resolve(__dirname, 'your_access.log'),
     positionFile: path.resolve(__dirname, '.your_access.log.position'),
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
   ```

3. Run the log processor:
   ```bash
   npm run process-logs
   ```

4. Enable API mode and run the dashboard:
   ```bash
   cd nginx-dashboard
   npm run dev:db  # Uses API endpoints instead of static files
   ```

5. Access the dashboard at http://localhost:3000

## Dashboard Features

The dashboard visualizes:
- Request volume over time (hourly/daily toggle)
- Status code distribution
- Top endpoints
- Top IP addresses
- Top user agents
- HTTP method distribution
- Summary statistics
- Bot vs. user traffic analysis
- Bot geographical distribution
- Bot traffic patterns
- Error analysis with status code breakdowns
- Error timeline tracking
- Error path analysis with detailed status information
- Traffic patterns and referrer analysis
- Dark/light mode with persistent settings

## Log Parser Features

The parser extracts and analyzes:
- IP addresses
- Timestamps
- HTTP request methods and paths
- Status codes
- Response sizes
- User agents
- Referrers
- Bot detection

It provides statistics on:
- Request volume over time
- Distribution of status codes
- Top accessed endpoints
- Top IP addresses
- Top user agents
- Total data transferred
- Bot vs. human traffic

## Tab Navigation

The dashboard includes several tabs for different types of analysis:

1. **Overview**: Summary statistics, status distribution, request timelines
2. **Traffic Analysis**: Detailed traffic patterns, file types, and referrer sources
3. **Error Analysis**: Comprehensive error tracking, status distribution, and error paths
4. **Clients & Bots**: Bot detection, geo-distribution, traffic patterns, and targeted endpoints
5. **Raw Logs**: Detailed log entries with multi-dimensional filtering

## Requirements

- Python 3.6+ (for Python method)
- Node.js 18+ (for dashboard and PostgreSQL method)
- npm (for dashboard)
- PostgreSQL 15+ (for database method)
- Modern web browser

## Configuration

### Log Processor Configuration

Edit the configuration object in `log_processor.js`:

```javascript
const config = {
  // Path to your NGINX access log file
  logFile: path.resolve(__dirname, 'access.log'),
  
  // File to store the processing position for incremental updates
  positionFile: path.resolve(__dirname, '.access.log.position'),
  
  // Cron schedule for checking for new log entries
  updateInterval: '*/3 * * * *', // Every 3 minutes
  
  // Number of log entries to process in one batch
  batchSize: 1000,
  
  // PostgreSQL connection parameters
  postgres: {
    user: 'nginx_user',
    host: 'localhost',
    database: 'nginx_logs',
    password: 'secure_password',
    port: 5432,
  }
};
```

### Dashboard Configuration

To switch between file-based and API/database mode:

1. Edit `/nginx-dashboard/app/dashboard/page-db.js` and change the `USE_API` flag:
   ```javascript
   // Flag to toggle between API and static file approach
   const USE_API = true; // Change to true for API/database mode
   ```

2. Run with database mode:
   ```bash
   npm run dev:db
   ```

## License

MIT