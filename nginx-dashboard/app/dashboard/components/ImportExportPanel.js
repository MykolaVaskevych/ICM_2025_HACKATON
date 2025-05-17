'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PDFReportGenerator from './PDFReportGenerator';

// Create a safe toast wrapper to avoid "toast is not defined" errors
const safeToast = {
  success: (message) => {
    console.log('[Toast Success]:', message);
    if (typeof toast !== 'undefined' && toast.success) {
      toast.success(message);
    }
  },
  error: (message) => {
    console.error('[Toast Error]:', message);
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error(message);
    }
  }
};
// Import libraries only on client side
const isBrowser = typeof window !== 'undefined';

export default function ImportExportPanel({ rawLogsData, dashboardData, onImport }) {
  const [importStatus, setImportStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  // Handle file upload for import
  const handleFileUpload = async (e) => {
    if (!isBrowser) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    setImportStatus('Loading...');
    setIsProcessing(true);
    
    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      // Process all file types through the unified API endpoint
      const formData = new FormData();
      formData.append('file', file);
      
      // Track progress for large files
      let uploadProgress = 0;
      const updateProgressInterval = setInterval(() => {
        if (uploadProgress < 90) {
          uploadProgress += 5;
          setImportProgress(uploadProgress);
        }
      }, 500);
      
      try {
        const response = await fetch('/api/import/file', {
          method: 'POST',
          body: formData
        });
        
        // Clear progress interval
        clearInterval(updateProgressInterval);
        setImportProgress(95);
        
        if (!response.ok) {
          throw new Error(`Failed to process file: ${response.statusText}`);
        }
        
        const result = await response.json();
        setImportProgress(100);
        
        if (result.success) {
          if (result.count > 0 && onImport) {
            // Trigger parent component refresh
            onImport(result.data || []);
          }
          
          setImportStatus(`Successfully imported ${result.count} log entries.`);
          safeToast.success(`Import complete: ${result.count} log entries processed`);
        } else {
          throw new Error(result.message || 'Unknown error during import');
        }
      } catch (error) {
        console.error('Error importing file:', error);
        setImportStatus(`Error: ${error.message}`);
        safeToast.error(`Import failed: ${error.message}`);
      } finally {
        setIsProcessing(false);
        setTimeout(() => setImportProgress(0), 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Error importing file: ${error.message}`);
      setIsProcessing(false);
      safeToast.error('Import failed');
    }
  };
  
  // Export to database functionality removed
  
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
      toast.success('Export complete! File saved as nginx_logs_export.gz');
    } catch (error) {
      console.error('GZ export error:', error);
      setIsProcessing(false);
      toast.error('Error exporting to GZ: ' + error.message);
    }
  };
  
  // Export data to Excel
  const exportExcel = async () => {
    try {
      if (!isBrowser) return;
      
      // Dynamically import xlsx library
      const XLSX = await import('xlsx').then(m => m.default);
      const { saveAs } = await import('file-saver');
      
      // Create new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create worksheet from JSON data
      const worksheet = XLSX.utils.json_to_sheet(
        rawLogsData.map(log => ({
          Timestamp: new Date(log.timestamp).toLocaleString(),
          IP: log.ip,
          Method: log.method,
          Path: log.path,
          Protocol: log.protocol,
          Status: log.status,
          Size: log.bytes,
          Referrer: log.referrer,
          'User Agent': log.user_agent,
          Bot: log.is_bot ? 'Yes' : 'No'
        }))
      );
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'NGINX Logs');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save file
      saveAs(blob, 'nginx_logs_export.xlsx');
      
      toast.success('Export to Excel complete!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Error exporting to Excel: ' + error.message);
    }
  };
  
  // Export data to PDF report
  const exportPDF = async () => {
    try {
      if (!isBrowser) return;
      
      setIsProcessing(true);
      
      // Set up document data
      const documentData = {
        ...dashboardData,
        rawLogsData: rawLogsData
      };
      
      // Use the PDFReportGenerator to create PDF
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas').then(m => m.default);
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add basic information (title, date, summary)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('NGINX Logs Analysis', 105, 20, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
      
      // Add summary statistics
      const summary = {
        totalRequests: rawLogsData.length,
        successfulRequests: rawLogsData.filter(log => log.status >= 200 && log.status < 400).length,
        errorRequests: rawLogsData.filter(log => log.status >= 400).length,
        botRequests: rawLogsData.filter(log => log.is_bot).length
      };
      
      // Add note
      doc.setFontSize(8);
      doc.text('This report contains basic information from the NGINX Dashboard.', 105, 150, { align: 'center' });
      
      // Save the PDF
      doc.save(`nginx_logs_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error exporting to PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle export click
  const handleExport = () => {
    if (!rawLogsData || rawLogsData.length === 0) {
      toast.error('No data to export.');
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
        
        {/* File import only */}
        <div className="mb-3">
          <div className="flex rounded-md shadow-sm">
            <div className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white">
              From File
            </div>
          </div>
        </div>
        
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
              />
            </label>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            Import
          </button>
          {importStatus && (
            <div className="text-sm">
              <span className={importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                {importStatus}
              </span>
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Supported formats: JSON, SQL dumps, text logs (.txt, .log), compressed logs (.gz)
        </p>
      </div>
      
      {/* Export Section */}
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Export Logs</h4>
        
        {/* Export to File Only */}
        <div className="mb-3">
          <div className="flex rounded-md shadow-sm">
            <div className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white">
              To File
            </div>
          </div>
        </div>
        
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
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Export all {rawLogsData?.length || 0} log entries in selected format.
        </p>
      </div>
    </div>
  );
}