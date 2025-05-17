'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [endpointsData, setEndpointsData] = useState([]);
  const [ipsData, setIpsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summary, statusCodes, timeline, endpoints, ips] = await Promise.all([
          fetch('/data/summary.json').then(res => res.json()),
          fetch('/data/status_codes.json').then(res => res.json()),
          fetch('/data/requests_timeline.json').then(res => res.json()),
          fetch('/data/top_endpoints.json').then(res => res.json()),
          fetch('/data/top_ips.json').then(res => res.json()),
        ]);

        setSummaryData(summary);
        setStatusData(statusCodes);
        setTimelineData(timeline);
        setEndpointsData(endpoints);
        setIpsData(ips);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">Loading dashboard data...</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the log analysis data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NGINX Log Analyzer Dashboard</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Total Requests" value={summaryData?.total_requests || 0} />
            <StatsCard title="Data Transferred" value={`${summaryData?.total_transferred_mb || 0} MB`} />
            <StatsCard title="Unique IPs" value={summaryData?.unique_ips || 0} />
            <StatsCard title="Unique Endpoints" value={summaryData?.unique_endpoints || 0} />
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard title="Requests Timeline">
              <div className="w-full h-full">
                {/* Timeline visualization would go here */}
                <div className="bg-white dark:bg-gray-700 rounded p-2 overflow-x-auto">
                  <div className="flex space-x-1 h-40">
                    {timelineData.map((point, index) => (
                      <div 
                        key={index} 
                        className="flex flex-col justify-end items-center"
                        title={`${point.hour}: ${point.count} requests`}
                      >
                        <div 
                          className="w-8 bg-blue-500 rounded-t"
                          style={{ 
                            height: `${Math.max(5, (point.count / Math.max(...timelineData.map(d => d.count))) * 100)}%` 
                          }}
                        ></div>
                        <div className="text-xs mt-1 transform -rotate-45 origin-top-left">
                          {point.hour.split(' ')[1]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ChartCard>
            
            <ChartCard title="Status Code Distribution">
              <div className="w-full h-full flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mr-2 ${getStatusColor(item.status)}`}
                      ></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.status}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.count} requests</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {Math.round((item.count / summaryData?.total_requests) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
          
          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableCard title="Top Endpoints">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Endpoint</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {endpointsData.slice(0, 10).map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {item.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableCard>
            
            <TableCard title="Top IPs">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IP Address</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {ipsData.slice(0, 10).map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableCard>
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            NGINX Log Analyzer Dashboard - ICM 2025 HACKATON
          </p>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1">
            Data generated: {new Date(summaryData?.generated_at || Date.now()).toLocaleString()}
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper function to get color for status code
function getStatusColor(status) {
  const code = parseInt(status);
  if (code < 300) return 'bg-green-500';
  if (code < 400) return 'bg-blue-500';
  if (code < 500) return 'bg-yellow-500';
  return 'bg-red-500';
}

// Stats Card Component
function StatsCard({ title, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {value}
              </div>
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="mt-5 h-64">
          {children}
        </div>
      </div>
    </div>
  );
}

// Table Card Component
function TableCard({ title, children }) {
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}