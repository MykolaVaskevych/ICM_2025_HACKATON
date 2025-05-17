'use client';

import { useMemo } from 'react';
import D3Chart from './D3Chart';

export default function BotGeoDistribution({ ipsData, rawLogsData, handleIpClick }) {
  // Calculate bot traffic distribution by request volume
  const botRequestGroups = useMemo(() => {
    // First, create a map of IP to isBot
    const ipBotMap = rawLogsData.reduce((acc, log) => {
      if (log.ip) {
        acc[log.ip] = log.is_bot || false;
      }
      return acc;
    }, {});

    // Filter for bot IPs and categorize by request volume
    const botIps = ipsData.filter(ip => ipBotMap[ip.ip]);

    // Group by request volume
    const requestRanges = [
      { name: '1-10', min: 1, max: 10 },
      { name: '11-50', min: 11, max: 50 },
      { name: '51-100', min: 51, max: 100 },
      { name: '101-500', min: 101, max: 500 },
      { name: '500+', min: 501, max: Infinity }
    ];

    const volumeGroups = requestRanges.map(range => {
      const matchingIps = botIps.filter(ip => ip.count >= range.min && ip.count <= range.max);
      return {
        range: range.name,
        count: matchingIps.length,
        totalRequests: matchingIps.reduce((sum, ip) => sum + ip.count, 0)
      };
    });

    return volumeGroups.filter(group => group.count > 0);
  }, [ipsData, rawLogsData]);

  // Distribution by traffic type
  const trafficTypeDistribution = useMemo(() => {
    // Analyze the kind of traffic (GET, POST, etc.)
    const botTrafficTypes = rawLogsData
      .filter(log => log.is_bot)
      .reduce((acc, log) => {
        const method = log.method || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(botTrafficTypes)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawLogsData]);

  // Calculate top bot IPs
  const topBotIPs = useMemo(() => {
    return ipsData
      .filter(ip => {
        // Check if this IP has bot traffic
        const ipLogs = rawLogsData.filter(log => log.ip === ip.ip);
        return ipLogs.some(log => log.is_bot);
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(ip => {
        // Calculate bot percentage
        const ipLogs = rawLogsData.filter(log => log.ip === ip.ip);
        const botLogs = ipLogs.filter(log => log.is_bot);
        const botPercentage = (botLogs.length / ipLogs.length * 100).toFixed(1);

        return {
          ...ip,
          botPercentage
        };
      });
  }, [ipsData, rawLogsData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bot Traffic by Volume */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Bot Traffic by Request Volume
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart
              data={botRequestGroups}
              type="bar"
              xKey="range"
              yKey="count"
              xLabel="Request Range"
              yLabel="Number of IPs"
              colors={['#ef4444', '#ff7849', '#f97316', '#d946ef', '#ec4899']}
              showLegend={false}
              tooltipFormatter={(d) => `${d.range} requests: ${d.count} IPs (${d.totalRequests.toLocaleString()} total requests)`}
            />
          </div>
        </div>

        {/* Bot Traffic by Method */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Bot Traffic by Method
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart
              data={trafficTypeDistribution}
              type="pie"
              xKey="method"
              yKey="count"
              colors={['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6']}
              showLegend={true}
              legendItems={trafficTypeDistribution.map((d, i) => ({
                label: d.method,
                color: ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][i % 5]
              }))}
              tooltipFormatter={(d) => `${d.method}: ${d.count.toLocaleString()} requests (${((d.count / trafficTypeDistribution.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%)`}
            />
          </div>
        </div>
      </div>

      {/* Top Bot IPs */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Top Bot IPs
          </h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bot %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status Codes</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {topBotIPs.map((ip, index) => {
                  // Get status codes distribution for this IP
                  const ipLogs = rawLogsData.filter(log => log.ip === ip.ip && log.is_bot);
                  const statusCounts = ipLogs.reduce((acc, log) => {
                    const statusCategory = log.status ? Math.floor(log.status / 100) + 'xx' : 'Unknown';
                    acc[statusCategory] = (acc[statusCategory] || 0) + 1;
                    return acc;
                  }, {});

                  const statusSummary = Object.entries(statusCounts)
                    .map(([code, count]) => `${code}: ${count}`)
                    .join(', ');

                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleIpClick(ip)}
                          className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                        >
                          {ip.ip}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                        {ip.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                        {ip.botPercentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                        {statusSummary || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}