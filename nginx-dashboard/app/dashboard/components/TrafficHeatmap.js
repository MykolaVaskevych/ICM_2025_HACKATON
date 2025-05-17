'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * TrafficHeatmap Component
 * 
 * A heatmap visualization showing traffic patterns by hour and day of week.
 * Uses D3.js for rendering.
 */
export default function TrafficHeatmap({ data = [], className = '' }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Process the data for the heatmap
  const processData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];
    
    // Create a map for day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);
    
    // Initialize the grid with zeros
    const grid = daysOfWeek.map(day => {
      return hoursOfDay.map(hour => ({
        day,
        hour,
        value: 0
      }));
    }).flat();
    
    // Fill in the grid with actual data
    rawData.forEach(item => {
      const date = new Date(item.timestamp);
      const dayOfWeek = date.getDay(); // 0-6, Sunday is 0
      const hour = date.getHours(); // 0-23
      
      // Find the matching cell and increment the value
      const cell = grid.find(cell => 
        cell.day === daysOfWeek[dayOfWeek] && 
        cell.hour === hour
      );
      
      if (cell) {
        cell.value += 1;
      }
    });
    
    return grid;
  };
  
  // Set up resize observer to handle responsive sizing
  useEffect(() => {
    if (!svgRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    
    resizeObserver.observe(svgRef.current.parentElement);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Render the heatmap
  useEffect(() => {
    if (!svgRef.current || !tooltipRef.current || !dimensions.width || !data.length) return;
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const processedData = processData(data);
    if (!processedData.length) return;
    
    // Calculate maximum value for color scale
    const maxValue = d3.max(processedData, d => d.value);
    
    // Set up dimensions
    const margin = { top: 40, right: 25, bottom: 25, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    // Days of week and hours for the axes
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create color scale
    const colorScale = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateInferno);
    
    // Create scales for X and Y axes
    const x = d3.scaleBand()
      .domain(hoursOfDay)
      .range([0, width])
      .padding(0.05);
    
    const y = d3.scaleBand()
      .domain(daysOfWeek)
      .range([0, height])
      .padding(0.05);
    
    // Create the heatmap rectangles
    svg.selectAll('rect')
      .data(processedData)
      .enter()
      .append('rect')
      .attr('x', d => x(d.hour))
      .attr('y', d => y(d.day))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => d.value === 0 ? '#f3f4f6' : colorScale(d.value))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', '#6366f1')
          .attr('stroke-width', 2);
        
        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style('opacity', 1)
          .html(`
            <div class="text-sm font-medium">${d.day}, ${d.hour}:00</div>
            <div class="font-bold">${d.value} requests</div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 1);
        
        // Hide tooltip
        d3.select(tooltipRef.current)
          .style('opacity', 0);
      });
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickFormat(d => `${d}:00`)
        .tickValues(hoursOfDay.filter(h => h % 3 === 0)) // Show every 3 hours for readability
      )
      .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
      
    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y));
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Traffic Patterns by Day and Hour');
    
    // Add color scale legend
    const legendWidth = 200;
    const legendHeight = 15;
    
    const legendX = width - legendWidth;
    const legendY = -margin.top / 2;
    
    // Create gradient for the legend
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    // Add the color stops to the gradient
    const colorStops = 10;
    for (let i = 0; i <= colorStops; i++) {
      const offset = i / colorStops;
      gradient.append('stop')
        .attr('offset', `${offset * 100}%`)
        .attr('stop-color', colorScale(offset * maxValue));
    }
    
    // Add the colored rectangle using the gradient
    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    // Add legend labels
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .style('text-anchor', 'start')
      .style('font-size', '12px')
      .text('0');
    
    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 5)
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .text(`${maxValue}`);
    
    svg.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 5)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Request Volume');
  }, [dimensions, data]);
  
  return (
    <div className={`relative ${className}`}>
      <div className="w-full overflow-auto">
        <svg ref={svgRef}></svg>
      </div>
      <div 
        ref={tooltipRef}
        className="absolute opacity-0 pointer-events-none bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 transition-opacity duration-200 z-10"
      ></div>
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No data available for heatmap</p>
        </div>
      )}
    </div>
  );
}