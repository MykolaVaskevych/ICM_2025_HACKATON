import { NextResponse } from 'next/server';
import { parseLogFile, saveUploadedFile, formatStats } from '../../utils/logParser';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disabling built-in bodyParser for file uploads
  },
};

export async function POST(request) {
  try {
    // Check if request is multipart form data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        error: 'Request must be multipart/form-data', 
        status: 'error'
      }, { status: 400 });
    }
    
    // Get form data and extract file
    const formData = await request.formData();
    const { fileName, fileBuffer } = await saveUploadedFile(formData);
    
    console.log(`Received file: ${fileName}, size: ${fileBuffer.length} bytes`);
    
    // Check if file has valid content
    if (fileBuffer.length === 0) {
      return NextResponse.json({ 
        error: 'File is empty',
        status: 'error'
      }, { status: 400 });
    }
    
    try {
      // Parse the uploaded file (supports any file type - will try to parse as NGINX log)
      console.log(`Attempting to parse file: ${fileName}`);
      const { logs, stats } = await parseLogFile(fileBuffer, fileName);
      
      if (logs.length === 0) {
        return NextResponse.json({ 
          error: 'No valid log entries found in the file',
          status: 'error'
        }, { status: 400 });
      }
      
      console.log(`Successfully parsed ${logs.length} log entries from ${fileName}`);
      
      // Format statistics for dashboard visualizations
      const formattedStats = formatStats(stats);
      
      // Write formatted data to JSON files for the dashboard
      await writeDataFiles(formattedStats, logs.slice(0, 5000)); // Limit to 5000 logs for filtered_logs.json
      
      // Create initialization flag file
      const dataDir = path.join(process.cwd(), 'public', 'data');
      const initFlagPath = path.join(dataDir, '.initialized');
      fs.writeFileSync(initFlagPath, new Date().toISOString());
      
      return NextResponse.json({ 
        message: `Successfully processed ${logs.length} log entries`,
        logsCount: logs.length,
        stats: {
          totalRequests: stats.total_requests,
          uniqueIPs: Object.keys(stats.ip_addresses).length,
          dataTransferred: stats.total_transferred_mb.toFixed(2) + ' MB',
          botPercentage: stats.bot_percentage.toFixed(1) + '%'
        },
        status: 'success'
      });
    } catch (error) {
      console.error(`Processing error for file ${fileName}:`, error);
      return NextResponse.json({ 
        error: `Error processing file ${fileName}: ${error.message}`,
        status: 'error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: `File upload error: ${error.message}`,
      status: 'error'
    }, { status: 500 });
  }
}

/**
 * Write formatted data to JSON files for dashboard visualizations
 */
async function writeDataFiles(formattedStats, filteredLogs) {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write each data file
  const writePromises = [];
  
  // Write summary data
  writePromises.push(writeJsonFile(dataDir, 'summary.json', {
    total_requests: formattedStats.summary.find(s => s.metric === 'Total Requests')?.value || 0,
    total_transferred_mb: parseFloat(formattedStats.summary.find(s => s.metric === 'Data Transferred')?.value || '0'),
    unique_ips: formattedStats.summary.find(s => s.metric === 'Unique IPs')?.value || 0,
    unique_endpoints: formattedStats.top_endpoints.length,
    bot_percentage: parseFloat(formattedStats.summary.find(s => s.metric === 'Bot Traffic')?.value || '0'),
    success_percentage: parseFloat(formattedStats.summary.find(s => s.metric === 'Success Rate')?.value || '0'),
    error_percentage: parseFloat(formattedStats.summary.find(s => s.metric === 'Error Rate')?.value || '0'),
    most_common_status: formattedStats.status_codes[0]?.status || 'None',
    most_common_method: formattedStats.http_methods[0]?.method || 'None',
    most_popular_endpoint: formattedStats.top_endpoints[0]?.endpoint || 'None',
    generated_at: new Date().toISOString()
  }));
  
  // Write individual data files for each chart
  writePromises.push(writeJsonFile(dataDir, 'status_codes.json', formattedStats.status_codes));
  writePromises.push(writeJsonFile(dataDir, 'status_categories.json', formattedStats.status_categories));
  writePromises.push(writeJsonFile(dataDir, 'requests_timeline.json', formattedStats.requests_timeline));
  writePromises.push(writeJsonFile(dataDir, 'daily_requests.json', formattedStats.daily_requests));
  writePromises.push(writeJsonFile(dataDir, 'traffic_timeline.json', formattedStats.traffic_timeline));
  writePromises.push(writeJsonFile(dataDir, 'top_endpoints.json', formattedStats.top_endpoints));
  writePromises.push(writeJsonFile(dataDir, 'top_ips.json', formattedStats.top_ips));
  writePromises.push(writeJsonFile(dataDir, 'bot_user.json', formattedStats.bot_user));
  writePromises.push(writeJsonFile(dataDir, 'http_methods.json', formattedStats.http_methods));
  writePromises.push(writeJsonFile(dataDir, 'file_types.json', formattedStats.file_types));
  writePromises.push(writeJsonFile(dataDir, 'path_depth.json', formattedStats.path_depth));
  writePromises.push(writeJsonFile(dataDir, 'protocols.json', formattedStats.protocols));
  writePromises.push(writeJsonFile(dataDir, 'error_paths.json', formattedStats.error_paths));
  writePromises.push(writeJsonFile(dataDir, 'ip_classification.json', formattedStats.ip_classification));
  writePromises.push(writeJsonFile(dataDir, 'top_referrers.json', formattedStats.top_referrers));
  
  // Write filtered logs
  writePromises.push(writeJsonFile(dataDir, 'filtered_logs.json', filteredLogs));
  
  // Wait for all files to be written
  await Promise.all(writePromises);
}

/**
 * Write data to a JSON file
 */
async function writeJsonFile(directory, filename, data) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(directory, filename);
    
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error(`Error writing ${filename}:`, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}