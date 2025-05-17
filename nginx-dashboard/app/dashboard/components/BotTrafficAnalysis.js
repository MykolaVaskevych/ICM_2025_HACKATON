'use client';

import { useMemo } from 'react';
import D3Chart from './D3Chart';
import DataTable from './DataTable';
import BotGeoDistribution from './BotGeoDistribution';

export default function BotTrafficAnalysis({
  botUserData,
  rawLogsData,
  ipsData,
  timelineData,
  timeRange,
  formattedTimelineData,
  handleApplyFilters,
  handleIpClick,
  selectedDay
}) {
  // Get bot classification breakdown
  const botClassification = useMemo(() => {
    // Count bots by type - good, malicious, neutral
    const botTypes = rawLogsData
      .filter(log => log.is_bot)
      .reduce((acc, log) => {
        // Determine bot type based on user_agent keywords (simplified approach)
        let botType = 'Unknown';
        const userAgent = (log.user_agent || '').toLowerCase();
        
        if (userAgent.includes('googlebot') || 
            userAgent.includes('bingbot') || 
            userAgent.includes('yandex') ||
            userAgent.includes('crawler') && userAgent.includes('verified')) {
          botType = 'Good Bot';
        } else if (userAgent.includes('scraper') || 
                  userAgent.includes('bot') && userAgent.includes('unknown') ||
                  userAgent.includes('headless')) {
          botType = 'Potentially Malicious';
        } else if (userAgent.includes('bot') || 
                  userAgent.includes('crawler') ||
                  userAgent.includes('spider')) {
          botType = 'Neutral Bot';
        }
        
        acc[botType] = (acc[botType] || 0) + 1;
        return acc;
      }, {});
    
    // Convert to array for chart
    return Object.entries(botTypes).map(([type, count]) => ({
      type,
      count
    }));
  }, [rawLogsData]);

  // Calculate bot traffic over time
  const botTrafficTimeline = useMemo(() => {
    if (timeRange === 'hourly') {
      // Use the selected day if provided
      if (selectedDay && formattedTimelineData) {
        return formattedTimelineData.map(point => {
          const matchingLogs = rawLogsData.filter(log => {
            if (!log.timestamp) return false;
            const logHour = new Date(log.timestamp).getHours() + ':00';
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            return logHour === point.hour && 
                   logDate === selectedDay && 
                   log.is_bot;
          });
          return {
            hour: point.hour,
            count: matchingLogs.length,
            fullTime: point.fullTime
          };
        });
      }
      
      // Extract hour from timestamp and count bot requests per hour
      const hourCounts = rawLogsData
        .filter(log => log.is_bot && log.timestamp)
        .reduce((acc, log) => {
          const hour = new Date(log.timestamp).getHours();
          const hourKey = `${hour}:00`;
          acc[hourKey] = (acc[hourKey] || 0) + 1;
          return acc;
        }, {});
      
      // Convert to array and sort by hour
      return Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => {
          const hourA = parseInt(a.hour.split(':')[0]);
          const hourB = parseInt(b.hour.split(':')[0]);
          return hourA - hourB;
        });
    } else {
      // Extract date from timestamp and count bot requests per day
      const dateCounts = rawLogsData
        .filter(log => log.is_bot && log.timestamp)
        .reduce((acc, log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
      
      // Convert to array and sort by date
      return Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  }, [rawLogsData, timeRange]);
  
  // Get top targeted endpoints by bots
  const botTargetedEndpoints = useMemo(() => {
    const endpointCounts = rawLogsData
      .filter(log => log.is_bot)
      .reduce((acc, log) => {
        if (!log.path) return acc;
        acc[log.path] = (acc[log.path] || 0) + 1;
        return acc;
      }, {});
    
    // Convert to array and sort by count
    return Object.entries(endpointCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [rawLogsData]);

  // Get bot traffic patterns
  const botPatterns = useMemo(() => {
    // Calculate average requests per hour for bots vs humans
    const hourlyPatterns = Array(24).fill().map((_, hour) => {
      const botRequests = rawLogsData.filter(log => 
        log.is_bot && 
        log.timestamp && 
        new Date(log.timestamp).getHours() === hour
      ).length;
      
      const humanRequests = rawLogsData.filter(log => 
        !log.is_bot && 
        log.timestamp && 
        new Date(log.timestamp).getHours() === hour
      ).length;
      
      return {
        hour: `${hour}:00`,
        botRequests,
        humanRequests
      };
    });
    
    return hourlyPatterns;
  }, [rawLogsData]);

  return (
    <div className="space-y-6">
      <ResponsiveGrid columns={{ sm: 1, md: 1, lg: 2 }}>
        {/* Bot vs User pie chart */}
        <Card title="Bot Traffic Analysis">
          <D3Chart 
            data={botUserData} 
            type="donut" 
            xKey="type" 
            yKey="count"
            colors={['#ef4444', '#10b981']}
            showLegend={true}
            legendItems={[
              { label: 'Bot Traffic', color: '#ef4444' },
              { label: 'User Traffic', color: '#10b981' }
            ]}
            tooltipFormatter={(d) => `${d.count.toLocaleString()} requests (${((d.count / botUserData.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%)`}
          />
        </Card>
        
        {/* Bot Classification */}
        <Card title="Bot Classification">
          <D3Chart 
            data={botClassification} 
            type="pie" 
            xKey="type" 
            yKey="count"
            colors={['#22c55e', '#ef4444', '#3b82f6', '#9ca3af']}
            showLegend={true}
            legendItems={[
              { label: 'Good Bot', color: '#22c55e' },
              { label: 'Potentially Malicious', color: '#ef4444' },
              { label: 'Neutral Bot', color: '#3b82f6' },
              { label: 'Unknown', color: '#9ca3af' }
            ]}
            tooltipFormatter={(d) => `${d.type}: ${d.count.toLocaleString()} requests (${((d.count / botClassification.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%)`}
            onClick={(d) => {
              // Filter logs by bot type
              handleApplyFilters({ bot_type: d.type });
            }}
          />
        </Card>
      </ResponsiveGrid>
      
      {/* Bot Traffic Timeline */}
      <Card title={`Bot Traffic Timeline (${timeRange === 'hourly' ? 'Hourly' : 'Daily'})`}>
        <div className="h-[300px]">
          <D3Chart 
            data={botTrafficTimeline} 
            type="line" 
            xKey={timeRange === 'hourly' ? 'hour' : 'date'} 
            yKey="count"
            xLabel={timeRange === 'hourly' ? 'Hour' : 'Date'} 
            yLabel="Bot Requests"
            colors={['#ef4444']}
            showLegend={true}
            legendItems={[{ label: 'Bot Requests', color: '#ef4444' }]}
            tooltipFormatter={(d) => `${d.count} bot requests at ${timeRange === 'hourly' ? d.hour : d.date}`}
          />
        </div>
      </Card>

      {/* Bot Traffic Patterns by Hour */}
      <Card title="Bot vs Human Traffic by Hour">
        <div className="h-[300px]">
          <D3Chart 
            data={botPatterns} 
            type="bar" 
            xKey="hour"
            yKey="botRequests"
            xLabel="Hour of Day" 
            yLabel="Requests"
            colors={['#ef4444', '#10b981']}
            showLegend={true}
            legendItems={[
              { label: 'Bot Traffic', color: '#ef4444' },
              { label: 'Human Traffic', color: '#10b981' }
            ]}
            tooltipFormatter={(d) => `${d.hour}: ${d.botRequests} bot requests vs ${d.humanRequests} human requests`}
          />
        </div>
      </Card>
      
      {/* Top Targeted Endpoints by Bots */}
      <Card title="Top Targeted Endpoints by Bots" height="auto">
        <DataTable
          data={botTargetedEndpoints}
          columns={[
            { key: 'path', label: 'Endpoint Path' },
            { key: 'count', label: 'Bot Requests' },
            { 
              key: 'percentage', 
              label: 'Bot Traffic %',
              render: (_, item) => {
                const totalRequests = rawLogsData.filter(log => log.path === item.path).length;
                const percentage = (item.count / totalRequests * 100).toFixed(1);
                return `${percentage}%`;
              }
            }
          ]}
          itemsPerPage={10}
        />
      </Card>
      
      {/* Geographical Distribution */}
      <BotGeoDistribution ipsData={ipsData} rawLogsData={rawLogsData} handleIpClick={handleIpClick} />
    </div>
  );
}

// Helper components
function ResponsiveGrid({ children, columns = { sm: 1, md: 2, lg: 3 }, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} gap-6 ${className}`}>
      {children}
    </div>
  );
}

function Card({ title, children, className = '', height = 'h-[300px]' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className={`p-4 ${height}`}>
        {children}
      </div>
    </div>
  );
}