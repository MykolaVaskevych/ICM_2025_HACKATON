/**
 * NGINX Log Monitor
 * 
 * This script continuously monitors NGINX log files for changes and triggers processing.
 * It replaces the Python-based solution with a JavaScript implementation.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// Configuration
const config = {
  logFile: path.resolve(__dirname, 'access.log'),
  updateInterval: 5000, // Polling interval in ms if watch events fail 
  processorScript: path.resolve(__dirname, 'log_processor.js'),
  dashboardScript: path.resolve(__dirname, 'dashboard_data_generator.js')
};

// Process the log file using the log processor
async function processLogs() {
  try {
    console.log('Changes detected, processing logs...');
    await execPromise(`node ${config.processorScript}`);
    console.log('Log processing complete.');
    
    return true;
  } catch (error) {
    console.error('Error processing logs:', error);
    return false;
  }
}

// Update dashboard data
async function updateDashboard() {
  try {
    console.log('Updating dashboard data...');
    await execPromise(`node ${config.dashboardScript}`);
    console.log('Dashboard data updated.');
    
    return true;
  } catch (error) {
    console.error('Error updating dashboard data:', error);
    return false;
  }
}

// Initialize file watcher
function initWatcher() {
  console.log(`Monitoring log file: ${config.logFile}`);
  
  // Ensure the log file exists
  if (!fs.existsSync(config.logFile)) {
    console.warn(`Log file does not exist: ${config.logFile}`);
    console.log('Will continue monitoring for file creation...');
  }
  
  // Set up watcher with chokidar (better cross-platform file watching)
  const watcher = chokidar.watch(config.logFile, {
    persistent: true,
    usePolling: true,
    interval: config.updateInterval,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  // Debounce function to prevent multiple rapid processing
  let processingTimeout = null;
  const debouncedProcess = () => {
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
    
    processingTimeout = setTimeout(async () => {
      const success = await processLogs();
      if (success) {
        await updateDashboard();
      }
    }, 1000);
  };
  
  // Watch for file changes
  watcher
    .on('change', path => {
      console.log(`File changed: ${path}`);
      debouncedProcess();
    })
    .on('add', path => {
      console.log(`File added: ${path}`);
      debouncedProcess();
    })
    .on('error', error => {
      console.error(`Watcher error: ${error}`);
    });
    
  console.log('Watcher initialized, waiting for changes...');
  
  // Initial processing
  debouncedProcess();
}

// Main function
function main() {
  console.log('Starting NGINX log monitor...');
  
  // Check if required modules are installed
  try {
    require.resolve('chokidar');
  } catch (e) {
    console.error('Required module "chokidar" is not installed.');
    console.error('Please install it using: npm install chokidar');
    process.exit(1);
  }
  
  // Initialize file watcher
  initWatcher();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    process.exit(0);
  });
}

// Run the main function
main();