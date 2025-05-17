'use client';

import { useState, useEffect, useMemo } from 'react';
import TabsNavigation from './components/TabsNavigation';
import StatsSummary from './components/StatsSummary';
import FilterPanel from './components/FilterPanel';
import ResponsiveGrid from './components/ResponsiveGrid';
import D3Chart from './components/D3Chart';
import DataTable from './components/DataTable';
import ErrorAnalysis from './components/ErrorAnalysis';
import BotTrafficAnalysis from './components/BotTrafficAnalysis';
import DaySelector from './components/DaySelector';
import ImportExportPanel from './components/ImportExportPanel';

// Tab definitions with icons
const tabs = [
  {
    id: 'overview',
    name: 'Overview',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'traffic',
    name: 'Traffic Analysis',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'errors',
    name: 'Error Analysis',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    id: 'clients',
    name: 'Clients & Bots',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'logs',
    name: 'Raw Logs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

export default function DashboardContent({
  timeRange,
  toggleTimeRange,
  summaryData,
  statusData,
  timelineData,
  dailyData,
  trafficData,
  endpointsData,
  ipsData,
  botUserData,
  httpMethodsData,
  statusCategoriesData,
  fileTypesData,
  referrersData,
  errorPathsData,
  rawLogsData,
  filteredLogs,
  activeFilters,
  handleApplyFilters,
  handleResetFilters,
  availableFilters,
  formattedTimelineData,
  formatTimelineDataFn,
  formatTrafficData,
  formatDailyData,
  statusCodeColors,
  chartColors,
  logTableColumns
}) {
  // State for day selection
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Filter timeline data by selected day
  const filteredHourlyData = useMemo(() => {
    if (timeRange !== 'hourly' || !selectedDay || !formattedTimelineData) {
      return formattedTimelineData;
    }
    
    return formattedTimelineData.filter(point => {
      return point.fullTime && point.fullTime.startsWith(selectedDay);
    });
  }, [formattedTimelineData, selectedDay, timeRange]);
  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };
  
  // Handle IP click to filter logs
  const handleIpClick = (ipData) => {
    if (ipData && ipData.ip) {
      // Change to Raw Logs tab
      setActiveTab('logs');
      
      // Apply filter for the selected IP
      handleApplyFilters({ ip: ipData.ip });
    }
  };

  // Card component for consistent styling
  const Card = ({ title, children, className = '', height = 'h-[300px]' }) => (
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

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <StatsSummary stats={summaryData} />
            
            <ResponsiveGrid columns={{ sm: 1, md: 1, lg: 2 }}>
              {/* Status code distribution */}
              <Card title="HTTP Status Distribution">
                <D3Chart 
                  data={statusCategoriesData} 
                  type="donut" 
                  xKey="category" 
                  yKey="count"
                  colors={[
                    statusCodeColors['2xx'],
                    statusCodeColors['3xx'],
                    statusCodeColors['4xx'],
                    statusCodeColors['5xx']
                  ]}
                  showLegend={true}
                  legendItems={[
                    { label: 'Success (2xx)', color: statusCodeColors['2xx'] },
                    { label: 'Redirect (3xx)', color: statusCodeColors['3xx'] },
                    { label: 'Client Error (4xx)', color: statusCodeColors['4xx'] },
                    { label: 'Server Error (5xx)', color: statusCodeColors['5xx'] }
                  ]}
                  onClick={(d) => {
                    // Extract status code category (2xx, 3xx, etc.) and navigate to logs tab with filter
                    const category = d.category.split(' ')[0].toLowerCase().replace('(', '').replace(')', '');
                    setActiveTab('logs');
                    if (category === '2xx') {
                      handleApplyFilters({ status: '200' });
                    } else if (category === '3xx') {
                      handleApplyFilters({ status: '301' });
                    } else if (category === '4xx') {
                      handleApplyFilters({ status: '404' });
                    } else if (category === '5xx') {
                      handleApplyFilters({ status: '500' });
                    }
                  }}
                />
              </Card>
              
              {/* Timeline chart */}
              <Card title={timeRange === 'hourly' ? `Requests Per Hour ${selectedDay ? `(${selectedDay})` : ''}` : 'Requests Per Day'}>
                <D3Chart 
                  data={timeRange === 'hourly' ? filteredHourlyData : formatDailyData} 
                  type="line" 
                  xKey={timeRange === 'hourly' ? 'hour' : 'date'} 
                  yKey="count"
                  xLabel={timeRange === 'hourly' ? 'Hour' : 'Date'} 
                  yLabel="Requests"
                  colors={['#4f46e5']}
                  showTooltip={true}
                  showLegend={true}
                  legendItems={[{ label: 'Request Volume', color: '#4f46e5' }]}
                />
              </Card>
            </ResponsiveGrid>
            
            <ResponsiveGrid columns={{ sm: 1, md: 1, lg: 2 }}>
              {/* Bot vs User traffic */}
              <Card title="Bot vs User Traffic">
                <D3Chart 
                  data={botUserData} 
                  type="pie" 
                  xKey="type" 
                  yKey="count"
                  colors={['#ef4444', '#10b981']}
                  showLegend={true}
                  legendItems={[
                    { label: 'Bot Traffic', color: '#ef4444' },
                    { label: 'User Traffic', color: '#10b981' }
                  ]}
                />
              </Card>
              
              {/* HTTP Methods */}
              <Card title="HTTP Methods">
                <D3Chart 
                  data={httpMethodsData} 
                  type="bar" 
                  xKey="method" 
                  yKey="count"
                  xLabel="Method" 
                  yLabel="Requests"
                  colors={chartColors}
                  showLegend={true}
                  legendItems={httpMethodsData.slice(0, 5).map((method, i) => ({
                    label: method.method,
                    color: chartColors[i % chartColors.length]
                  }))}
                  onClick={(d) => {
                    // Filter logs by method
                    setActiveTab('logs');
                    handleApplyFilters({ method: d.method });
                  }}
                />
              </Card>
            </ResponsiveGrid>
            
            <ResponsiveGrid>
              {/* Top Endpoints */}
              <Card title="Top Endpoints" height="auto" className="col-span-full">
                <DataTable
                  data={endpointsData.slice(0, 10)}
                  columns={[
                    { key: 'endpoint', label: 'Path' },
                    { key: 'count', label: 'Requests' }
                  ]}
                  itemsPerPage={10}
                />
              </Card>
            </ResponsiveGrid>
          </>
        );

      case 'traffic':
        return (
          <>
            <ResponsiveGrid columns={{ sm: 1, md: 1, lg: 2 }}>
              {/* Traffic transferred */}
              <Card title={`Traffic Transferred (MB) - ${timeRange === 'hourly' ? `Hourly ${selectedDay ? `(${selectedDay})` : ''}` : 'Daily'}`}>
                <D3Chart 
                  data={timeRange === 'hourly' 
                    ? (selectedDay 
                        ? formatTrafficData.filter(point => point.fullTime && point.fullTime.startsWith(selectedDay))
                        : formatTrafficData)
                    : formatDailyData.map(d => ({ 
                        date: d.date, 
                        fullDate: d.fullDate,
                        // Simulate traffic data based on request counts
                        megabytes: dailyData.find(day => day.date === d.fullDate)?.count / 10 || 0 
                      }))} 
                  type="line" 
                  xKey={timeRange === 'hourly' ? 'hour' : 'date'} 
                  yKey="megabytes"
                  xLabel={timeRange === 'hourly' ? 'Hour' : 'Date'} 
                  yLabel="MB"
                  colors={['#059669']}
                  showTooltip={true}
                  showLegend={true}
                  legendItems={[{ label: 'Data Transfer Volume', color: '#059669' }]}
                  tooltipFormatter={(d) => `${d.megabytes.toFixed(2)} MB at ${timeRange === 'hourly' ? `${d.hour}:00` : d.date}`}
                />
              </Card>
              
              {/* File types */}
              <Card title="Content Types Distribution">
                <D3Chart 
                  data={fileTypesData.slice(0, 10)} 
                  type="bar" 
                  xKey="type" 
                  yKey="count"
                  xLabel="Extension" 
                  yLabel="Requests"
                  colors={chartColors}
                  maxBars={10}
                  showTooltip={true}
                  showLegend={true}
                  legendItems={fileTypesData.slice(0, 5).map((type, i) => ({
                    label: type.type,
                    color: chartColors[i % chartColors.length]
                  }))}
                  tooltipFormatter={(d) => `${d.count.toLocaleString()} requests for .${d.type} files (${(d.count / summaryData.find(s => s.metric === 'Total Requests')?.value * 100).toFixed(1)}% of total)`}
                  onClick={(d) => {
                    setActiveTab('logs');
                    handleApplyFilters({ path: `.${d.type}` });
                  }}
                />
              </Card>
            </ResponsiveGrid>
            
            <ResponsiveGrid>
              {/* Success vs Error */}
              <Card title="Request Status Distribution" height="auto" className="col-span-full">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {statusCategoriesData.map((category, index) => (
                    <div 
                      key={index}
                      className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 text-center"
                    >
                      <div className="text-xl font-semibold" style={{ color: statusCodeColors[category.category.split(' ')[0].toLowerCase().replace('(', '').replace(')', '')] }}>
                        {category.percentage}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{category.category}</div>
                      <div className="text-sm font-medium">{category.count.toLocaleString()} requests</div>
                    </div>
                  ))}
                </div>
              </Card>
            </ResponsiveGrid>
            
            <ResponsiveGrid>
              <Card title="Top Referrers" height="auto" className="col-span-full">
                <DataTable
                  data={referrersData.slice(0, 10)}
                  columns={[
                    { key: 'referrer', label: 'Referrer' },
                    { key: 'count', label: 'Requests' }
                  ]}
                  itemsPerPage={10}
                />
              </Card>
            </ResponsiveGrid>
          </>
        );
        
      case 'errors':
        return (
          <ErrorAnalysis
            statusData={statusData}
            timelineData={timelineData}
            dailyData={dailyData}
            errorPathsData={errorPathsData}
            rawLogsData={rawLogsData}
            timeRange={timeRange}
            formatTimelineDataFn={formatTimelineDataFn}
            formattedTimelineData={formattedTimelineData}
            formatDailyData={formatDailyData}
            statusCodeColors={statusCodeColors}
            handleApplyFilters={handleApplyFilters}
            selectedDay={selectedDay}
          />
        );

      case 'clients':
        return (
          <BotTrafficAnalysis
            botUserData={botUserData}
            rawLogsData={rawLogsData}
            ipsData={ipsData}
            timelineData={timelineData}
            timeRange={timeRange}
            handleApplyFilters={handleApplyFilters}
            handleIpClick={handleIpClick}
          />
        );

      case 'logs':
        return (
          <>
            <FilterPanel 
              filters={availableFilters} 
              onApplyFilters={handleApplyFilters} 
              onResetFilters={handleResetFilters}
              initialFilters={activeFilters}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card title={`Filtered Logs (${filteredLogs.length} entries)`} height="auto">
                  <DataTable
                    data={filteredLogs}
                    columns={logTableColumns}
                    itemsPerPage={15}
                  />
                </Card>
              </div>
              <div className="lg:col-span-1">
                <ImportExportPanel 
                  rawLogsData={rawLogsData} 
                  onImport={(importedLogs) => {
                    // In a production app, we'd update the logs in a parent component
                    // For now, we'll just show an alert
                    alert(`Imported ${importedLogs.length} logs. In a full implementation, these would be processed and added to the dashboard.`);
                  }} 
                />
              </div>
            </div>
          </>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="flex-grow"
        />
        
        <div className="flex items-center gap-2">
          <DaySelector 
            timelineData={timelineData}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            timeRange={timeRange}
          />
          <button 
            onClick={toggleTimeRange}
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-md text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800 transition duration-200 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {timeRange === 'hourly' ? 'Show Daily View' : 'Show Hourly View'}
          </button>
        </div>
      </div>
      
      {renderTabContent()}
    </div>
  );
}