# ICM_2025_HACKATON

## Nginx Log Parser and Dashboard

This project provides tools to parse and analyze Nginx access logs and visualize the data using a Next.js dashboard.

## Components

1. **log_parser.py**: Python script to parse Nginx access logs and generate statistics
2. **dashboard_data_generator.py**: Generates formatted JSON data for the Next.js dashboard
3. **nginx-dashboard/**: Next.js application for visualizing the log data

## Usage

### 1. Parse Nginx Logs

```bash
uv run log_parser.py <path_to_log_file>
```

This will generate:
- `parsed_logs.json`: Contains all parsed log entries
- `log_stats.json`: Contains statistical data about the logs

Options:
- `--output`, `-o`: Specify output file for parsed logs (default: parsed_logs.json)
- `--stats`, `-s`: Specify output file for statistics (default: log_stats.json)

### 2. Generate Dashboard Data

```bash
uv run dashboard_data_generator.py <path_to_log_file>
```

This will generate JSON data files in the `nginx-dashboard/public/data/` directory for use by the dashboard.

Options:
- `--output-dir`, `-o`: Specify output directory for dashboard data (default: nginx-dashboard/public/data)

### 3. Run the Dashboard

```bash
cd nginx-dashboard
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

### 4. Monitor Logs in Real-time

You can continuously monitor the log file for changes and automatically update the dashboard data:

```bash
uv run log_monitor.py <path_to_log_file>
```

Options:
- `--output-dir`, `-o`: Specify output directory for dashboard data (default: nginx-dashboard/public/data)
- `--interval`, `-i`: Polling interval in seconds (default: 60)
- `--run-dashboard`, `-d`: Start the Next.js dashboard server automatically

Example for complete setup:
```bash
uv run log_monitor.py access_log.gz --run-dashboard
```

This will start both the log monitoring process and the Next.js dashboard server.

## Log Parser Features

The parser extracts and analyzes:
- IP addresses
- Timestamps
- HTTP request methods and paths
- Status codes
- Response sizes
- User agents
- Referrers

It provides statistics on:
- Request volume over time
- Distribution of status codes
- Top accessed endpoints
- Top IP addresses
- Top user agents
- Total data transferred

## Dashboard Features

The dashboard visualizes:
- Request volume over time
- Status code distribution
- Top endpoints
- Top IP addresses
- Top user agents
- HTTP method distribution
- Summary statistics

## Requirements

- Python 3.6+
- Node.js 14+ (for dashboard)
- npm (for dashboard)