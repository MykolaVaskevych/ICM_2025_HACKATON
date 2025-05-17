'use client';

import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminPage() {
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: 5432,
    user: 'nginx_user',
    password: '••••••••••',
    database: 'nginx_logs'
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connected', 'error'
  
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setDbConfig({
      ...dbConfig,
      [name]: value
    });
  };
  
  const testConnection = async () => {
    setIsConnecting(true);
    
    try {
      // Simulate a database connection test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would call your API endpoint
      // const response = await fetch('/api/admin/test-connection', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(dbConfig)
      // });
      
      // if (!response.ok) throw new Error('Connection failed');
      
      setConnectionStatus('connected');
      toast.success('Connected to database successfully!');
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const saveConfig = async () => {
    try {
      // Simulate saving configuration
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 1000)),
        {
          loading: 'Saving configuration...',
          success: 'Database configuration saved!',
          error: 'Failed to save configuration'
        }
      );
      
      // In a real app, this would call your API endpoint
      // await fetch('/api/admin/config', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(dbConfig)
      // });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };
  
  const createBackup = async () => {
    setIsBackingUp(true);
    
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call your API endpoint
      // const response = await fetch('/api/admin/backup', {
      //   method: 'POST'
      // });
      
      // const blob = await response.blob();
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `nginx_logs_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);
      
      toast.success('Database backup created successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };
  
  const handleRestoreFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.dump')) {
      toast.error('Invalid file format. Please use .sql or .dump files.');
      return;
    }
    
    setIsRestoring(true);
    
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // In a real app, this would call your API endpoint with FormData
      // const formData = new FormData();
      // formData.append('backupFile', file);
      // await fetch('/api/admin/restore', {
      //   method: 'POST',
      //   body: formData
      // });
      
      toast.success('Database restored successfully!');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(`Restore failed: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };
  
  return (
    <main className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database Administration</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 rounded-md flex items-center text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Connection Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Database Connection Configuration
            </h2>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host</label>
                  <input
                    type="text"
                    id="host"
                    name="host"
                    value={dbConfig.host}
                    onChange={handleConfigChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                  <input
                    type="number"
                    id="port"
                    name="port"
                    value={dbConfig.port}
                    onChange={handleConfigChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    id="user"
                    name="user"
                    value={dbConfig.user}
                    onChange={handleConfigChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={dbConfig.password}
                    onChange={handleConfigChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="database" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Database Name</label>
                <input
                  type="text"
                  id="database"
                  name="database"
                  value={dbConfig.database}
                  onChange={handleConfigChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={testConnection}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>Test Connection</>
                  )}
                </button>
                
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm transition-colors"
                >
                  Save Configuration
                </button>
                
                {connectionStatus === 'connected' && (
                  <span className="text-green-600 dark:text-green-400 text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                )}
                
                {connectionStatus === 'error' && (
                  <span className="text-red-600 dark:text-red-400 text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Connection Failed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Database Stats Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 h-full">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Database Statistics
            </h2>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Version:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">PostgreSQL 14.4</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Size:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">256 MB</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Tables:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">6</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Rows:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">15,243</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Backup & Restore Section */}
      <div className="mt-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Backup & Restore
          </h2>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Backup Section */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Backup Database</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Create a full backup of your database that you can use to restore in case of data loss.
                </p>
                
                <button
                  onClick={createBackup}
                  disabled={isBackingUp}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isBackingUp ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Backup
                    </>
                  )}
                </button>
              </div>
              
              {/* Restore Section */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Restore Database</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Restore your database from a previous backup file. This will overwrite existing data.
                </p>
                
                <div>
                  <label className={`w-full flex items-center justify-center px-4 py-2 border ${isRestoring ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-indigo-500 dark:border-indigo-400 bg-white dark:bg-gray-700 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-600 cursor-pointer'} rounded-md shadow-sm text-sm transition-colors`}>
                    {isRestoring ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Restoring...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Choose Backup File
                      </>
                    )}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".sql,.dump"
                      onChange={handleRestoreFile}
                      disabled={isRestoring}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Supported formats: .sql, .dump
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}