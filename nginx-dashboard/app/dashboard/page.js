'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { format } from 'date-fns';
import DashboardContent from './DashboardContent';

// Always use API for data fetching

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
  
  // Time period display state
  const [timeRange, setTimeRange] = useState('hourly'); // 'hourly', 'daily'
  
  // Sample data for metrics comparison radar chart
  const [metricsComparisonData, setMetricsComparisonData] = useState([{
    current: {
      requestCount: 4250,
      avgResponseTime: 180,
      errorRate: 2.3,
      trafficVolume: 256,
      uniqueVisitors: 1560
    },
    previous: {
      requestCount: 3890,
      avgResponseTime: 210,
      errorRate: 3.1,
      trafficVolume: 230,
      uniqueVisitors: 1420
    }
  }]);
  
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

  // Fetch data from API
  const fetchFromAPI = async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      
      // Fetch all data at once
      const response = await fetch('/api/data?type=all');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set all the data with default values if missing
      setSummaryData(data.summary || {
        total_requests: 0,
        total_bytes: 0,
        error_count: 0,
        unique_visitors: 0,
        avg_response_time: 0,
        success_rate: 100
      });
      setStatusData(data.statusData || []);
      setTimelineData(data.timelineData || []);
      setDailyData(data.dailyData || []);
      setTrafficData(data.trafficData || []);
      setEndpointsData(data.endpointsData || []);
      setIpsData(data.ipsData || []);
      setBotUserData(data.botUserData || [{type: 'Bot', count: 0}, {type: 'User', count: 0}]);
      setStatusCategoriesData(data.statusCategories || []);
      setFileTypesData(data.fileTypesData || []);
      setRawLogsData(data.rawLogsData || []);
      setFilteredLogs(data.rawLogsData || []);
      
      // Derive HTTP methods from raw logs if not provided directly
      if (!data.httpMethodsData) {
        const methodCounts = data.rawLogsData.reduce((acc, log) => {
          const method = log.method || 'UNKNOWN';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {});
        
        const httpMethods = Object.entries(methodCounts).map(([method, count]) => ({
          method,
          count
        })).sort((a, b) => b.count - a.count);
        
        setHttpMethodsData(httpMethods);
      } else {
        setHttpMethodsData(data.httpMethodsData);
      }
      
      // Derive referrers from raw logs if not provided directly
      if (!data.referrersData) {
        const referrerCounts = data.rawLogsData.reduce((acc, log) => {
          const referrer = log.referrer || '-';
          acc[referrer] = (acc[referrer] || 0) + 1;
          return acc;
        }, {});
        
        const referrers = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({
            referrer,
            count
          }))
          .sort((a, b) => b.count - a.count);
        
        setReferrersData(referrers);
      } else {
        setReferrersData(data.referrersData);
      }
    } catch (error) {
      console.error('Error fetching data from API:', error);
      setLoadingError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data from API
  const refreshData = async () => {
    try {
      await fetchFromAPI();
      return true;
    } catch (error) {
      console.error('Error refreshing data:', error);
      return false;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchFromAPI();
  }, []);

  // Log table column definitions
  const logTableColumns = [
    { key: 'timestamp', label: 'Time', render: (value) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss') },
    { key: 'ip', label: 'IP Address' },
    { key: 'method', label: 'Method' },
    { key: 'path', label: 'Path' },
    { 
      key: 'status', 
      label: 'Status', 
      render: (value) => {
        let color = '';
        const status = parseInt(value);
        
        if (status >= 200 && status < 300) color = 'text-green-600 dark:text-green-400';
        else if (status >= 300 && status < 400) color = 'text-blue-600 dark:text-blue-400';
        else if (status >= 400 && status < 500) color = 'text-yellow-600 dark:text-yellow-400';
        else if (status >= 500) color = 'text-red-600 dark:text-red-400';
        
        return <span className={color}>{value}</span>;
      }
    },
    { key: 'bytes', label: 'Size (B)' },
    { 
      key: 'is_bot', 
      label: 'Bot', 
      render: (value) => {
        return value ? 
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Yes</span> : 
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">No</span>;
      }
    }
  ];
  
  // Function to apply filters to raw logs
  const handleApplyFilters = (filters) => {
    // Merge with existing filters or replace
    const newFilters = { ...activeFilters, ...filters };
    setActiveFilters(newFilters);
    
    // Apply the filters to raw logs
    const filtered = rawLogsData.filter(log => {
      for (const [key, value] of Object.entries(newFilters)) {
        // Skip empty filter values
        if (!value) continue;
        
        // Special handling for path (partial match)
        if (key === 'path' && log.path) {
          if (!log.path.includes(value)) return false;
          continue;
        }
        
        // Check if log entry has the filter property and it matches
        if (log[key] === undefined || log[key] !== value) {
          return false;
        }
      }
      return true;
    });
    
    setFilteredLogs(filtered);
  };
  
  // Function to reset all filters
  const handleResetFilters = () => {
    setActiveFilters({});
    setFilteredLogs(rawLogsData);
  };
  
  // Available filters for the filter panel
  const availableFilters = [
    { id: 'status', label: 'Status Code', type: 'select', options: statusData.map(s => ({ value: s.status, label: s.status })) },
    { id: 'method', label: 'HTTP Method', type: 'select', options: httpMethodsData.map(m => ({ value: m.method, label: m.method })) },
    { id: 'path', label: 'Path', type: 'text' },
    { id: 'ip', label: 'IP Address', type: 'text' },
    { id: 'is_bot', label: 'Bot Traffic', type: 'select', options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ]}
  ];
  
  // Format and memoize timeline data for hourly view
  const formatTimelineDataFn = (data) => {
    if (!data || data.length === 0) return [];
    
    return data.map(point => ({
      hour: point.hour || '',
      count: parseInt(point.count) || 0,
      fullTime: point.fullTime || ''
    }));
  };
  
  // Memoize the formatted timeline data
  const formattedTimelineData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return [];
    
    // Ensure we have all required fields
    const formatted = formatTimelineDataFn(timelineData);
    
    // Debug log
    console.log(`Formatted ${formatted.length} timeline data points`);
    
    return formatted;
  }, [timelineData]);
  
  // Format traffic data for visualization
  const formatTrafficData = useMemo(() => {
    if (!trafficData || trafficData.length === 0) return [];
    
    const formatted = trafficData.map(point => ({
      hour: point.hour || '',
      megabytes: parseFloat(point.megabytes) || 0,
      fullTime: point.fullTime || ''
    }));
    
    // Debug log
    console.log(`Formatted ${formatted.length} traffic data points`);
    
    return formatted;
  }, [trafficData]);
  
  // Format daily data for visualization
  const formatDailyData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    
    const formatted = dailyData.map(point => ({
      date: point.date || '',
      count: parseInt(point.count) || 0,
      fullDate: point.fullDate || ''
    }));
    
    // Debug log
    console.log(`Formatted ${formatted.length} daily data points`);
    
    return formatted;
  }, [dailyData]);
  
  // Toggle time range between hourly and daily
  const toggleTimeRange = () => {
    const newTimeRange = timeRange === 'hourly' ? 'daily' : 'hourly';
    setTimeRange(newTimeRange);
    
    // Save preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeRange', newTimeRange);
    }
  };
  
  // Access the theme
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Loading dashboard data...</h2>
          {loadingError && (
            <div className="mt-4 text-red-500">
              Error: {loadingError}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <main>
      <div className="pb-20">
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
          metricsComparisonData={metricsComparisonData}
        />
      </div>
    </main>
  );
}