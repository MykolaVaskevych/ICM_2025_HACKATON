# NGINX Dashboard

A comprehensive analytics dashboard for NGINX log files, built with Next.js and PostgreSQL.

![NGINX Dashboard](https://example.com/dashboard-preview.png)

## Features

- **Real-Time Analytics**: Visualize NGINX log data with interactive charts and graphs
- **PostgreSQL Integration**: Store and query log data using PostgreSQL
- **Log Processing**: Import and process raw NGINX logs, including compressed (.gz) files
- **Traffic Analysis**: Identify patterns, traffic spikes, and anomalies
- **Error Monitoring**: Track and analyze HTTP error codes and problematic endpoints
- **Bot Detection**: Identify and filter bot traffic from human visitors
- **Export Capabilities**: Export data in various formats (JSON, Excel, PDF, compressed)
- **Database Explorer**: Explore and manage database tables directly from the interface
- **Responsive Design**: Works across desktop and mobile devices

## Getting Started

For detailed installation instructions, see [SETUP.md](SETUP.md).

### Quick Start

1. **Prerequisites**
   - Node.js (v16+)
   - PostgreSQL (v14+)

2. **Installation**
   ```bash
   # Install dependencies
   npm install
   
   # Set up PostgreSQL database
   ./setup-postgres.sh
   
   # Start development server
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Processing NGINX Logs

The dashboard can process logs in several ways:

```bash
# Process log files directly (access.log or access.log.gz)
npm run process:logs

# Watch for log file changes
npm run monitor
```

You can also import logs through the dashboard UI.

## Data Generation

For testing purposes, you can generate sample log data:

```bash
npm run generate:data
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, D3.js
- **Backend**: Node.js, PostgreSQL
- **Data Processing**: Custom log parser, streaming compression/decompression
- **Visualization**: Interactive charts with D3.js
- **Reporting**: PDF generation with jsPDF

## License

This project is open source under the MIT license.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
