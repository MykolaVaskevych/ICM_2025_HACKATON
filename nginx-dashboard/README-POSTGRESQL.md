# PostgreSQL Integration for NGINX Dashboard

This guide provides instructions for setting up and using the PostgreSQL database integration with the NGINX log dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
5. [Usage](#usage)
6. [Database Schema](#database-schema)
7. [Import/Export](#importexport)
8. [Administrator Tools](#administrator-tools)
9. [Troubleshooting](#troubleshooting)

## Overview

The NGINX log dashboard now supports PostgreSQL as a data storage backend. This provides several advantages over the previous file-based approach:

- Improved performance for large log volumes
- Better querying capabilities
- Real-time data updates
- Data persistence and reliability
- Advanced filtering and searching

## Features

- **Database Explorer**: Browse tables and view data with pagination
- **SQL Query Interface**: Run custom SQL queries against the database
- **Data Editing**: Inline editing of database records
- **Import/Export**: Import logs from various formats and export to JSON, Excel, PDF, or SQL dump
- **Database Administration**: Configure connection settings, create backups, and restore data
- **Real-time Status**: Monitor database health and connection status

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ and npm
- Access privileges to create database and tables

## Setup

### 1. Install PostgreSQL (if not already installed)

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
# Login as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE nginx_logs;
CREATE USER nginx_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nginx_logs TO nginx_user;
\q
```

### 3. Run Database Setup Script

```bash
cd nginx-dashboard
npm run setup:db
```

This will create the necessary tables and indexes in your PostgreSQL database.

### 4. Configure Connection Settings

Update database connection settings in the admin panel or modify the following files:
- `/nginx-dashboard/app/api/db.js` - API database connection
- `/log_processor.js` - Log processor database connection

## Usage

### Starting the Dashboard with Database Mode

To run the dashboard in database mode:

```bash
npm run dev:db
```

The dashboard will connect to PostgreSQL and display the database status in the interface.

### Switching Between File and Database Mode

You can toggle between file-based and database modes using the Database Status component in the dashboard.

## Database Schema

The PostgreSQL integration uses the following tables:

### `logs`
Stores raw NGINX log entries.

```sql
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
```

### `status_stats`
Aggregates HTTP status code statistics.

```sql
CREATE TABLE status_stats (
  id SERIAL PRIMARY KEY,
  status_code INTEGER NOT NULL,
  count INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### `hourly_stats`
Stores traffic statistics aggregated by hour.

```sql
CREATE TABLE hourly_stats (
  id SERIAL PRIMARY KEY,
  hour TIMESTAMP NOT NULL,
  requests INTEGER NOT NULL,
  bot_requests INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  bytes_transferred BIGINT DEFAULT 0
);
```

### `path_stats`
Tracks path usage statistics.

```sql
CREATE TABLE path_stats (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  count INTEGER NOT NULL,
  last_accessed TIMESTAMP DEFAULT NOW()
);
```

### `user_agents`
Catalogs user agents and identifies bots.

```sql
CREATE TABLE user_agents (
  id SERIAL PRIMARY KEY,
  user_agent TEXT UNIQUE NOT NULL,
  is_bot BOOLEAN DEFAULT FALSE,
  count INTEGER DEFAULT 1,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);
```

## Import/Export

### Importing Data

The dashboard supports importing from:
- Raw NGINX logs (.log, .txt)
- Compressed logs (.gz)
- JSON data
- SQL database dumps

To import data:
1. Navigate to the Import/Export tab
2. Select "From File" or "From Database"
3. Choose your file or database source
4. Click Import

### Exporting Data

You can export your log data to:
- JSON format
- Excel spreadsheet
- PDF report with tables and charts
- Compressed archive (.gz)
- SQL database dump

To export data:
1. Navigate to the Import/Export tab
2. Select "To File" or "To Database"
3. Choose your export format
4. Click Export

## Administrator Tools

The database administration page provides tools for:

- Configuring database connection settings
- Viewing database statistics and health
- Creating database backups
- Restoring from backups

Access the admin panel at `/admin`.

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify PostgreSQL is running
- Check connection credentials
- Ensure the database exists
- Confirm network connectivity

**Slow Query Performance**
- Examine query execution plans
- Ensure indexes are created
- Consider increasing connection pool size

**Import/Export Errors**
- Check file permissions
- Verify file format matches selected import type
- For large files, increase memory limits

### Logs

Check the console logs for error messages and detailed information about database operations.

---

For more advanced usage and customization, refer to the codebase documentation and PostgreSQL documentation.