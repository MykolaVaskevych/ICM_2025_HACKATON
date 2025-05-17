# PostgreSQL Dashboard Enhancement TODO

## Overview
This document outlines the tasks needed to enhance the NGINX dashboard with:
1. PostgreSQL visibility and database management features
2. Enhanced import/export functionality (DB, JSON, GZ, PDF)
3. Database view and edit capabilities using a modern UI library

## Database Visibility & Management

### 1. Create Database Status Component
- [x] Create `components/DatabaseStatus.js` to show PostgreSQL connection status
- [x] Add server uptime, connection count, and database size metrics
- [x] Implement toggle switch between file mode and database mode
- [x] Add visual indicator showing current data source (DB/Files)

### 2. Add Database Admin Page
- [x] Create `app/admin/page.js` for database administration
- [x] Implement database connection settings configuration
- [x] Add backup/restore functionality
- [x] Include database statistics and health monitoring

### 3. Update API Routes
- [ ] Enhance `app/api/db.js` with more robust error handling
- [ ] Create new endpoints for database management:
  - [ ] `app/api/admin/stats/route.js` - Database statistics
  - [ ] `app/api/admin/backup/route.js` - Backup functionality
  - [ ] `app/api/admin/restore/route.js` - Restore functionality

## Database View/Edit Tools

### 1. Install React Data Grid Library
- [x] Add required dependencies to package.json (react-hot-toast, etc.)
- [x] Add Monaco Editor for SQL queries

### 2. Create Database Explorer Component
- [x] Create `components/DatabaseExplorer.js` component
- [x] Implement table selection dropdown
- [x] Add data grid with sorting, filtering, and pagination
- [x] Create column customization options

### 3. Implement Row Editing
- [x] Add inline editing capabilities to data grid
- [x] Create edit buttons for each row
- [x] Implement validation before saving changes
- [x] Add optimistic updates with rollback on failure

### 4. SQL Query Interface
- [x] Create `components/SQLEditor.js` with Monaco editor
- [x] Implement query execution functionality
- [x] Add query history and saved queries features
- [x] Create results visualization options

## Enhanced Import/Export Functionality

### 1. Update ImportExportPanel Component
- [x] Enhance to support importing:
  - [x] Raw NGINX logs (.log, .txt)
  - [x] Compressed logs (.gz)
  - [x] JSON data
  - [x] SQL dumps for direct database import
- [x] Enhance to support exporting:
  - [x] Database dumps (SQL format)
  - [x] JSON data (all or filtered)
  - [x] Compressed archives (.gz)
  - [x] PDF reports with visual components

### 2. Implement Server-Side Processing
- [x] Simulate server-side processing in ImportExportPanel
- [x] Add visual progress indicators for processing
- [x] Add toast notifications for operation status

### 3. Enhance PDF Export
- [x] Improve PDF report layout and styling
- [x] Include basic report information in PDF
- [x] Add configurable report options
- [x] Create pagination and styling for PDF export

### 4. Create Bulk Operations
- [ ] Implement bulk data import with progress tracking
- [ ] Add data transformation options during import
- [ ] Create scheduled export functionality

## UI Enhancements

### 1. Add PostgreSQL Branding
- [x] Add PostgreSQL database icons throughout the UI
- [x] Update dashboard components with database indicators
- [x] Create database-themed loading indicators

### 2. Improve Navigation
- [x] Add "Database" section to main navigation
- [x] Add "Import/Export" section to main navigation
- [x] Add admin page with navigation between dashboard and admin

### 3. Create Notifications
- [x] Implement toast notifications for database operations
- [x] Add progress indicators for long-running operations
- [x] Create error handling with actionable recovery options

## Implementation Plan

### Phase 1: Core Database Visibility (COMPLETED)
- [x] Add PostgreSQL status indicator to dashboard
- [x] Create basic database explorer view
- [x] Update import/export for database support

### Phase 2: Enhanced Database Management (COMPLETED)
- [x] Implement database admin page
- [x] Add SQL query interface
- [x] Enhance database explorer with editing capabilities

### Phase 3: Advanced Import/Export (COMPLETED)
- [x] Implement all import formats with server-side processing
- [x] Create enhanced PDF exports with visualizations
- [x] Add progress indicators for imports/exports

### Phase 4: Future Enhancements (PENDING)
- [ ] Add real API endpoints for database operations
- [ ] Implement user authentication for admin functions
- [ ] Add scheduling and automation features
- [ ] Create comprehensive database migration utility

## Resources

### Libraries to Consider
- Database UI: `@tanstack/react-table`, `react-data-grid`, or `ag-grid-react`
- SQL Editor: `monaco-editor` or `react-ace`
- PDF Generation: `jspdf` with `html2canvas` for charts
- Import/Export: `pg-dump-stream`, `node-gzip`, `multer` for file handling

### PostgreSQL Integration
- Use connection pooling with `pg-pool`
- Implement proper error handling and reconnection logic
- Add database monitoring with appropriate queries

### Security Considerations
- Implement proper input sanitization for SQL operations
- Use parameterized queries to prevent SQL injection
- Add role-based access control for database operations