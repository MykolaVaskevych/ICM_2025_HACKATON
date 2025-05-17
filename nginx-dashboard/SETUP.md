# NGINX Dashboard Setup Guide

This guide provides step-by-step instructions for setting up the NGINX Dashboard application on both macOS and Windows environments.

## Prerequisites

Before starting the setup, make sure you have the following software installed:

- Node.js (v16 or later) and npm
- PostgreSQL (v14 or later)
- Git

## Installation Steps

### Clone the Repository

```bash
git clone <repository-url>
cd nginx-dashboard
```

### Install Dependencies

```bash
npm install
```

## Database Setup

### macOS

1. **Install PostgreSQL (if not already installed)**

   Using Homebrew:
   ```bash
   brew install postgresql@14
   brew services start postgresql
   ```

   Or download from the official website: https://www.postgresql.org/download/macosx/

2. **Create Database and User**

   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database (inside PostgreSQL prompt)
   CREATE DATABASE nginx_logs;
   
   # Exit PostgreSQL
   \q
   ```

3. **Run Database Setup Script**

   ```bash
   # Make the script executable
   chmod +x setup-postgres.sh
   
   # Run the setup script
   ./setup-postgres.sh
   ```

   Note: The script will use your current OS user to connect to PostgreSQL.

### Windows

1. **Install PostgreSQL (if not already installed)**

   Download and install from: https://www.postgresql.org/download/windows/
   
   During installation:
   - Remember the password you set for the 'postgres' user
   - Keep the default port (5432)
   - Launch Stack Builder when prompted at the end of the installation

2. **Create Database**

   Using pgAdmin (GUI):
   - Open pgAdmin 4 from Start Menu
   - Connect to the PostgreSQL server (enter password when prompted)
   - Right-click on "Databases" → "Create" → "Database"
   - Enter "nginx_logs" as the database name and save

   Or using command line:
   ```cmd
   psql -U postgres
   CREATE DATABASE nginx_logs;
   \q
   ```

3. **Run Database Setup Script**

   ```cmd
   # Navigate to the project directory
   cd path\to\nginx-dashboard
   
   # Run the script
   npm run setup:db
   ```

## Configuration

### Database Connection

1. The application is configured to connect to PostgreSQL using your current OS username. If you need to change this:

   Open `app/api/db.js` and update the connection configuration:

   ```javascript
   const pool = new Pool({
     host: 'localhost',
     port: 5432,
     database: 'nginx_logs',
     user: 'your_username', // Update this line
     password: 'your_password', // Add this line if needed
   });
   ```

### Environment Variables (Optional)

1. Create a `.env.local` file in the project root to override default settings:

   ```
   # PostgreSQL Connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nginx_logs
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Application Settings
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

## Starting the Application

### Development Mode

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Loading Log Data

There are several ways to load NGINX log data into the dashboard:

1. **Import from file**: Use the Import/Export panel in the dashboard UI to import log files (supports .log, .gz, .json)

2. **Process logs directly**: 
   ```bash
   npm run process:logs
   ```
   
   This script expects log files to be in the project root with name `access.log` or `access.log.gz`

3. **Database import**: If you have existing log data in a PostgreSQL database, you can import it through the dashboard UI

## Troubleshooting

### PostgreSQL Connection Issues

If you encounter connection issues:

1. Verify PostgreSQL is running:
   - macOS: `brew services list` or `pg_isready`
   - Windows: Check Services app to ensure PostgreSQL service is running

2. Check credentials:
   - Ensure the database user has proper permissions
   - Verify the password is correct
   - On macOS, ensure your user has access to PostgreSQL

3. Run the database connection test script:
   ```bash
   node check-db-connection.js
   ```

### Application Errors

1. **Port already in use**: If port 3000 is already in use, you can specify a different port:
   ```bash
   npm run dev -- -p 3001
   ```

2. **Module not found errors**: Ensure all dependencies are installed:
   ```bash
   npm install
   ```

3. **Database tables not found**: Run the database initialization script:
   ```bash
   npm run setup:db
   ```

## Additional Scripts

- `npm run process:logs:dev`: Process logs with auto-reload on file changes
- `npm run generate:data`: Generate mock data for testing
- `npm run monitor`: Start log monitoring service
- `npm run admin`: Start admin dashboard for database management

## Support

For additional help, please create an issue in the GitHub repository or contact the development team.