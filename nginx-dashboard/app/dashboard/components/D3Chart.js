'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './chart-tooltips.css';

export default function D3Chart({ 
  data, 
  type = 'bar', 
  xKey, 
  yKey,
  width = 'auto',
  height = 'auto',
  margin = { top: 20, right: 30, bottom: 50, left: 60 },
  colors = ['#4f46e5'],
  title = '',
  showLegend = false,
  legendItems = [],
  onClick = null,
  xLabel = '',
  yLabel = '',
  maxBars = 20,
  showTooltip = true,
  className = '',
  tooltipFormatter = null,
  description = '',
  id = ''
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [isLoading, setIsLoading] = useState(true);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: containerWidth || 600,
          height: containerHeight || 300
        });
      }
    };

    // Set initial dimensions
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Draw chart
  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) {
      return;
    }

    setIsLoading(true);

    // Give the browser time to calculate dimensions
    setTimeout(() => {
      try {
        drawChart();
        setIsLoading(false);
      } catch (error) {
        console.error('Error drawing chart:', error);
        setIsLoading(false);
      }
    }, 300);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dimensions, type, xKey, yKey, colors, showLegend]);

  // Create tooltip div
  const tooltipDiv = useRef(null);

  useEffect(() => {
    // Create tooltip
    if (showTooltip && !tooltipRef.current) {
      tooltipRef.current = d3.select(tooltipDiv.current)
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none');
    }
  }, [showTooltip]);

  function drawChart() {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Get the dimensions of the container
    const fullWidth = dimensions.width;
    const fullHeight = dimensions.height;
    
    // Calculate chart dimensions
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', fullWidth)
      .attr('height', fullHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Choose chart type
    switch (type) {
      case 'bar':
        createBarChart(svg, data.slice(0, maxBars), width, height, xKey, yKey, colors, showTooltip);
        break;
      case 'line':
        createLineChart(svg, data, width, height, xKey, yKey, colors, showTooltip);
        break;
      case 'pie':
      case 'donut':
        createPieChart(svg, data, width, height, xKey, yKey, colors, type === 'donut', showTooltip);
        break;
      default:
        console.warn(`Chart type ${type} not supported`);
    }

    // Add X and Y axis labels
    if (xLabel) {
      svg.append('text')
        .attr('class', 'chart-text x-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .text(xLabel)
        .attr('fill', 'currentColor');
    }

    if (yLabel) {
      svg.append('text')
        .attr('class', 'chart-text y-label')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`)
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .text(yLabel)
        .attr('fill', 'currentColor');
    }
    
    // Add legend if enabled
    if (showLegend && legendItems && legendItems.length > 0) {
      const legendSpacing = 20;
      const legendItemWidth = 15;
      const legendItemHeight = 15;
      const legendTextOffset = 25;
      const legendGroupWidth = 150; // Space for each legend group
      const legendItems_filtered = legendItems.filter((_, i) => i < 5); // Limit to 5 legend items
      
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(0, -15)`);
      
      // Create legend items
      const legendItem = legend.selectAll('.legend-item')
        .data(legendItems_filtered)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(${i * legendGroupWidth}, 0)`);
      
      // Add colored rectangle
      legendItem.append('rect')
        .attr('width', legendItemWidth)
        .attr('height', legendItemHeight)
        .attr('fill', d => d.color);
      
      // Add label
      legendItem.append('text')
        .attr('x', legendTextOffset)
        .attr('y', legendItemHeight - 2)
        .attr('fill', 'currentColor')
        .attr('class', 'chart-text legend-text')
        .style('font-size', '12px')
        .text(d => d.label);
    }
  }

  function createBarChart(svg, data, width, height, xKey, yKey, colors, showTooltip) {
    // Sort bars for better visualization
    data = data.sort((a, b) => b[yKey] - a[yKey]);
    
    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d[xKey]))
      .range([0, width])
      .padding(0.2);
    
    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[yKey]) * 1.1]) // Add 10% padding
      .nice()
      .range([height, 0]);
    
    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d[xKey]))
      .range(colors.length >= data.length 
        ? colors 
        : d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length));
    
    // Draw X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .attr('class', 'chart-text');
    
    // Draw Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('class', 'chart-text');
      
    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.2)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
      );
    
    // Draw bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d[xKey]))
      .attr('width', x.bandwidth())
      .attr('y', height) // Start from bottom for animation
      .attr('height', 0) // Start with height 0 for animation
      .attr('fill', (d, i) => colorScale(d[xKey]))
      .attr('class', 'chart-bar')
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).attr('opacity', 0.8);
          
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', 0.9);
          
          // Create a tooltip using formatter if provided
          let tooltip;
          if (tooltipFormatter) {
            tooltip = `<div class="chart-tooltip-title">${d[xKey]}</div>
                     <div class="chart-tooltip-value">${tooltipFormatter(d)}</div>`;
          } else {
            tooltip = `
              <div class="chart-tooltip-title">${d[xKey]}</div>
              <div><span class="chart-tooltip-value">${d[yKey].toLocaleString()}</span> ${yLabel}</div>
            `;
          }
          
          tooltipRef.current.html(tooltip)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).attr('opacity', 1);
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d);
      })
      .transition() // Add animation
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('y', d => y(d[yKey]))
      .attr('height', d => Math.max(height - y(d[yKey]), 2)); // Ensure minimum height for small values
  }

  function createLineChart(svg, data, width, height, xKey, yKey, colors, showTooltip) {
    // Sort data by xKey if it's a date string
    if (typeof data[0][xKey] === 'string' && data[0][xKey].includes('-')) {
      data.sort((a, b) => new Date(a[xKey]) - new Date(b[xKey]));
    }

    // X scale
    const x = d3.scalePoint()
      .domain(data.map(d => d[xKey]))
      .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[yKey]) * 1.1]) // Add 10% padding
      .nice()
      .range([height, 0]);

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.2)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
      );

    // Draw X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .attr('class', 'chart-text');

    // Draw Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('class', 'chart-text');

    // Create line generator
    const line = d3.line()
      .x(d => x(d[xKey]))
      .y(d => y(d[yKey]))
      .curve(d3.curveMonotoneX); // Use monotone curve for smoother lines

    // Draw the line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors[0])
      .attr('stroke-width', 2.5)
      .attr('d', line)
      .attr('stroke-dasharray', function() { 
        const length = this.getTotalLength();
        return `${length} ${length}`;
      })
      .attr('stroke-dashoffset', function() { 
        const length = this.getTotalLength();
        return length;
      })
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // Add data points
    const points = svg.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => x(d[xKey]))
      .attr('cy', d => y(d[yKey]))
      .attr('r', 4)
      .attr('fill', colors[0])
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this)
            .attr('r', 6)
            .style('opacity', 1);
          
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', 0.9);
          
          // Create a tooltip using formatter if provided
          let tooltip;
          if (tooltipFormatter) {
            tooltip = `<div class="chart-tooltip-title">${d[xKey]}</div>
                     <div class="chart-tooltip-value">${tooltipFormatter(d)}</div>`;
          } else {
            tooltip = `
              <div class="chart-tooltip-title">${d[xKey]}</div>
              <div><span class="chart-tooltip-value">${d[yKey].toLocaleString()}</span> ${yLabel}</div>
            `;
          }
          
          tooltipRef.current.html(tooltip)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this)
            .attr('r', 4)
            .style('opacity', 0.8);
          
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d);
      })
      .transition()
      .delay((d, i) => i * 50 + 1000) // Start after line animation
      .duration(300)
      .style('opacity', 0.8);

    // Draw area under line if needed (optional)
    const area = d3.area()
      .x(d => x(d[xKey]))
      .y0(height)
      .y1(d => y(d[yKey]))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', colors[0])
      .attr('fill-opacity', 0.1)
      .attr('d', area)
      .attr('opacity', 0)
      .transition()
      .duration(2000)
      .attr('opacity', 1);
  }

  function createPieChart(svg, data, width, height, xKey, yKey, colors, isDonut, showTooltip) {
    // Calculate total for percentage display
    const total = d3.sum(data, d => d[yKey]);
    
    // Set inner and outer radius
    const radius = Math.min(width, height) / 2;
    const innerRadius = isDonut ? radius * 0.5 : 0;
    
    // Position pie in center
    const pieGroup = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Create pie layout
    const pie = d3.pie()
      .value(d => d[yKey])
      .sort(null); // Don't sort by value
    
    // Create arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);
    
    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d[xKey]))
      .range(colors.length >= data.length 
        ? colors 
        : d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length));
    
    // Draw pie slices
    const slices = pieGroup.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => colorScale(d.data[xKey]))
      .attr('stroke', '#fff')
      .style('stroke-width', '1px')
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', `scale(1.05)`);
          
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', 0.9);
          
          // Create a tooltip using formatter if provided
          let tooltip;
          if (tooltipFormatter) {
            tooltip = `<div class="chart-tooltip-title">${d.data[xKey]}</div>
                     <div class="chart-tooltip-value">${tooltipFormatter(d.data)}</div>`;
          } else {
            tooltip = `
              <div class="chart-tooltip-title">${d.data[xKey]}</div>
              <div><span class="chart-tooltip-value">${d.data[yKey].toLocaleString()}</span> ${yLabel}</div>
              <div class="chart-tooltip-info">${(d.endAngle - d.startAngle) > 0.2 ? Math.round(d.data[yKey] / total * 100) + '%' : ''}</div>
            `;
          }
          
          tooltipRef.current.html(tooltip)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', 'scale(1)');
          
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d.data);
      })
      .transition()
      .duration(1000)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate(
          {startAngle: d.startAngle, endAngle: d.startAngle},
          {startAngle: d.startAngle, endAngle: d.endAngle}
        );
        return function(t) {
          return arc(interpolate(t));
        };
      });
    
    // Add slice labels for large enough slices
    const labelArc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.7);
    
    pieGroup.selectAll('text')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => {
        // Only show labels for slices that take up enough space
        if ((d.endAngle - d.startAngle) < 0.2) return 'translate(-9999,-9999)';
        return `translate(${labelArc.centroid(d)})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => Math.round(d.data[yKey] / total * 100) + '%')
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .transition()
      .delay(1000) // Start after pie animation
      .duration(500)
      .style('opacity', 1);
    
    // Add a center text for donut charts
    if (isDonut) {
      pieGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '14px')
        .attr('class', 'chart-text')
        .text(`${total.toLocaleString()} ${yLabel}`);
    }
  }

  return (
    <div className={`w-full h-full ${className}`} ref={containerRef}>
      {isLoading && (
        <div className="chart-skeleton h-full w-full rounded"></div>
      )}
      <div className={`w-full h-full ${isLoading ? 'hidden' : ''} tab-content`} data-chart-type={type} data-chart-title={title}>
        <svg ref={svgRef} width="100%" height="100%" id={id || `chart-${type}-${xKey}-${yKey}`}></svg>
        {showTooltip && <div ref={tooltipDiv} className="chart-tooltip"></div>}
      </div>
    </div>
  );
}