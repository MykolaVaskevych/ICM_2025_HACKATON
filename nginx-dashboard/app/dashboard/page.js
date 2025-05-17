'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { format } from 'date-fns';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  // State for all data
  const [summaryData, setSummaryData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [trafficData, setTrafficData] = useState([]);
  const [endpointsData, setEndpointsData] = useState([]);
  const [ipsData, setIpsData] = useState([]);
  const [botUserData, setBotUserData] = useState([]);
  const [httpMethodsData, setHttpMethodsData] = useState([]);
  const [statusCategoriesData, setStatusCategoriesData] = useState([]);
  const [fileTypesData, setFileTypesData] = useState([]);
  const [referrersData, setReferrersData] = useState([]);
  const [errorPathsData, setErrorPathsData] = useState([]);
  const [rawLogsData, setRawLogsData] = useState([]);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState({});
  const [filteredLogs, setFilteredLogs] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Add state for data loading errors
  const [loadingError, setLoadingError] = useState(null);
  
  // Add state to track if data has been initialized
  const [initialized, setInitialized] = useState(false);
  
  // Time period display state
  const [timeRange, setTimeRange] = useState('hourly'); // 'hourly', 'daily'
  
  // Only initialize time range from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get saved time range preference
    const savedTimeRange = localStorage.getItem('timeRange');
    
    // Set time range from localStorage
    if (savedTimeRange === 'daily') {
      setTimeRange('daily');
    }
  }, []);

  // Define chart colors
  const chartColors = [
    '#4f46e5', '#059669', '#2563eb', '#7c3aed', '#b91c1c', 
    '#0891b2', '#9333ea', '#16a34a', '#ca8a04', '#c026d3'
  ];

  // Define status code colors
  const statusCodeColors = {
    '2xx': '#16a34a', // Green - Success
    '3xx': '#3b82f6', // Blue - Redirect
    '4xx': '#eab308', // Yellow - Client Error
    '5xx': '#ef4444'  // Red - Server Error
  };

  // Check if data has been initialized
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await fetch('/api/data/status');
        const data = await response.json();
        setInitialized(data.initialized);
      } catch (error) {
        console.error("Error checking data initialization:", error);
        setInitialized(false);
      }
    };
    
    checkInitialization();
  }, []);

  // Fetch data and handle errors
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingError(null);
        
        // Check first if data has been initialized
        const statusResponse = await fetch('/api/data/status');
        const statusData = await statusResponse.json();
        
        if (!statusData.initialized) {
          // No data has been uploaded yet, set initialized state to false
          setInitialized(false);
          setLoading(false);
          return;
        }
        
        // Data is initialized, proceed with fetch
        setInitialized(true);
        
        const [
          summary, statusCodes, timeline, daily, traffic, endpoints, 
          ips, botUser, methods, categories, fileTypes, referrers, 
          errorPaths, logs
        ] = await Promise.all([
          fetch('/data/summary.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch summary data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/status_codes.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch status codes data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/requests_timeline.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch timeline data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/daily_requests.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch daily data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/traffic_timeline.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch traffic data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/top_endpoints.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch endpoints data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/top_ips.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch IPs data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/bot_user.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch bot/user data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/http_methods.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch HTTP methods data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/status_categories.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch status categories data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/file_types.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch file types data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/top_referrers.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch referrers data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/error_paths.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch error paths data: ${res.status}`);
            return res.json();
          }),
          fetch('/data/filtered_logs.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch logs data: ${res.status}`);
            return res.json();
          }),
        ]);

        setSummaryData(summary);
        setStatusData(statusCodes);
        setTimelineData(timeline);
        setDailyData(daily);
        setTrafficData(traffic);
        setEndpointsData(endpoints);
        setIpsData(ips);
        setBotUserData(botUser);
        setHttpMethodsData(methods);
        setStatusCategoriesData(categories);
        setFileTypesData(fileTypes);
        setReferrersData(referrers);
        setErrorPathsData(errorPaths);
        setRawLogsData(logs);
        setFilteredLogs(logs);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoadingError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters to logs
  useEffect(() => {
    if (!rawLogsData || !activeFilters || Object.keys(activeFilters).length === 0) {
      setFilteredLogs(rawLogsData);
      return;
    }

    const filtered = rawLogsData.filter(log => {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        
        // Handle search query separately
        if (key === 'searchQuery') {
          const query = value.toLowerCase();
          const searchables = [
            log.path, 
            log.ip, 
            log.user_agent, 
            log.method
          ].filter(Boolean);
          
          if (!searchables.some(field => 
            field && field.toLowerCase().includes(query)
          )) {
            return false;
          }
          continue;
        }
        
        // Handle boolean filters
        if (key === 'isBot') {
          if (value === 'true' && !log.is_bot) return false;
          if (value === 'false' && log.is_bot) return false;
          continue;
        }
        
        // Handle status code filter - convert to string for comparison
        if (key === 'status' || key === 'statusCode') {
          if (String(log.status) !== String(value)) {
            return false;
          }
          continue;
        }
        
        // Handle other filters
        if (log[key] !== value) {
          return false;
        }
      }
      return true;
    });
    
    setFilteredLogs(filtered);
  }, [rawLogsData, activeFilters]);

  // Format timestamps for timeline charts
  const formatTimelineDataFn = (data) => {
    return (data || []).map(point => {
      // Extract hour from the timestamp (format: "YYYY-MM-DD HH:00")
      const parts = point.hour.split(' ');
      if (parts.length === 2) {
        return {
          ...point,
          hour: parts[1], // Just show the hour:minute
          fullTime: point.hour // Keep the full timestamp for tooltips
        };
      }
      return point;
    });
  };
  
  // Memoized formatted timeline data
  const formattedTimelineData = useMemo(() => formatTimelineDataFn(timelineData), [timelineData]);

  const formatTrafficData = useMemo(() => {
    return (trafficData || []).map(point => {
      // Extract hour from the timestamp (format: "YYYY-MM-DD HH:00")
      const parts = point.hour.split(' ');
      if (parts.length === 2) {
        return {
          ...point,
          hour: parts[1], // Just show the hour:minute
          fullTime: point.hour // Keep the full timestamp for tooltips
        };
      }
      return point;
    });
  }, [trafficData]);
  
  // Format daily data for better readability
  const formatDailyData = useMemo(() => {
    return (dailyData || []).map(point => {
      // Format date for display (YYYY-MM-DD -> MM/DD)
      const dateParts = point.date.split('-');
      if (dateParts.length === 3) {
        return {
          ...point,
          date: `${dateParts[1]}/${dateParts[2]}`, // MM/DD format
          fullDate: point.date // Keep full date for tooltips
        };
      }
      return point;
    });
  }, [dailyData]);

  // Format status code data for better visualization
  const formattedStatusData = useMemo(() => {
    return (statusData || []).map(item => {
      const code = parseInt(item.status);
      let category = '';
      let color = '';
      
      if (code >= 200 && code < 300) {
        category = 'Success';
        color = statusCodeColors['2xx'];
      } else if (code >= 300 && code < 400) {
        category = 'Redirect';
        color = statusCodeColors['3xx'];
      } else if (code >= 400 && code < 500) {
        category = 'Client Error';
        color = statusCodeColors['4xx'];
      } else if (code >= 500 && code < 600) {
        category = 'Server Error';
        color = statusCodeColors['5xx'];
      }
      
      return {
        ...item,
        label: `${item.status} - ${category}`,
        color
      };
    });
  }, [statusData]);

  // These are the columns for the raw logs table
  const logTableColumns = [
    { key: 'timestamp', label: 'Time', render: (value) => value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') : 'N/A' },
    { key: 'ip', label: 'IP Address' },
    { key: 'method', label: 'Method' },
    { key: 'path', label: 'Path' },
    { key: 'status', label: 'Status', render: (value) => {
      const code = parseInt(value);
      let color = 'text-gray-600 dark:text-gray-400';
      
      if (code >= 200 && code < 300) color = 'text-green-600 dark:text-green-400';
      else if (code >= 300 && code < 400) color = 'text-blue-600 dark:text-blue-400';
      else if (code >= 400 && code < 500) color = 'text-yellow-600 dark:text-yellow-400';
      else if (code >= 500) color = 'text-red-600 dark:text-red-400';
      
      const handleStatusClick = () => {
        handleApplyFilters({ status: value });
      };
      
      return (
        <button 
          onClick={handleStatusClick}
          className={`${color} hover:underline focus:outline-none`}
        >
          {value}
        </button>
      );
    }},
    { key: 'bytes', label: 'Size', render: (value) => `${Math.round(value / 1024)} KB` },
    { key: 'is_bot', label: 'Bot', render: (value) => value ? 'Yes' : 'No' }
  ];

  // Computed filters based on available data
  const availableFilters = useMemo(() => {
    if (!rawLogsData || rawLogsData.length === 0) return [];

    return [
      {
        key: 'searchQuery',
        label: 'Search',
        type: 'text',
        placeholder: 'Search in requests...'
      },
      {
        key: 'statusCode',
        label: 'Status Code',
        type: 'select',
        options: [
          { value: '200', label: '200 - OK' },
          { value: '201', label: '201 - Created' },
          { value: '301', label: '301 - Moved Permanently' },
          { value: '302', label: '302 - Found' },
          { value: '400', label: '400 - Bad Request' },
          { value: '403', label: '403 - Forbidden' },
          { value: '404', label: '404 - Not Found' },
          { value: '500', label: '500 - Internal Server Error' }
        ]
      },
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: httpMethodsData.map(method => ({
          value: method.method,
          label: method.method
        }))
      },
      {
        key: 'isBot',
        label: 'Bot Traffic',
        type: 'select',
        options: [
          { value: 'true', label: 'Bot Traffic Only' },
          { value: 'false', label: 'Human Traffic Only' }
        ]
      },
      {
        key: 'fileExtension',
        label: 'File Type',
        type: 'select',
        options: fileTypesData.slice(0, 10).map(type => ({
          value: type.type,
          label: type.type
        }))
      }
    ];
  }, [rawLogsData, httpMethodsData, fileTypesData]);

  // Handle filter application
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setActiveFilters({});
  };

  // Toggle between hourly and daily view with localStorage persistence
  const toggleTimeRange = () => {
    const newTimeRange = timeRange === 'hourly' ? 'daily' : 'hourly';
    setTimeRange(newTimeRange);
    localStorage.setItem('timeRange', newTimeRange);
  };

  // Use the theme context
  const { darkMode, toggleDarkMode } = useTheme();
  
  // Handle file upload for empty state
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Clear previous status
    setLoadingError(null);
    setLoading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Refresh the page to show data
        window.location.reload();
      } else {
        setLoadingError(`Error: ${result.error || 'Failed to process file'}`);
      }
    } catch (error) {
      setLoadingError(`Error importing file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mt-4">Loading dashboard data...</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the log analysis data.</p>
        </div>
      </div>
    );
  }
  
  // If no data has been uploaded yet, show welcome screen
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">NGINX Log Analyzer Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Welcome to the NGINX Log Analyzer. To get started, please import your log files.</p>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Import Logs</h2>
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supported formats: JSON, text logs (.txt, .log), files without extensions, and gzip (.gz) log files.
              </p>
              <label className="block text-sm font-medium cursor-pointer px-6 py-3 border border-indigo-300 dark:border-indigo-600 rounded-md bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors text-center w-full max-w-xs">
                <span>Choose Log File</span>
                <input
                  type="file"
                  accept=".json,.txt,.log,.gz,*"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={loading}
                />
              </label>
              {loadingError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-md text-sm">
                  {loadingError}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>After importing, the dashboard will display comprehensive visualizations of your NGINX log data.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-red-500 dark:text-red-400 text-5xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Failed to load dashboard data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{loadingError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition duration-200">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NGINX Log Analyzer</h1>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {summaryData?.generated_at && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {format(new Date(summaryData.generated_at), 'yyyy-MM-dd HH:mm:ss')}
            </p>
          )}
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <DashboardContent 
          timeRange={timeRange}
          toggleTimeRange={toggleTimeRange}
          summaryData={summaryData}
          statusData={statusData}
          timelineData={timelineData}
          dailyData={dailyData}
          trafficData={trafficData}
          endpointsData={endpointsData}
          ipsData={ipsData}
          botUserData={botUserData}
          httpMethodsData={httpMethodsData}
          statusCategoriesData={statusCategoriesData}
          fileTypesData={fileTypesData}
          referrersData={referrersData}
          errorPathsData={errorPathsData}
          rawLogsData={rawLogsData}
          filteredLogs={filteredLogs}
          activeFilters={activeFilters}
          handleApplyFilters={handleApplyFilters}
          handleResetFilters={handleResetFilters}
          availableFilters={availableFilters}
          formattedTimelineData={formattedTimelineData}
          formatTimelineDataFn={formatTimelineDataFn}
          formatTrafficData={formatTrafficData}
          formatDailyData={formatDailyData}
          statusCodeColors={statusCodeColors}
          chartColors={chartColors}
          logTableColumns={logTableColumns}
        />
      </main>
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:order-1">
              <p className="text-center text-base text-gray-500 dark:text-gray-400">
                NGINX Log Analyzer Dashboard - ICM 2025 HACKATON
              </p>
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-1">
                Analyzing {summaryData?.total_requests.toLocaleString() || 0} requests from NGINX logs
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}