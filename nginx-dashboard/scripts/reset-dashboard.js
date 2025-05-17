/**
 * This script resets the dashboard to its initial state by removing any 
 * uploaded data and the initialization flag.
 */

const fs = require('fs');
const path = require('path');

// Path to the data directory
const dataDir = path.join(process.cwd(), 'public', 'data');

// List of data files that should be present when the dashboard starts
const dataFiles = [
  'summary.json',
  'status_codes.json',
  'status_categories.json',
  'requests_timeline.json',
  'daily_requests.json',
  'traffic_timeline.json',
  'top_endpoints.json',
  'top_ips.json',
  'bot_user.json',
  'http_methods.json',
  'file_types.json',
  'path_depth.json',
  'protocols.json',
  'error_paths.json',
  'ip_classification.json',
  'top_referrers.json',
  'filtered_logs.json',
];

// Path to the initialization flag
const initFlagPath = path.join(dataDir, '.initialized');

function resetDashboard() {
  console.log('Resetting dashboard data...');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }
  
  // Remove initialization flag if it exists
  if (fs.existsSync(initFlagPath)) {
    fs.unlinkSync(initFlagPath);
    console.log('Removed initialization flag.');
  }
  
  // Create empty placeholder files for each data file
  dataFiles.forEach(fileName => {
    // For most files, use an empty array
    let emptyData = [];
    
    // For summary.json, use an empty object with required fields
    if (fileName === 'summary.json') {
      emptyData = {
        total_requests: 0,
        total_transferred_mb: 0,
        unique_ips: 0,
        unique_endpoints: 0,
        bot_percentage: 0,
        success_percentage: 0,
        error_percentage: 0,
        most_common_status: 'None',
        most_common_method: 'None',
        most_popular_endpoint: 'None',
        generated_at: new Date().toISOString()
      };
    }
    
    // For filtered_logs.json, use an empty array
    if (fileName === 'filtered_logs.json') {
      emptyData = [];
    }
    
    // Write the empty data to the file
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(emptyData, null, 2));
    console.log(`Created empty ${fileName}`);
  });
  
  console.log('Dashboard reset complete. The dashboard will now start in an empty state.');
}

// Run the reset function
resetDashboard();