'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

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
  className = ''
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

  useEffect(() => {
    // Loading state
    if (!data || data.length === 0) {
      setIsLoading(true);
      return;
    }
    
    setIsLoading(false);

    if (!svgRef.current || !containerRef.current) return;

    // Clean up previous chart and tooltip
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Remove any previous tooltips that might be lingering
    d3.selectAll('.chart-tooltip').remove();

    // Create tooltip if it doesn't exist
    if (!tooltipRef.current) {
      tooltipRef.current = d3.select('body')
        .append('div')
        .attr('class', 'chart-tooltip')
        .style('opacity', 0);
    }

    // Use consistent dimensions
    const chartWidth = dimensions.width > 0 ? dimensions.width : 600;
    const chartHeight = dimensions.height > 0 ? dimensions.height : 300;
    
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title if provided
    if (title) {
      svg.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-text')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(title);
    }

    // Limit the number of bars if needed
    let chartData = [...data];
    if (type === 'bar' && chartData.length > maxBars) {
      chartData = chartData.slice(0, maxBars);
    }

    // Create the chart based on type
    if (type === 'bar') {
      createBarChart(svg, chartData, innerWidth, innerHeight, xKey, yKey, colors, showTooltip, onClick);
    } else if (type === 'line') {
      createLineChart(svg, chartData, innerWidth, innerHeight, xKey, yKey, colors, showTooltip);
    } else if (type === 'pie') {
      createPieChart(svg, chartData, Math.min(innerWidth, innerHeight) / 2, xKey, yKey, colors, showTooltip, onClick);
    } else if (type === 'donut') {
      createDonutChart(svg, chartData, Math.min(innerWidth, innerHeight) / 2, xKey, yKey, colors, showTooltip, onClick);
    }

    // Add x-axis label
    if (xLabel && type !== 'pie' && type !== 'donut') {
      svg.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-text')
        .text(xLabel);
    }

    // Add y-axis label
    if (yLabel && type !== 'pie' && type !== 'donut') {
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -40)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-text')
        .text(yLabel);
    }

    // Add legend if needed
    if (showLegend && legendItems.length > 0) {
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth - 100}, 0)`);

      legendItems.forEach((item, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
        
        legendRow.append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', item.color || colors[i % colors.length]);
        
        legendRow.append('text')
          .attr('x', 15)
          .attr('y', 10)
          .attr('text-anchor', 'start')
          .attr('class', 'chart-text')
          .style('font-size', '12px')
          .text(item.label);
      });
    }
  }, [data, type, xKey, yKey, dimensions, margin, colors, title, showLegend, legendItems, onClick, xLabel, yLabel, maxBars, showTooltip]);

  function createBarChart(svg, data, width, height, xKey, yKey, colors, showTooltip, onClick) {
    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d[xKey]))
      .range([0, width])
      .padding(0.2);

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[yKey]) * 1.1]) // Add 10% padding at top
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

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('class', 'chart-text')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => d >= 1000 ? `${d/1000}k` : d) // Format large numbers
      )
      .selectAll('text')
      .attr('class', 'chart-text');

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d[xKey]))
      .range(colors);

    // Add bars with animation
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d[xKey]))
      .attr('y', height) // Start from bottom for animation
      .attr('width', x.bandwidth())
      .attr('height', 0) // Start with height 0 for animation
      .attr('fill', d => color(d[xKey]))
      .attr('rx', 2) // Rounded corners
      .style('cursor', onClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).attr('opacity', 0.8);
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', .9);
            
          // Format the tooltip text
          const formattedValue = d[yKey].toLocaleString();
          tooltipRef.current.html(`<strong>${d[xKey]}</strong>: ${formattedValue}`)
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
      .attr('height', d => height - y(d[yKey]));
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

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('class', 'chart-text')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => d >= 1000 ? `${d/1000}k` : d) // Format large numbers
      )
      .selectAll('text')
      .attr('class', 'chart-text');

    // Define the line
    const line = d3.line()
      .x(d => x(d[xKey]))
      .y(d => y(d[yKey]))
      .curve(d3.curveMonotoneX);

    // Add area under the line
    svg.append('path')
      .datum(data)
      .attr('fill', colors[0])
      .attr('fill-opacity', 0.1)
      .attr('d', d3.area()
        .x(d => x(d[xKey]))
        .y0(height)
        .y1(d => y(d[yKey]))
        .curve(d3.curveMonotoneX)
      );

    // Add the line path with animation
    const path = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors[0])
      .attr('stroke-width', 3)
      .attr('d', line);

    // Animate the line
    const pathLength = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', pathLength)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(1000)
      .attr('stroke-dashoffset', 0);

    // Add dots with animation
    svg.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d[xKey]))
      .attr('cy', height) // Start at bottom for animation
      .attr('r', 0) // Start with radius 0 for animation
      .attr('fill', colors[0])
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).attr('r', 8);
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', .9);
            
          // Format the tooltip text
          const formattedValue = d[yKey].toLocaleString();
          tooltipRef.current.html(`<strong>${d[xKey]}</strong>: ${formattedValue}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).attr('r', 5);
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .transition() // Add animation
      .duration(800)
      .delay((d, i) => i * 50 + 500) // Delay to start after line animation
      .attr('cy', d => y(d[yKey]))
      .attr('r', 5);
  }

  function createPieChart(svg, data, radius, xKey, yKey, colors, showTooltip, onClick) {
    // Move the center of the pie chart
    svg.attr('transform', `translate(${dimensions.width/2}, ${dimensions.height/2})`);
    
    // Color scale
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d[xKey]))
      .range(colors.length >= data.length ? colors : d3.schemeCategory10);

    // Compute the position of each group on the pie
    const pie = d3.pie()
      .value(d => d[yKey])
      .sort(null);

    const data_ready = pie(data);

    // Build the pie chart
    const arcGenerator = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Add the slices with animation
    svg
      .selectAll('slices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', d => color(d.data[xKey]))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.8)
      .style('cursor', onClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).style('opacity', 1);
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', .9);
          const percentage = Math.round((d.data[yKey] / d3.sum(data, d => d[yKey])) * 100);
          tooltipRef.current.html(`<strong>${d.data[xKey]}</strong>: ${d.data[yKey].toLocaleString()} (${percentage}%)`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).style('opacity', 0.8);
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d.data);
      })
      .transition() // Add animation
      .duration(800)
      .attrTween('d', function(d) {
        const i = d3.interpolate({startAngle: d.startAngle, endAngle: d.startAngle}, d);
        return function(t) { return arcGenerator(i(t)); };
      });

    // Add labels inside the slices
    if (data.length <= 8) {
      svg
        .selectAll('slices')
        .data(data_ready)
        .enter()
        .append('text')
        .text(d => {
          const percentage = Math.round((d.data[yKey] / d3.sum(data, d => d[yKey])) * 100);
          return percentage >= 5 ? `${percentage}%` : '';
        })
        .attr('transform', d => `translate(${arcGenerator.centroid(d)})`)
        .style('text-anchor', 'middle')
        .attr('class', 'chart-text')
        .style('font-size', '12px')
        .style('fill', 'white')
        .style('opacity', 0)
        .transition()
        .delay(800) // Start after slice animation
        .duration(500)
        .style('opacity', 1);
    }
  }

  function createDonutChart(svg, data, radius, xKey, yKey, colors, showTooltip, onClick) {
    // Move the center of the donut chart
    svg.attr('transform', `translate(${dimensions.width/2}, ${dimensions.height/2})`);
    
    // Color scale
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d[xKey]))
      .range(colors.length >= data.length ? colors : d3.schemeCategory10);

    // Compute the position of each group on the donut
    const pie = d3.pie()
      .value(d => d[yKey])
      .sort(null);

    const data_ready = pie(data);

    // Build the donut chart
    const arcGenerator = d3.arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    // Add the slices with animation
    svg
      .selectAll('slices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', d => color(d.data[xKey]))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.8)
      .style('cursor', onClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).style('opacity', 1);
          tooltipRef.current
            .transition()
            .duration(200)
            .style('opacity', .9);
          const percentage = Math.round((d.data[yKey] / d3.sum(data, d => d[yKey])) * 100);
          tooltipRef.current.html(`<strong>${d.data[xKey]}</strong>: ${d.data[yKey].toLocaleString()} (${percentage}%)`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        if (showTooltip && tooltipRef.current) {
          d3.select(this).style('opacity', 0.8);
          tooltipRef.current
            .transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        if (onClick) onClick(d.data);
      })
      .transition() // Add animation
      .duration(800)
      .attrTween('d', function(d) {
        const i = d3.interpolate({startAngle: d.startAngle, endAngle: d.startAngle}, d);
        return function(t) { return arcGenerator(i(t)); };
      });

    // Add the total value in the center
    const total = d3.sum(data, d => d[yKey]);
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('class', 'chart-text')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .text('0')
      .transition()
      .duration(1000)
      .tween('text', function() {
        const i = d3.interpolateNumber(0, total);
        return function(t) {
          this.textContent = Math.round(i(t)).toLocaleString();
        };
      });
    
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .attr('class', 'chart-text')
      .style('font-size', '14px')
      .text('Total');
  }

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full flex items-center justify-center overflow-visible chart-container ${className}`}
    >
      {isLoading ? (
        <div className="chart-skeleton"></div>
      ) : (
        <svg ref={svgRef} className="overflow-visible"></svg>
      )}
    </div>
  );
}