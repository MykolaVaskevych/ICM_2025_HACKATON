import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Import database functions
import db from '../db';

// Flag to toggle between DB and file-based approach
const USE_DATABASE = true;

// Helper function for API responses
function apiResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

// File-based data handler
async function getFileData(type) {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  
  switch (type) {
    case 'summary':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'summary.json'), 'utf8'));
      
    case 'status':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'status_codes.json'), 'utf8'));
      
    case 'timeline': 
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'requests_timeline.json'), 'utf8'));
      
    case 'daily':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'daily_requests.json'), 'utf8'));
      
    case 'traffic':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'traffic_timeline.json'), 'utf8'));
      
    case 'ips':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'top_ips.json'), 'utf8'));
      
    case 'endpoints':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'top_endpoints.json'), 'utf8'));
      
    case 'errors':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'error_paths.json'), 'utf8'));
      
    case 'bot-user':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'bot_user.json'), 'utf8'));
      
    case 'file-types':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'file_types.json'), 'utf8'));
      
    case 'logs':
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'filtered_logs.json'), 'utf8'));
      
    case 'all': {
      const summary = JSON.parse(fs.readFileSync(path.join(dataDir, 'summary.json'), 'utf8'));
      const statusData = JSON.parse(fs.readFileSync(path.join(dataDir, 'status_codes.json'), 'utf8'));
      const timelineData = JSON.parse(fs.readFileSync(path.join(dataDir, 'requests_timeline.json'), 'utf8'));
      const dailyData = JSON.parse(fs.readFileSync(path.join(dataDir, 'daily_requests.json'), 'utf8'));
      const trafficData = JSON.parse(fs.readFileSync(path.join(dataDir, 'traffic_timeline.json'), 'utf8'));
      const ipsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'top_ips.json'), 'utf8'));
      const endpointsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'top_endpoints.json'), 'utf8'));
      const errorPathsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'error_paths.json'), 'utf8'));
      const botUserData = JSON.parse(fs.readFileSync(path.join(dataDir, 'bot_user.json'), 'utf8'));
      const fileTypesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'file_types.json'), 'utf8'));
      const rawLogsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'filtered_logs.json'), 'utf8'));
      const statusCategories = JSON.parse(fs.readFileSync(path.join(dataDir, 'status_categories.json'), 'utf8'));
      
      return {
        summary,
        statusData,
        timelineData,
        dailyData,
        trafficData,
        ipsData, 
        endpointsData,
        errorPathsData,
        botUserData,
        fileTypesData,
        rawLogsData,
        statusCategories
      };
    }
      
    default:
      throw new Error('Invalid data type requested');
  }
}

// Database-based data handler
async function getDatabaseData(type, params = {}) {
  switch (type) {
    case 'summary':
      return await db.getSummary();
      
    case 'status':
      return await db.getStatusCodes();
      
    case 'timeline':
      return await db.getTimeline(params.timeRange || 'hourly');
      
    case 'daily':
      return await db.getTimeline('daily');
      
    case 'traffic':
      return await db.getTrafficData(params.timeRange || 'hourly');
      
    case 'ips':
      return await db.getTopIPs(params.limit || 100);
      
    case 'endpoints':
      return await db.getTopEndpoints(params.limit || 100);
      
    case 'errors':
      return await db.getErrorPaths(params.limit || 100);
      
    case 'bot-user':
      return await db.getBotUserData();
      
    case 'file-types':
      return await db.getFileTypes(params.limit || 20);
      
    case 'logs':
      return await db.getRawLogs(params.filters || {}, params.limit || 1000);
      
    case 'all':
      // Fetch all data in parallel for dashboard
      const [
        summary,
        statusCodes,
        timeline,
        daily,
        traffic,
        ips,
        endpoints,
        errors,
        botUser,
        fileTypes,
        rawLogs
      ] = await Promise.all([
        db.getSummary(),
        db.getStatusCodes(),
        db.getTimeline('hourly'),
        db.getTimeline('daily'),
        db.getTrafficData('hourly'),
        db.getTopIPs(50),
        db.getTopEndpoints(50),
        db.getErrorPaths(50),
        db.getBotUserData(),
        db.getFileTypes(20),
        db.getRawLogs({}, 1000)
      ]);
      
      // Format summary for compatibility with current dashboard
      const formattedSummary = Object.entries(summary).map(([metric, value]) => ({
        metric: metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        value: value
      }));
      
      // Generate status categories
      const statusCategories = [
        { category: '2xx', count: statusCodes.filter(s => s.status >= 200 && s.status < 300).reduce((sum, s) => sum + s.count, 0) },
        { category: '3xx', count: statusCodes.filter(s => s.status >= 300 && s.status < 400).reduce((sum, s) => sum + s.count, 0) },
        { category: '4xx', count: statusCodes.filter(s => s.status >= 400 && s.status < 500).reduce((sum, s) => sum + s.count, 0) },
        { category: '5xx', count: statusCodes.filter(s => s.status >= 500 && s.status < 600).reduce((sum, s) => sum + s.count, 0) }
      ];
      
      // Generate HTTP methods data if not available
      const httpMethods = rawLogs.reduce((acc, log) => {
        const method = log.method || 'UNKNOWN';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});
      
      const httpMethodsData = Object.entries(httpMethods).map(([method, count]) => ({
        method,
        count
      })).sort((a, b) => b.count - a.count);
      
      return {
        summary: formattedSummary,
        statusData: statusCodes,
        timelineData: timeline,
        dailyData: daily,
        trafficData: traffic,
        ipsData: ips,
        endpointsData: endpoints,
        errorPathsData: errors,
        botUserData: botUser,
        fileTypesData: fileTypes,
        rawLogsData: rawLogs,
        statusCategories: statusCategories,
        httpMethodsData: httpMethodsData
      };
      
    default:
      throw new Error('Invalid data type requested');
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  
  try {
    if (USE_DATABASE) {
      // Database approach (future implementation)
      const params = {
        timeRange: searchParams.get('timeRange'),
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : undefined,
        filters: {
          ip: searchParams.get('ip'),
          status: searchParams.get('status'),
          method: searchParams.get('method'),
          path: searchParams.get('path'),
          date: searchParams.get('date'),
          is_bot: searchParams.has('is_bot') ? searchParams.get('is_bot') === 'true' : undefined
        }
      };
      
      const data = await getDatabaseData(type, params);
      return apiResponse(data);
    } else {
      // File-based approach (current implementation)
      const data = await getFileData(type);
      return apiResponse(data);
    }
  } catch (error) {
    console.error('API Error:', error);
    return apiResponse({ error: 'Server error', message: error.message }, 500);
  }
}

// Handle POST for filtering logs
export async function POST(request) {
  try {
    const data = await request.json();
    
    if (USE_DATABASE) {
      // Database approach
      const logs = await db.getRawLogs(data.filters || {}, data.limit || 1000);
      return apiResponse({ data: logs });
    } else {
      // File-based approach (current implementation)
      const dataDir = path.join(process.cwd(), 'public', 'data');
      const rawLogsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'filtered_logs.json'), 'utf8'));
      
      // Apply filters if provided
      let filteredData = rawLogsData;
      if (data.filters) {
        filteredData = rawLogsData.filter(log => {
          for (const [key, value] of Object.entries(data.filters)) {
            if (value && log[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      return apiResponse({ data: filteredData.slice(0, data.limit || 1000) });
    }
  } catch (error) {
    console.error('API Error:', error);
    return apiResponse({ error: 'Server error', message: error.message }, 500);
  }
}