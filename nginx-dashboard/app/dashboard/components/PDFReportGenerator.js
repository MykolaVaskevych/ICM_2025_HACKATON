'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';

/**
 * Comprehensive PDF Report Generator
 * Generates rich PDF reports with all dashboard visualizations
 */
// Hook for PDF report generation
function usePDFGenerator(dashboardData) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  /**
   * Generate a full PDF report with all visualizations
   */
  const generatePDFReport = async () => {
    if (!dashboardData) return;
    
    try {
      setIsGenerating(true);
      setProgress(10);
      
      // Dynamically import jspdf and jspdf-autotable
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      setProgress(20);
      
      // Add cover page
      addCoverPage(doc, dashboardData);
      setProgress(30);
      
      // Add traffic overview
      await addTrafficOverview(doc, dashboardData);
      setProgress(50);
      
      // Add status code distribution
      await addStatusDistribution(doc, dashboardData);
      setProgress(60);
      
      // Add bot analysis
      await addBotAnalysis(doc, dashboardData);
      setProgress(70);
      
      // Add top endpoints
      addTopEndpoints(doc, dashboardData);
      setProgress(80);
      
      // Add raw logs sample
      addRawLogsSample(doc, dashboardData);
      setProgress(90);
      
      // Add timestamp and page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer with page number
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${i} of ${totalPages} - Generated: ${new Date().toLocaleString()}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      setProgress(100);
      
      // Save the PDF
      doc.save(`nginx_logs_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF report:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Add cover page to the PDF
   */
  const addCoverPage = (doc, data) => {
    // Add title
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text('NGINX Logs Analysis Report', 105, 40, { align: 'center' });
    
    // Add timestamp
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 50, { align: 'center' });
    
    // Add logo placeholder
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(65, 60, 80, 40, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(120);
    doc.text('NGINX DASHBOARD', 105, 85, { align: 'center' });
    
    // Add summary statistics
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary Statistics', 105, 120, { align: 'center' });
    
    const summary = data.summaryData || {
      totalRequests: 0,
      uniqueIPs: 0,
      errorRate: 0,
      botPercentage: 0,
      avgBodyBytes: 0
    };
    
    // Create summary table
    doc.autoTable({
      startY: 130,
      head: [['Metric', 'Value']],
      body: [
        ['Total Requests', summary.totalRequests?.toLocaleString() || '0'],
        ['Unique Visitors', summary.uniqueIPs?.toLocaleString() || '0'],
        ['Error Rate', `${summary.errorRate?.toFixed(2) || '0'}%`],
        ['Bot Traffic', `${summary.botPercentage?.toFixed(2) || '0'}%`],
        ['Avg Response Size', `${summary.avgBodyBytes?.toLocaleString() || '0'} bytes`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 250] },
      margin: { top: 10 }
    });
    
    // Add time period covered
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Time Period Covered:', 20, 190);
    
    // Try to determine time period from data
    let startDate = 'N/A';
    let endDate = 'N/A';
    
    if (data.timelineData && data.timelineData.length > 0) {
      const dates = data.timelineData.map(d => new Date(d.fullTime || d.hour));
      if (dates.length) {
        const sortedDates = dates.sort((a, b) => a - b);
        startDate = sortedDates[0].toLocaleDateString();
        endDate = sortedDates[sortedDates.length - 1].toLocaleDateString();
      }
    }
    
    doc.text(`From: ${startDate}`, 30, 200);
    doc.text(`To: ${endDate}`, 30, 210);
    
    // Add note
    doc.setFontSize(8);
    doc.text('This report contains visualizations and analysis from the NGINX Dashboard.', 105, 250, { align: 'center' });
    
    // Add new page for next section
    doc.addPage();
  };
  
  /**
   * Add traffic overview section with charts
   */
  const addTrafficOverview = async (doc, data) => {
    // Add section title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Traffic Overview', 105, 20, { align: 'center' });
    
    // Capture traffic chart if available in the DOM
    try {
      const trafficChartElement = document.querySelector('.traffic-chart canvas');
      if (trafficChartElement) {
        const canvas = await html2canvas(trafficChartElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 20, 30, 170, 80);
      } else {
        // Placeholder if chart not found
        doc.setDrawColor(200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(20, 30, 170, 80, 3, 3, 'FD');
        doc.setFontSize(12);
        doc.setTextColor(120);
        doc.text('Traffic Timeline Chart', 105, 70, { align: 'center' });
      }
    } catch (error) {
      console.error('Error capturing traffic chart:', error);
    }
    
    // Add traffic statistics table
    doc.setFontSize(14);
    doc.text('Traffic Statistics', 105, 130, { align: 'center' });
    
    const timelineData = data.timelineData || [];
    const total = timelineData.reduce((sum, item) => sum + (item.count || 0), 0);
    const peak = Math.max(...timelineData.map(item => item.count || 0));
    const average = total / (timelineData.length || 1);
    
    doc.autoTable({
      startY: 140,
      head: [['Metric', 'Value']],
      body: [
        ['Total Requests', total.toLocaleString()],
        ['Peak Traffic (requests/hour)', peak.toLocaleString()],
        ['Average Traffic (requests/hour)', average.toFixed(2)],
        ['Time Period Duration', `${timelineData.length || 0} hours`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 40, right: 40 }
    });
    
    // Add methods chart if available
    try {
      const methodsChartElement = document.querySelector('.methods-chart canvas');
      if (methodsChartElement) {
        const canvas = await html2canvas(methodsChartElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 40, 190, 130, 70);
      }
    } catch (error) {
      console.error('Error capturing methods chart:', error);
    }
    
    // Add new page
    doc.addPage();
  };
  
  /**
   * Add status code distribution section
   */
  const addStatusDistribution = async (doc, data) => {
    // Add section title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Status Code Distribution', 105, 20, { align: 'center' });
    
    // Capture status donut chart if available
    try {
      const statusChartElement = document.querySelector('.status-chart canvas');
      if (statusChartElement) {
        const canvas = await html2canvas(statusChartElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 30, 30, 150, 80);
      } else {
        // Placeholder
        doc.setDrawColor(200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(30, 30, 150, 80, 3, 3, 'FD');
        doc.setFontSize(12);
        doc.setTextColor(120);
        doc.text('Status Code Distribution Chart', 105, 70, { align: 'center' });
      }
    } catch (error) {
      console.error('Error capturing status chart:', error);
    }
    
    // Add status codes table
    doc.setFontSize(14);
    doc.text('Status Code Breakdown', 105, 130, { align: 'center' });
    
    const statusData = data.statusData || [];
    
    // Sort status codes by count
    const sortedStatus = [...statusData].sort((a, b) => (b.count || 0) - (a.count || 0));
    
    // Create table rows from status data
    const tableRows = sortedStatus.slice(0, 10).map(status => {
      let statusDescription = '';
      
      // Add status code descriptions
      if (status.status >= 200 && status.status < 300) statusDescription = 'Success';
      else if (status.status >= 300 && status.status < 400) statusDescription = 'Redirection';
      else if (status.status >= 400 && status.status < 500) statusDescription = 'Client Error';
      else if (status.status >= 500) statusDescription = 'Server Error';
      
      return [
        status.status?.toString() || '',
        statusDescription,
        status.count?.toLocaleString() || '0',
        `${status.percentage?.toFixed(2) || '0'}%`
      ];
    });
    
    doc.autoTable({
      startY: 140,
      head: [['Status Code', 'Type', 'Count', 'Percentage']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 250] },
      margin: { left: 30, right: 30 }
    });
    
    // Add error path analysis if available
    if (data.errorPathsData && data.errorPathsData.length > 0) {
      const finalY = doc.lastAutoTable.finalY || 200;
      
      if (finalY + 60 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Top Error Paths', 105, 20, { align: 'center' });
        
        doc.autoTable({
          startY: 30,
          head: [['Path', 'Status', 'Count']],
          body: data.errorPathsData.slice(0, 8).map(item => [
            item.path || '',
            item.status || '',
            item.count?.toLocaleString() || '0'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 }
          },
          margin: { left: 20, right: 20 }
        });
      } else {
        doc.setFontSize(14);
        doc.text('Top Error Paths', 105, finalY + 20, { align: 'center' });
        
        doc.autoTable({
          startY: finalY + 30,
          head: [['Path', 'Status', 'Count']],
          body: data.errorPathsData.slice(0, 5).map(item => [
            item.path || '',
            item.status || '',
            item.count?.toLocaleString() || '0'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 }
          },
          margin: { left: 20, right: 20 }
        });
      }
    }
    
    // Add new page
    doc.addPage();
  };
  
  /**
   * Add bot analysis section
   */
  const addBotAnalysis = async (doc, data) => {
    // Add section title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Bot Traffic Analysis', 105, 20, { align: 'center' });
    
    // Capture bot chart if available
    try {
      const botChartElement = document.querySelector('.bot-chart canvas');
      if (botChartElement) {
        const canvas = await html2canvas(botChartElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 30, 30, 150, 80);
      } else {
        // Placeholder
        doc.setDrawColor(200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(30, 30, 150, 80, 3, 3, 'FD');
        doc.setFontSize(12);
        doc.setTextColor(120);
        doc.text('Bot vs User Traffic Chart', 105, 70, { align: 'center' });
      }
    } catch (error) {
      console.error('Error capturing bot chart:', error);
    }
    
    // Add bot statistics
    const botData = data.botUserData || [];
    const botSummary = botData.find(item => item.type === 'Bot') || { count: 0, percentage: 0 };
    const userSummary = botData.find(item => item.type === 'User') || { count: 0, percentage: 0 };
    
    doc.setFontSize(14);
    doc.text('Bot Traffic Summary', 105, 130, { align: 'center' });
    
    doc.autoTable({
      startY: 140,
      head: [['Metric', 'Value']],
      body: [
        ['Bot Requests', botSummary.count?.toLocaleString() || '0'],
        ['Human Requests', userSummary.count?.toLocaleString() || '0'],
        ['Bot Percentage', `${botSummary.percentage?.toFixed(2) || '0'}%`],
        ['Human Percentage', `${userSummary.percentage?.toFixed(2) || '0'}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 250] },
      margin: { left: 40, right: 40 }
    });
    
    // Add top bot user agents if available
    if (data.rawLogsData) {
      // Extract bot user agents
      const botLogs = data.rawLogsData.filter(log => log.is_bot);
      const userAgentCounts = {};
      
      botLogs.forEach(log => {
        const ua = log.user_agent || 'Unknown';
        userAgentCounts[ua] = (userAgentCounts[ua] || 0) + 1;
      });
      
      // Convert to array and sort
      const topBotAgents = Object.entries(userAgentCounts)
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      const finalY = doc.lastAutoTable.finalY || 180;
      
      doc.setFontSize(14);
      doc.text('Top Bot User Agents', 105, finalY + 20, { align: 'center' });
      
      doc.autoTable({
        startY: finalY + 30,
        head: [['User Agent', 'Requests']],
        body: topBotAgents.map(item => [
          item.agent.length > 50 ? item.agent.substring(0, 50) + '...' : item.agent,
          item.count.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 30 }
        },
        margin: { left: 20, right: 20 }
      });
    }
    
    // Add new page
    doc.addPage();
  };
  
  /**
   * Add top endpoints section
   */
  const addTopEndpoints = (doc, data) => {
    // Add section title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Top Requested Endpoints', 105, 20, { align: 'center' });
    
    // Add endpoints table
    const endpointsData = data.endpointsData || [];
    
    doc.autoTable({
      startY: 30,
      head: [['Path', 'Requests', 'Percentage']],
      body: endpointsData.slice(0, 15).map(item => [
        item.endpoint || item.path || '',
        item.count?.toLocaleString() || '0',
        `${((item.count / (data.summaryData?.totalRequests || 1)) * 100).toFixed(2)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 250] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Add top IPs if available
    if (data.ipsData && data.ipsData.length > 0) {
      const finalY = doc.lastAutoTable.finalY || 120;
      
      doc.setFontSize(14);
      doc.text('Top IP Addresses', 105, finalY + 20, { align: 'center' });
      
      doc.autoTable({
        startY: finalY + 30,
        head: [['IP Address', 'Requests', 'Bot Traffic']],
        body: data.ipsData.slice(0, 10).map(item => [
          item.ip || '',
          item.count?.toLocaleString() || '0',
          item.is_bot === true ? 'Yes' : 'No'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 250] },
        margin: { left: 30, right: 30 }
      });
    }
    
    // Add new page
    doc.addPage();
  };
  
  /**
   * Add raw logs sample to the PDF
   */
  const addRawLogsSample = (doc, data) => {
    // Add section title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Sample Log Entries', 105, 20, { align: 'center' });
    
    // Add raw logs sample
    const logsData = data.rawLogsData || [];
    
    doc.autoTable({
      startY: 30,
      head: [['Time', 'IP', 'Method', 'Path', 'Status', 'Size']],
      body: logsData.slice(0, 20).map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.ip || '',
        log.method || '',
        log.path?.length > 30 ? log.path.substring(0, 30) + '...' : log.path || '',
        log.status || '',
        log.bytes?.toLocaleString() || '0'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 250] },
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8 }
    });
    
    // Add note about data filtering
    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Note: This is a sample of the log entries. The full dataset contains ', 105, finalY + 20, { align: 'center' });
    doc.text(`${logsData.length.toLocaleString()} records.`, 105, finalY + 30, { align: 'center' });
  };
  
  return {
    generatePDFReport,
    isGenerating,
    progress
  };
}

// Wrapper component for PDF generation
export default function PDFReportGenerator({ dashboardData }) {
  const { generatePDFReport, isGenerating, progress } = usePDFGenerator(dashboardData);
  
  return (
    <div className="pdf-report-generator">
      <button 
        onClick={generatePDFReport}
        disabled={isGenerating}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center"
      >
        {isGenerating ? (
          <>
            <span className="mr-2">Generating PDF ({progress}%)</span>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate PDF Report
          </>
        )}
      </button>
    </div>
  );
}