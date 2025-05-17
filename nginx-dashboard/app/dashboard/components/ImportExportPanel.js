'use client';

import { useState } from 'react';
// Import libraries only on client side
const isBrowser = typeof window !== 'undefined';

export default function ImportExportPanel({ rawLogsData, onImport }) {
  const [importStatus, setImportStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  
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
        // This would normally require server-side processing
        setImportStatus('Gzip import requires server-side processing. Please use the Python script for importing .gz files.');
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
  
  // Export data to PDF
  const exportPDF = async () => {
    try {
      if (!isBrowser) return;
      
      // Dynamically import jspdf and jspdf-autotable
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('NGINX Logs Export', 14, 22);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Create table data
      const tableData = rawLogsData.map(log => [
        log.ip,
        new Date(log.timestamp).toLocaleString(),
        log.status,
        log.method,
        log.path.substring(0, 30) + (log.path.length > 30 ? '...' : ''),
        log.is_bot ? 'Yes' : 'No'
      ]);
      
      // Create table with autotable
      doc.autoTable({
        startY: 35,
        head: [['IP Address', 'Timestamp', 'Status', 'Method', 'Path', 'Bot']],
        body: tableData.slice(0, 100), // Limit to 100 rows for PDF size
        didDrawPage: function(data) {
          doc.text('Page ' + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
        margin: { top: 35 },
        headStyles: { fillColor: [79, 70, 229] }
      });
      
      // Add note if records were limited
      if (rawLogsData.length > 100) {
        const lastY = doc.lastAutoTable.finalY + 10;
        doc.text(`Note: Export limited to 100 records out of ${rawLogsData.length} total.`, 14, lastY);
      }
      
      doc.save('nginx_logs_export.pdf');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting to PDF: ' + error.message);
    }
  };
  
  // Handle export click
  const handleExport = () => {
    if (!rawLogsData || rawLogsData.length === 0) {
      alert('No data to export.');
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
      default:
        exportJSON();
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Import & Export</h3>
      
      {/* Import Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Import Logs</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow">
            <label className="block text-sm font-medium cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center">
              <span>Choose File</span>
              <input
                type="file"
                accept=".json,.txt,.log,.gz"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
          {importStatus && (
            <div className="text-sm mt-2 sm:mt-0 sm:ml-2">
              <span className={importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                {importStatus}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Supported formats: JSON, text logs (.txt, .log). For gzip files, use Python import script.
        </p>
      </div>
      
      {/* Export Section */}
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Export Logs</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="json">JSON Format</option>
              <option value="excel">Excel Format</option>
              <option value="pdf">PDF Report</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors"
          >
            Export
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Export all {rawLogsData?.length || 0} log entries in selected format.
        </p>
      </div>
    </div>
  );
}