'use client';

import { useMemo } from 'react';
import D3Chart from './D3Chart';

export default function BotGeoDistribution({ ipsData, rawLogsData, handleIpClick }) {
  // Calculate geographical distribution of bot traffic
  const geoDistribution = useMemo(() => {
    // First, create a map of IP to isBot
    const ipBotMap = rawLogsData.reduce((acc, log) => {
      if (log.ip) {
        acc[log.ip] = log.is_bot || false;
      }
      return acc;
    }, {});
    
    // Then, count bot IPs by location
    const locationCounts = ipsData.reduce((acc, ip) => {
      // Skip if not a bot
      if (!ipBotMap[ip.ip]) return acc;
      
      // Get location for this IP (using the same simulation logic)
      const ipParts = ip.ip.split('.');
      const locations = ['United States', 'Germany', 'Japan', 'Brazil', 'Canada', 'France', 'UK', 'Australia'];
      const ipSum = ipParts.reduce((sum, part) => sum + parseInt(part, 10), 0);
      const location = locations[ipSum % locations.length];
      
      acc[location] = (acc[location] || 0) + ip.count;
      return acc;
    }, {});
    
    // Convert to array and sort by count
    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [ipsData, rawLogsData]);

  // Create continents distribution data
  const continentDistribution = useMemo(() => {
    const continentMap = {
      'United States': 'North America',
      'Canada': 'North America',
      'Brazil': 'South America',
      'Germany': 'Europe',
      'France': 'Europe',
      'UK': 'Europe',
      'Japan': 'Asia',
      'Australia': 'Oceania'
    };
    
    const continentCounts = geoDistribution.reduce((acc, item) => {
      const continent = continentMap[item.location] || 'Unknown';
      acc[continent] = (acc[continent] || 0) + item.count;
      return acc;
    }, {});
    
    return Object.entries(continentCounts)
      .map(([continent, count]) => ({ continent, count }))
      .sort((a, b) => b.count - a.count);
  }, [geoDistribution]);

  // Calculate top bot IPs with location
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
        // Get location for this IP
        const ipParts = ip.ip.split('.');
        const locations = ['United States', 'Germany', 'Japan', 'Brazil', 'Canada', 'France', 'UK', 'Australia'];
        const ipSum = ipParts.reduce((sum, part) => sum + parseInt(part, 10), 0);
        const location = locations[ipSum % locations.length];
        
        // Calculate bot percentage
        const ipLogs = rawLogsData.filter(log => log.ip === ip.ip);
        const botLogs = ipLogs.filter(log => log.is_bot);
        const botPercentage = (botLogs.length / ipLogs.length * 100).toFixed(1);
        
        return {
          ...ip,
          location,
          botPercentage
        };
      });
  }, [ipsData, rawLogsData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Geographical Distribution by Country */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Bot Traffic by Country
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart 
              data={geoDistribution} 
              type="bar" 
              xKey="location" 
              yKey="count"
              xLabel="Country" 
              yLabel="Bot Requests"
              colors={['#ef4444', '#ff7849', '#f97316', '#d946ef', '#ec4899']}
              showLegend={false}
              tooltipFormatter={(d) => `${d.location}: ${d.count.toLocaleString()} bot requests`}
            />
          </div>
        </div>

        {/* Geographical Distribution by Continent */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Bot Traffic by Continent
            </h3>
          </div>
          <div className="p-4 h-[300px]">
            <D3Chart 
              data={continentDistribution} 
              type="pie" 
              xKey="continent" 
              yKey="count"
              colors={['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6']}
              showLegend={true}
              legendItems={continentDistribution.map((d, i) => ({
                label: d.continent,
                color: ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][i % 5]
              }))}
              tooltipFormatter={(d) => `${d.continent}: ${d.count.toLocaleString()} bot requests (${((d.count / continentDistribution.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%)`}
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {topBotIPs.map((ip, index) => (
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
                      {ip.location}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}