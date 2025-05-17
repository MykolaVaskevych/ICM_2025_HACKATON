'use client';

import { useState } from 'react';
// Import libraries only on client side
const isBrowser = typeof window !== 'undefined';

export default function ImportExportPanel({ rawLogsData, onImport }) {
  const [importStatus, setImportStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle file upload for import
  const handleFileUpload = async (e) => {
    if (!isBrowser) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset the file input value to allow uploading the same file again if needed
    e.target.value = null;
    
    setIsLoading(true);
    setImportStatus(`Uploading and processing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
    
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to server API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok || result.status === 'error') {
        console.error('Server returned error:', result);
        throw new Error(result.error || 'Failed to process file');
      }
      
      // Successfully parsed logs
      if (result.status === 'success') {
        // Display success message with stats
        setImportStatus(
          `${result.message}. Stats: ${result.stats.totalRequests} requests, ${result.stats.uniqueIPs} unique IPs, ${result.stats.dataTransferred} transferred, ${result.stats.botPercentage} bot traffic`
        );
        
        // Refresh the page to show the new data after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setImportStatus('Invalid response format from server.');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Error importing file: ${error.message}. Make sure the file is a valid NGINX log file in the correct format.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Export data to PDF with charts
  const exportPDF = async () => {
    try {
      if (!isBrowser) return;
      
      setIsLoading(true);
      
      // Dynamically import jspdf and jspdf-autotable
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      
      // Create a document with portrait orientation
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229); // Indigo color
      doc.text('NGINX Log Analysis Report', 105, 15, { align: 'center' });
      
      // Add timestamp
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Fetch all data files
      const dataFiles = [
        'summary.json',
        'status_codes.json', 
        'status_categories.json',
        'bot_user.json',
        'http_methods.json',
        'top_endpoints.json',
        'top_ips.json',
        'top_referrers.json'
      ];
      
      let yPosition = 30;
      
      // 1. Add summary data
      try {
        const response = await fetch('/data/summary.json');
        const summaryData = await response.json();
        
        doc.setFontSize(16);
        doc.text('Summary Statistics', 14, yPosition);
        yPosition += 10;
        
        const tableData = [
          ['Total Requests', summaryData.total_requests?.toLocaleString() || 'N/A'],
          ['Unique IPs', summaryData.unique_ips?.toLocaleString() || 'N/A'],
          ['Data Transferred', `${summaryData.total_transferred_mb?.toFixed(2) || 'N/A'} MB`],
          ['Bot Percentage', `${summaryData.bot_percentage?.toFixed(1) || 'N/A'}%`],
          ['Success Rate', `${summaryData.success_percentage?.toFixed(1) || 'N/A'}%`],
          ['Error Rate', `${summaryData.error_percentage?.toFixed(1) || 'N/A'}%`],
          ['Most Common Status', summaryData.most_common_status || 'N/A'],
          ['Most Common Method', summaryData.most_common_method || 'N/A'],
          ['Most Popular Endpoint', summaryData.most_popular_endpoint || 'N/A']
        ];
        
        doc.autoTable({
          startY: yPosition,
          head: [['Metric', 'Value']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: 30, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding summary data:', error);
        doc.setFontSize(12);
        doc.text('Error loading summary statistics', 14, yPosition);
        yPosition += 10;
      }
      
      // 2. Add status code distribution
      try {
        const response = await fetch('/data/status_codes.json');
        const statusData = await response.json();
        
        // Add new page if needed
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.text('HTTP Status Code Distribution', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table
        const tableData = statusData.map(item => [
          `${item.status}`,
          item.count.toLocaleString(),
          `${((item.count / rawLogsData.length) * 100).toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Status Code', 'Count', 'Percentage']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding status data:', error);
      }
      
      // 3. Add bot vs. user traffic
      try {
        const response = await fetch('/data/bot_user.json');
        const botData = await response.json();
        
        // Add new page if needed
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Bot vs. User Traffic', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table
        const tableData = botData.map(item => [
          item.type,
          item.count.toLocaleString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Type', 'Count', 'Percentage']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding bot data:', error);
      }
      
      // 4. Add top endpoints
      try {
        const response = await fetch('/data/top_endpoints.json');
        const endpointData = await response.json();
        
        // Add new page 
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.text('Top Requested Endpoints', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table - limit to top 15
        const tableData = endpointData.slice(0, 15).map(item => [
          item.endpoint.length > 40 ? item.endpoint.substring(0, 37) + '...' : item.endpoint,
          item.count.toLocaleString()
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Endpoint', 'Requests']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding endpoint data:', error);
      }
      
      // 5. Add top IPs
      try {
        const response = await fetch('/data/top_ips.json');
        const ipData = await response.json();
        
        // Add new page if needed
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Top Client IPs', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table - limit to top 15
        const tableData = ipData.slice(0, 15).map(item => [
          item.ip,
          item.count.toLocaleString(),
          `${((item.count / rawLogsData.length) * 100).toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['IP Address', 'Requests', 'Percentage']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding IP data:', error);
      }
      
      // 6. Add HTTP methods
      try {
        const response = await fetch('/data/http_methods.json');
        const methodData = await response.json();
        
        // Add new page
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.text('HTTP Methods Distribution', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table
        const tableData = methodData.map(item => [
          item.method,
          item.count.toLocaleString(),
          `${((item.count / rawLogsData.length) * 100).toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Method', 'Count', 'Percentage']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding method data:', error);
      }
      
      // 7. Add referrers
      try {
        const response = await fetch('/data/top_referrers.json');
        const referrerData = await response.json();
        
        // Add new page if needed
        if (yPosition > 160) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Top Referrers', 14, yPosition);
        yPosition += 10;
        
        // Convert data for table - limit to top 10
        const tableData = referrerData.slice(0, 10).map(item => [
          item.referrer.length > 40 ? item.referrer.substring(0, 37) + '...' : item.referrer,
          item.count.toLocaleString()
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Referrer', 'Count']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: yPosition, right: 14, bottom: 20, left: 14 },
        });
        
        yPosition = doc.autoTable.previous.finalY + 15;
      } catch (error) {
        console.error('Error adding referrer data:', error);
      }
      
      // Add page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${totalPages}`, 170, 285);
      }
      
      // Add footer note
      doc.setPage(totalPages);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('NGINX Log Analyzer Dashboard', 105, 285, { align: 'center' });
      
      doc.save('nginx_logs_report.pdf');
      setIsLoading(false);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting to PDF: ' + error.message);
      setIsLoading(false);
    }
  };
  
  // Handle export click
  const handleExport = () => {
    if (!rawLogsData || rawLogsData.length === 0) {
      alert('No data to export.');
      return;
    }
    
    // Always use PDF export 
    exportPDF();
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Import & Export</h3>
      
      {/* Import Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Import Logs</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow">
            <label className={`block text-sm font-medium cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span>{isLoading ? 'Processing...' : 'Choose File'}</span>
              <input
                type="file"
                accept=".json,.txt,.log,.gz,*"
                onChange={handleFileUpload}
                className="sr-only"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Supported formats: JSON, text logs (.txt, .log), files without extensions, and gzip (.gz) log files.
        </p>
        {importStatus && (
          <div className={`mt-3 p-3 rounded text-sm ${importStatus.includes('Error') ? 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200'}`}>
            {importStatus}
          </div>
        )}
      </div>
      
      {/* Export Section */}
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Export Report</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExport}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Export to PDF'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          PDF export includes statistics and analysis from the dashboard.
        </p>
      </div>
    </div>
  );
}