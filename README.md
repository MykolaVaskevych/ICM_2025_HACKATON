# NGINX Log Analytics Dashboard

A complete JavaScript solution for processing NGINX logs and visualizing the data in a modern dashboard.

## Features

- Real-time log processing using Node.js
- PostgreSQL database for efficient storage and querying
- Interactive dashboard built with Next.js and React
- Line-by-line log file processing for handling large log files
- Support for compressed logs (.gz files)
- Incremental log processing (only processes new log entries)
- Bot detection based on user agent patterns
- Extensive log statistics and visualizations
- Filtering and search capabilities

## System Architecture

The system consists of three main components:

1. **Log Processor** (`real_log_processor.js`): Processes NGINX log files line by line and stores the data in PostgreSQL.
2. **Dashboard API** (`nginx-dashboard/app/api`): Retrieves data from PostgreSQL and serves it to the dashboard.
3. **Dashboard UI** (`nginx-dashboard/app/dashboard`): Visualizes the log data with interactive charts and tables.

## Prerequisites

- Node.js v16 or higher
- PostgreSQL v14 or higher
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd nginx-log-dashboard
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dashboard dependencies
cd nginx-dashboard
npm install
cd ..
```

### 3. Setup PostgreSQL Database

The easiest way to set up PostgreSQL is to run the provided setup script:

```bash
# Make the script executable and run it
npm run setup:db
```

This script will:
- Check if PostgreSQL is running
- Create the `nginx_logs` database if it doesn't exist
- Create all the necessary tables and indexes
- Set up the proper schema for log analysis

Alternatively, you can manually set up PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nginx_logs;

# Connect to the new database
\c nginx_logs

# Create tables (see setup-postgres.sh for full schema)
```

## Usage

### 1. Process Logs

To initialize the database and process logs:

```bash
npm run process:logs
```

This will:
- Create database tables if they don't exist
- Process the NGINX log files (both standard and compressed)
- Update statistics for dashboard visualization
- Continue monitoring for changes every 3 minutes

### 2. Run Dashboard

In a separate terminal, run the dashboard:

```bash
npm run dashboard
```

The dashboard will be available at `http://localhost:3000`.

### 3. All-in-One Command

To set up the database, process logs, and run the dashboard in one command:

```bash
npm start
```

## Log Processing Options

The log processor (`real_log_processor.js`) supports multiple options:

- Processing uncompressed log files
- Processing compressed (.gz) log files
- Incremental processing (only processes new log entries)
- Batch processing for better performance
- Automatic updating of statistics tables

To configure which log files to process, edit the `config` object in `real_log_processor.js`:

```javascript
const config = {
  // Primary log file (uncompressed)
  logFile: path.resolve(__dirname, 'sample_access.log'),
  // Secondary log files (compressed) - these will be processed in order if they exist
  compressedLogFiles: [
    path.resolve(__dirname, 'access.log.gz'),
    path.resolve(__dirname, 'access_log.gz')
  ],
  // ...other configuration options
};
```

## Dashboard Features

The dashboard provides:

- Summary statistics
- Status code distribution
- Request timeline
- Traffic analysis
- Top IPs and endpoints
- Bot vs. user traffic
- Error analysis
- Raw log search and filtering
- Database explorer for direct SQL queries

## Development

For development with automatic reloading:

```bash
# Run log processor with nodemon for automatic reloading
npm run process:logs:dev

# Run dashboard with development server
npm run dashboard
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Make sure PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   systemctl status postgresql
   ```

2. Check database credentials in both `real_log_processor.js` and `nginx-dashboard/app/api/db.js`.

3. Run the PostgreSQL setup script again:
   ```bash
   npm run setup:db
   ```

### Log Processing Issues

If log files are not being processed:

1. Check the log file paths in `real_log_processor.js`.

2. Ensure you have proper permissions to read the log files.

3. For compressed log files, make sure the zlib module is working correctly.

## License

MIT