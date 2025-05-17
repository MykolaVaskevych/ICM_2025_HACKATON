'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter, Button, Alert, AlertTitle, AlertDescription, Badge } from './SimpleUI';
import { RefreshCcw, Database, Clock, FileText, HardDrive } from 'lucide-react';

/**
 * Database Status Component
 * 
 * Displays the current status of the PostgreSQL database connection
 * and provides information about the tables and data.
 */
export default function DatabaseStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch database status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/status');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch database status');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Card className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking database connection...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <h3 className="text-lg font-semibold">Database Status</h3>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              Could not connect to the PostgreSQL database. Make sure the database
              is running and configured correctly.
              <br />
              <br />
              Error: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchStatus} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="w-full">
        <CardHeader>
          <h3 className="text-lg font-semibold">Database Status</h3>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No database information available.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchStatus} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Function to clear the database
  const clearDatabase = async () => {
    try {
      setIsClearing(true);
      
      const response = await fetch('/api/admin/clear-db', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear database: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Close dialog and refresh status
      setShowClearDialog(false);
      fetchStatus();
      
      // Show success notification
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.success('Database cleared successfully');
      } else {
        alert('Database cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      
      // Show error notification
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error(`Failed to clear database: ${error.message}`);
      } else {
        alert(`Failed to clear database: ${error.message}`);
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h3 className="text-lg font-semibold">Database Status</h3>
          <p className="text-muted-foreground text-sm">PostgreSQL Connection</p>
        </div>
        <Badge 
          variant={status.status === 'connected' ? 'success' : 'destructive'}
        >
          {status.status === 'connected' ? 'Connected' : 'Error'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                PostgreSQL Version
              </p>
              <p className="text-sm text-muted-foreground">{status.version?.split(',')[0] || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Database Size
              </p>
              <p className="text-sm text-muted-foreground">{status.dbSize || 'Unknown'}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Log Entries
            </p>
            <p className="text-sm text-muted-foreground">
              {status.totalLogs?.toLocaleString() || 0} logs stored in database
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Range
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(status.timeRange?.firstLog)} - {formatDate(status.timeRange?.lastLog)}
            </p>
          </div>
          
          {status.tables && status.tables.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Tables</p>
              <div className="text-sm border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-right">Rows</th>
                      <th className="px-4 py-2 text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.tables.map((table, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{table.table_name}</td>
                        <td className="px-4 py-2 text-right">{parseInt(table.row_count).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{table.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={fetchStatus} className="flex items-center gap-2 w-full sm:w-auto">
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
        
        <Button 
          variant="destructive" 
          onClick={() => setShowClearDialog(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Clear Database
        </Button>
      </CardFooter>

      {/* Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              Clear Database
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This will delete ALL log entries and statistics from the database. This action cannot be undone.
              Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(false)}
                disabled={isClearing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={clearDatabase}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clearing...
                  </>
                ) : (
                  'Clear Database'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}