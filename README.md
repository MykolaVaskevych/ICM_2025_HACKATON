# NGINX Log Analytics Dashboard

A complete JavaScript solution for processing NGINX logs and visualizing the data in a modern dashboard.

## Features

- Real-time log processing using Node.js
- PostgreSQL database for efficient storage and querying
- Interactive dashboard built with Next.js and React
- Line-by-line log file processing for handling large log files
- Incremental log processing (only processes new log entries)
- Bot detection based on user agent patterns
- Extensive log statistics and visualizations
- Filtering and search capabilities

## System Architecture

The system consists of three main components:

1. **Log Processor** (`log_processor.js`): Processes NGINX log files line by line and stores the data in PostgreSQL.
2. **Dashboard API** (`nginx-dashboard/app/api`): Retrieves data from PostgreSQL and serves it to the dashboard.
3. **Dashboard UI** (`nginx-dashboard/app/dashboard`): Visualizes the log data with interactive charts and tables.

## Prerequisites

- Node.js v16 or higher
- PostgreSQL v12 or higher
- npm or yarn

## Installation

### 1. Set up PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE nginx_logs;
CREATE USER nginx_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nginx_logs TO nginx_user;

# Connect to the new database
\c nginx_logs

# Create tables
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  protocol VARCHAR(10) NOT NULL,
  status INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  is_bot BOOLEAN DEFAULT FALSE,
  processing_time FLOAT
);

CREATE TABLE status_stats (
  status INTEGER PRIMARY KEY,
  count INTEGER NOT NULL
);

CREATE TABLE hourly_stats (
  id SERIAL PRIMARY KEY,
  hour INTEGER NOT NULL,
  day DATE NOT NULL,
  count INTEGER NOT NULL,
  bytes_total BIGINT NOT NULL,
  UNIQUE(hour, day)
);

CREATE TABLE path_stats (
  path TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  avg_time FLOAT
);

# Create indexes for better performance
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_ip ON logs(ip);
CREATE INDEX idx_logs_status ON logs(status);
CREATE INDEX idx_logs_path ON logs(path);
CREATE INDEX idx_logs_is_bot ON logs(is_bot);
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dashboard dependencies
cd nginx-dashboard
npm install
```

### 3. Configure Log Processor

Edit `log_processor.js` to set your PostgreSQL connection details and log file path:

```javascript
const config = {
  logFile: path.resolve(__dirname, 'access.log'),
  positionFile: path.resolve(__dirname, '.access.log.position'),
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

## Usage

### Process Logs

To process logs and store them in PostgreSQL:

```bash
npm run process
```

### Generate Dashboard Data

To generate static JSON files for the dashboard (alternative to PostgreSQL):

```bash
npm run generate
```

### Monitor Log Files

To continuously monitor log files for changes and process new entries:

```bash
npm run monitor
```

### Run Dashboard

To run the dashboard with database integration:

```bash
cd nginx-dashboard
npm run dev:db
```

## Dashboard

The dashboard is available at `http://localhost:3000` and provides:

- Summary statistics
- Status code distribution
- Request timeline
- Traffic analysis
- Top IPs and endpoints
- Bot vs. user traffic
- Error analysis
- Raw log search and filtering

## Database vs. File-Based Approach

The system supports two approaches:

1. **Database Approach** (Recommended): Stores log data in PostgreSQL for efficient querying and real-time updates.
   - Better performance with large log files
   - Efficient filtering and querying
   - Real-time updates
   - Scalable to millions of log entries

2. **File-Based Approach**: Generates static JSON files for the dashboard.
   - Simpler setup (no database required)
   - Suitable for smaller log files
   - Requires regenerating data files after log changes

To toggle between approaches:

- In `nginx-dashboard/app/api/data/route.js`: Set `USE_DATABASE` to `true` or `false`
- In `nginx-dashboard/app/dashboard/page-db.js`: Set `USE_API` to `true` or `false`

## License

MIT
EOF < /dev/null