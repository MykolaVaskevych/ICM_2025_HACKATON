'use client';

import { useMemo } from 'react';
import D3Chart from './D3Chart';
import DataTable from './DataTable';

export default function ErrorAnalysis({
  statusData,
  timelineData, 
  dailyData,
  errorPathsData,
  rawLogsData,
  timeRange,
  formatTimelineDataFn,
  formattedTimelineData,
  formatDailyData,
  statusCodeColors,
  handleApplyFilters = () => {}
}) {
  // Get error-only status codes
  const errorStatusData = useMemo(() => {
    return (statusData || [])
      .filter(s => parseInt(s.status) >= 400)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [statusData]);

  // Calculate error timeline
  const errorTimelineData = useMemo(() => {
    if (timeRange === 'hourly') {
      // Use the pre-formatted timeline data
      return formattedTimelineData.map(point => {
        const matchingLogs = rawLogsData.filter(log => {
          if (!log.timestamp) return false;
          const logHour = new Date(log.timestamp).getHours() + ':00';
          return logHour === point.hour && parseInt(log.status) >= 400;
        });
        return {
          hour: point.hour,
          count: matchingLogs.length,
          fullTime: point.fullTime
        };
      });
    } else {
      return formatDailyData.map(point => {
        const matchingLogs = rawLogsData.filter(log => {
          if (!log.timestamp) return false;
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          return logDate === point.fullDate && parseInt(log.status) >= 400;
        });
        return {
          date: point.date,
          count: matchingLogs.length,
          fullDate: point.fullDate
        };
      });
    }
  }, [timeRange, timelineData, dailyData, rawLogsData, formattedTimelineData, formatDailyData]);

  // Enhanced columns for error paths with status code info
  const errorColumns = [
    { key: 'path', label: 'Path' },
    { key: 'count', label: 'Error Count' },
    { 
      key: 'status', 
      label: 'Common Status',
      render: (_, item) => {
        const statuses = rawLogsData
          .filter(log => log.path === item.path && parseInt(log.status) >= 400)
          .reduce((acc, log) => {
            acc[log.status] = (acc[log.status] || 0) + 1;
            return acc;
          }, {});
        const topStatus = Object.entries(statuses).sort((a, b) => b[1] - a[1])[0];
        
        if (!topStatus) return 'Unknown';
        
        const code = parseInt(topStatus[0]);
        let color = 'text-gray-600 dark:text-gray-400';
        
        if (code >= 400 && code < 500) color = 'text-yellow-600 dark:text-yellow-400';
        else if (code >= 500) color = 'text-red-600 dark:text-red-400';
        
        return <span className={color}>{topStatus[0]}</span>;
      }
    }
  ];

  // Calculate error distribution by type (4xx vs 5xx)
  const errorTypeDistribution = useMemo(() => {
    const distribution = { '4xx': 0, '5xx': 0 };
    
    (statusData || []).forEach(s => {
      const code = parseInt(s.status);
      if (code >= 400 && code < 500) distribution['4xx'] += s.count;
      else if (code >= 500) distribution['5xx'] += s.count;
    });
    
    return [
      { type: 'Client Errors (4xx)', count: distribution['4xx'] },
      { type: 'Server Errors (5xx)', count: distribution['5xx'] }
    ];
  }, [statusData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Distribution by Code */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Error Status Distribution
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart 
              data={errorStatusData}
              type="bar"
              xKey="status"
              yKey="count"
              xLabel="Status Code"
              yLabel="Count"
              colors={[statusCodeColors['4xx'], statusCodeColors['5xx']]}
              showLegend={true}
              legendItems={[
                { label: 'Client Errors (4xx)', color: statusCodeColors['4xx'] },
                { label: 'Server Errors (5xx)', color: statusCodeColors['5xx'] }
              ]}
            />
          </div>
        </div>
        
        {/* Client vs Server Errors */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Client vs Server Errors
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart 
              data={errorTypeDistribution}
              type="pie"
              xKey="type"
              yKey="count"
              colors={[statusCodeColors['4xx'], statusCodeColors['5xx']]}
              showLegend={true}
              legendItems={[
                { label: 'Client Errors (4xx)', color: statusCodeColors['4xx'] },
                { label: 'Server Errors (5xx)', color: statusCodeColors['5xx'] }
              ]}
            />
          </div>
        </div>
      </div>
      
      {/* Error Timeline */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {`Error Timeline (${timeRange === 'hourly' ? 'Hourly' : 'Daily'})`}
          </h3>
        </div>
        <div className="p-4 h-[300px]">
          <D3Chart 
            data={errorTimelineData}
            type="line"
            xKey={timeRange === 'hourly' ? 'hour' : 'date'}
            yKey="count"
            xLabel={timeRange === 'hourly' ? 'Hour' : 'Date'}
            yLabel="Error Count"
            colors={['#ef4444']}
          />
        </div>
      </div>
      
      {/* Top Error Paths */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Top Error Paths
          </h3>
        </div>
        <div className="p-4">
          <DataTable
            data={errorPathsData.slice(0, 10)}
            columns={errorColumns}
            itemsPerPage={10}
          />
        </div>
      </div>
    </div>
  );
}