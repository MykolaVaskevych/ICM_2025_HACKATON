'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PDFReportGenerator from './PDFReportGenerator';
// Import libraries only on client side
const isBrowser = typeof window !== 'undefined';

export default function ImportExportPanel({ rawLogsData, dashboardData, onImport }) {
  const [importStatus, setImportStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [importSource, setImportSource] = useState('file'); // 'file' or 'db'
  const [exportDestination, setExportDestination] = useState('file'); // 'file' or 'db'
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  // Handle file upload for import
  const handleFileUpload = async (e) => {
    if (!isBrowser) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    setImportStatus('Loading...');
    
    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      if (fileExt === 'json') {
        // Import JSON
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (Array.isArray(data)) {
          onImport(data);
          setImportStatus(`Successfully imported ${data.length} log entries.`);
        } else {
          setImportStatus('Invalid JSON format. Expected an array of log entries.');
        }
      } else if (fileExt === 'gz') {
        setImportStatus('Processing compressed file...');
        setIsProcessing(true);
        
        try {
          // Process compressed file using actual API endpoint
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/import/gz', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Failed to process compressed file: ${response.statusText}`);
          }
          
          const data = await response.json();
          onImport(data);
          
          setImportStatus(`Successfully imported ${data.length} log entries from compressed file.`);
          setIsProcessing(false);
          toast.success('Compressed file import complete!');
        } catch (error) {
          console.error('Error importing compressed file:', error);
          setImportStatus(`Error importing compressed file: ${error.message}`);
          setIsProcessing(false);
          toast.error('Error importing compressed file');
        }
      } else if (fileExt === 'txt' || fileExt === 'log') {
        // Basic text log import
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Simple parsing - in real app, use the log_parser.py logic here
        const parsedLogs = lines.map(line => {
          // Very basic parsing to extract just a few fields
          const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          const dateMatch = line.match(/\[([^\]]+)\]/);
          const requestMatch = line.match(/"([^"]+)"/);
          const statusMatch = line.match(/ (\d{3}) /);
          
          return {
            ip: ipMatch ? ipMatch[1] : 'unknown',
            timestamp: dateMatch ? new Date(dateMatch[1].replace(':', ' ')).toISOString() : new Date().toISOString(),
            request: requestMatch ? requestMatch[1] : 'unknown',
            status: statusMatch ? statusMatch[1] : '200',
            bytes: 0,
            path: requestMatch ? requestMatch[1].split(' ')[1] : '/',
            method: requestMatch ? requestMatch[1].split(' ')[0] : 'GET',
            user_agent: 'unknown',
            is_bot: false
          };
        });
        
        onImport(parsedLogs);
        setImportStatus(`Imported ${parsedLogs.length} log entries.`);
      } else {
        setImportStatus('Unsupported file format. Please use .json, .log, or .txt.');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Error importing file: ${error.message}`);
    }
  };
  
  // Import from database - using actual database connection
  const importFromDatabase = async () => {
    try {
      setImportStatus('Importing from database...');
      setIsProcessing(true);
      
      // Direct fetch from the API without mock data
      const response = await fetch('/api/import/database');
      
      if (!response.ok) {
        throw new Error(`Database import failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      onImport(data);
      
      setImportStatus(`Successfully imported ${data.length} log entries from database.`);
      setIsProcessing(false);
      toast.success('Database import complete!');
    } catch (error) {
      console.error('Database import error:', error);
      setImportStatus(`Error importing from database: ${error.message}`);
      setIsProcessing(false);
      toast.error('Database import failed');
    }
  };
  
  // Export data to database - using actual database API
  const exportToDatabase = async () => {
    try {
      if (!rawLogsData || rawLogsData.length === 0) {
        toast.error('No data to export to database');
        return;
      }
      
      setIsProcessing(true);
      
      // Direct API call to database export endpoint
      const response = await fetch('/api/export/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawLogsData)
      });
      
      if (!response.ok) {
        throw new Error(`Database export failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      setIsProcessing(false);
      toast.success(`Exported ${result.count} entries to database`);
    } catch (error) {
      console.error('Database export error:', error);
      setIsProcessing(false);
      toast.error('Error exporting to database: ' + error.message);
    }
  };
  
  // Export data to JSON
  const exportJSON = async () => {
    try {
      if (!isBrowser) return;
      
      // Dynamically import file-saver
      const { saveAs } = await import('file-saver');
      
      const jsonStr = JSON.stringify(rawLogsData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      saveAs(blob, 'nginx_logs_export.json');
    } catch (error) {
      console.error('JSON export error:', error);
      alert('Error exporting data: ' + error.message);
    }
  };
  
  // Export data to compressed GZ file - using actual server export
  const exportGZ = async () => {
    try {
      if (!isBrowser) return;
      if (!rawLogsData || rawLogsData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      setIsProcessing(true);
      
      // Use actual API endpoint for compression
      const response = await fetch('/api/export/gz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawLogsData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export compressed file: ${response.statusText}`);
      }
      
      // Get compressed file blob
      const blob = await response.blob();
      
      // Save file using file-saver
      const { saveAs } = await import('file-saver');
      saveAs(blob, 'nginx_logs_export.gz');
      
      setIsProcessing(false);
      toast.success('Export to GZ complete!');
    } catch (error) {
      console.error('GZ export error:', error);
      setIsProcessing(false);
      toast.error('Error exporting to GZ: ' + error.message);
    }
  };
  
  // Export data to CSV/Excel
  const exportExcel = async () => {
    try {
      if (!isBrowser) return;
      
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Prepare data for Excel format
      const excelData = rawLogsData.map(log => ({
        IP: log.ip,
        Timestamp: log.timestamp,
        Method: log.method,
        Path: log.path,
        Status: log.status,
        'Bytes Transferred': log.bytes,
        'User Agent': log.user_agent,
        'Is Bot': log.is_bot ? 'Yes' : 'No'
      }));
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'NGINX Logs');
      XLSX.writeFile(wb, 'nginx_logs_export.xlsx');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };
  
  // PDF Report Generator setup
  const [pdfGeneratorRef, setPdfGeneratorRef] = useState({ current: null });
  
  useEffect(() => {
    // Initialize PDF Report Generator with all dashboard data
    const allDashboardData = {
      ...dashboardData,
      rawLogsData: rawLogsData
    };
    
    // We'll now store a reference to call methods later
    setPdfGeneratorRef({ 
      current: {
        allDashboardData
      } 
    });
  }, [dashboardData, rawLogsData]);
  
  // Export data to PDF with comprehensive report
  const exportPDF = async () => {
    try {
      if (!isBrowser || !pdfGeneratorRef.current) return;
      
      // Dynamically import the required libraries
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      const html2canvas = await import('html2canvas').then(module => module.default);
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(24);
      doc.setTextColor(40, 40, 40);
      doc.text('NGINX Logs Analysis Report', 105, 40, { align: 'center' });
      
      // Add timestamp
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 50, { align: 'center' });
      
      // Add summary information
      const summary = dashboardData?.summaryData || {};
      doc.setFontSize(14);
      doc.text('Summary Statistics', 105, 70, { align: 'center' });
      
      // Create summary table
      doc.autoTable({
        startY: 80,
        head: [['Metric', 'Value']],
        body: [
          ['Total Requests', summary.totalRequests?.toLocaleString() || '0'],
          ['Unique Visitors', summary.uniqueIPs?.toLocaleString() || '0'],
          ['Error Rate', `${summary.errorRate?.toFixed(2) || '0'}%`],
          ['Bot Traffic', `${summary.botPercentage?.toFixed(2) || '0'}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      });
      
      // Add note
      doc.setFontSize(8);
      doc.text('This report contains basic information from the NGINX Dashboard.', 105, 150, { align: 'center' });
      
      // Save the PDF
      doc.save(`nginx_logs_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error exporting to PDF: ' + error.message);
    }
  };
  
  // Handle export click
  const handleExport = () => {
    if (!rawLogsData || rawLogsData.length === 0) {
      toast.error('No data to export.');
      return;
    }
    
    if (exportDestination === 'db') {
      exportToDatabase();
      return;
    }
    
    switch (exportFormat) {
      case 'json':
        exportJSON();
        break;
      case 'excel':
        exportExcel();
        break;
      case 'pdf':
        exportPDF();
        break;
      case 'gz':
        exportGZ();
        break;
      default:
        exportJSON();
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import & Export
      </h3>
      
      {isProcessing && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-400">
            Processing... {importProgress}%
          </p>
        </div>
      )}
      
      {/* Import Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Import Logs</h4>
        
        {/* Import Source Selection */}
        <div className="mb-3">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setImportSource('file')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${importSource === 'file' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'}`}
            >
              From File
            </button>
            <button
              onClick={() => setImportSource('db')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${importSource === 'db' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-y border-r border-gray-300 dark:border-gray-600'}`}
            >
              From Database
            </button>
          </div>
        </div>
        
        {importSource === 'file' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <label className="block text-sm font-medium cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center">
                <span>Choose File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt,.log,.gz,.sql"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={isProcessing}
                />
              </label>
            </div>
            {importStatus && !isProcessing && (
              <div className="text-sm mt-2 sm:mt-0 sm:ml-2">
                <span className={importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                  {importStatus}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={importFromDatabase}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              Import from Database
            </button>
            {importStatus && !isProcessing && (
              <div className="text-sm mt-2 sm:mt-0 sm:ml-2">
                <span className={importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                  {importStatus}
                </span>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {importSource === 'file' ? 
            'Supported formats: JSON, SQL dumps, text logs (.txt, .log), compressed logs (.gz)' :
            'Import directly from database server (requires connection configuration)'}
        </p>
      </div>
      
      {/* Export Section */}
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Export Logs</h4>
        
        {/* Export Destination Selection */}
        <div className="mb-3">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setExportDestination('file')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${exportDestination === 'file' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'}`}
            >
              To File
            </button>
            <button
              onClick={() => setExportDestination('db')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${exportDestination === 'db' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-y border-r border-gray-300 dark:border-gray-600'}`}
            >
              To Database
            </button>
          </div>
        </div>
        
        {exportDestination === 'file' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700 dark:text-gray-200"
                disabled={isProcessing}
              >
                <option value="json">JSON Format</option>
                <option value="excel">Excel Format</option>
                <option value="pdf">PDF Report</option>
                <option value="gz">Compressed (.gz)</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                'Export'
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              Export to Database
            </button>
          </div>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {exportDestination === 'file' ? 
            `Export all ${rawLogsData?.length || 0} log entries in selected format.` : 
            'Export data directly to PostgreSQL database with batch processing.'}
        </p>
      </div>
    </div>
  );
}