'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardContent, CardFooter, Button } from './SimpleUI';

export default function SQLEditor() {
  const [sql, setSql] = useState('SELECT * FROM logs LIMIT 10;');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  const executeQuery = async () => {
    if (!sql.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResults(null);

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute query');
      }

      const data = await response.json();
      setResults(data);
      
      // Add to query history
      setQueryHistory(prev => [
        { query: sql, timestamp: new Date() },
        ...prev.slice(0, 9), // Keep only 10 most recent queries
      ]);
      
      toast.success('Query executed successfully');
    } catch (err) {
      console.error('Query execution error:', err);
      setError(err.message);
      toast.error(`Query failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Execute query on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">SQL Query</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSql('SELECT * FROM logs LIMIT 10;')}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Reset
                </button>
                <button
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                  title="Ctrl+Enter to Execute"
                >
                  Keyboard Shortcuts
                </button>
              </div>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[200px] p-4 font-mono text-sm focus:outline-none focus:ring-0 border-0 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Enter SQL query here..."
              spellCheck="false"
            ></textarea>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Press Ctrl+Enter to execute
            </div>
            <button
              onClick={executeQuery}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading ? 'Executing...' : 'Execute Query'}
            </button>
          </div>
        </div>
        
        <div className="md:col-span-1">
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Query History</h4>
            </div>
            <div className="p-3 max-h-[200px] overflow-y-auto bg-white dark:bg-gray-800">
              {queryHistory.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">No query history yet</p>
              ) : (
                <div className="space-y-2">
                  {queryHistory.map((item, index) => (
                    <div 
                      key={index}
                      className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => setSql(item.query)}
                    >
                      <div className="truncate font-mono">{item.query}</div>
                      <div className="text-gray-500 dark:text-gray-400 mt-1">{formatTimestamp(item.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Query Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <pre className="whitespace-pre-wrap font-mono">{error}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {results && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Query Results</h4>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {results.rows?.length || 0} rows in {results.executionTime || 0}ms
            </div>
          </div>
          <div className="overflow-x-auto">
            {results.rows?.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {results.columns.map((column, index) => (
                      <th 
                        key={index} 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {results.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {Object.values(row).map((value, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                        >
                          {value === null ? <span className="text-gray-400">NULL</span> :
                           typeof value === 'object' && value instanceof Date ? value.toLocaleString() :
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {results.message || 'Query executed successfully, but returned no rows.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}