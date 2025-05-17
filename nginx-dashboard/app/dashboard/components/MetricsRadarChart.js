'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './chart-tooltips.css';

/**
 * MetricsRadarChart - D3 radar chart for comparing metrics across time periods
 * 
 * @param {Object} props Component props
 * @param {Array} props.data Array of data points with metrics to compare
 * @param {Array} props.metrics Array of metric keys to display in the radar chart
 * @param {Array} props.periods Array of period names to compare (e.g., "Today", "Yesterday")
 * @param {Array} props.periodKeys Array of keys in the data that correspond to each period
 * @param {Object} props.colors Colors for each time period
 * @param {Object} props.labels Labels for each metric
 * @param {number} props.width Chart width (optional)
 * @param {number} props.height Chart height (optional)
 * @param {string} props.title Chart title (optional)
 * @param {boolean} props.showLegend Whether to show the legend (optional)
 * @param {Array} props.legendItems Legend items (optional)
 * @param {Function} props.onClick Click handler for radar areas (optional)
 * @param {boolean} props.showTooltip Whether to show tooltips (optional)
 * @param {Function} props.tooltipFormatter Custom tooltip formatter (optional)
 * @param {string} props.className Additional CSS class names (optional)
 */
export default function MetricsRadarChart({ 
  data = [], 
  metrics = [],
  periods = ['Current', 'Previous'],
  periodKeys = ['current', 'previous'],
  colors = ['#4f46e5', '#ef4444'],
  labels = {},
  units = {},
  width = 'auto',
  height = 'auto',
  margin = { top: 40, right: 80, bottom: 40, left: 80 },
  title = '',
  showLegend = true,
  legendItems = [],
  onClick = null,
  showTooltip = true,
  tooltipFormatter = null,
  className = ''
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [isLoading, setIsLoading] = useState(true);

  // Generate legend items if not provided
  const derivedLegendItems = legendItems.length > 0 ? legendItems : 
    periods.map((period, i) => ({
      label: period,
      color: colors[i % colors.length]
    }));

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: containerWidth || 600,
          height: containerHeight || 500
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
    if (!data || data.length === 0 || !containerRef.current || metrics.length === 0) {
      return;
    }

    setIsLoading(true);

    // Give the browser time to calculate dimensions
    setTimeout(() => {
      try {
        drawChart();
        setIsLoading(false);
      } catch (error) {
        console.error('Error drawing radar chart:', error);
        setIsLoading(false);
      }
    }, 300);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dimensions, metrics, periods, periodKeys, colors]);

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
    if (!svgRef.current || !data || data.length === 0 || metrics.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Get the dimensions of the container
    const fullWidth = dimensions.width;
    const fullHeight = dimensions.height;
    
    // Calculate chart dimensions
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', fullWidth)
      .attr('height', fullHeight)
      .append('g')
      .attr('transform', `translate(${fullWidth / 2},${fullHeight / 2})`);

    // Create radar chart
    createRadarChart(svg, data, radius, metrics, periods, periodKeys, colors);
  }

  function createRadarChart(svg, data, radius, metrics, periods, periodKeys, colors) {
    const angleSlice = Math.PI * 2 / metrics.length;

    // Scale for the radius
    const rScale = d3.scaleLinear()
      .range([0, radius])
      .domain([0, 1]);  // Normalized domain [0, 1]

    // Find max value for each metric to normalize
    const maxValues = {};
    metrics.forEach(metric => {
      maxValues[metric] = d3.max(data, d => {
        return Math.max(...periodKeys.map(period => d[period]?.[metric] || 0));
      });
    });

    // Draw the circular grid
    const levels = 5;
    const levelFactor = radius / levels;

    // Build the circular grid
    const gridWrapper = svg.append('g').attr('class', 'gridWrapper');

    // Background circles
    gridWrapper.selectAll('.axisCircle')
      .data(d3.range(1, levels + 1).reverse())
      .enter()
      .append('circle')
      .attr('class', 'axisCircle')
      .attr('r', d => levelFactor * d)
      .attr('fill', 'none')
      .attr('stroke', 'gray')
      .attr('stroke-opacity', 0.1);

    // Create the straight lines radiating outward
    const axis = svg.append('g').attr('class', 'axis');
    
    // Draw axis lines and labels
    axis.selectAll('.axis')
      .data(metrics)
      .enter()
      .append('g')
      .attr('class', 'axis')
      .each(function(d, i) {
        const g = d3.select(this);
        
        // Line
        g.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', radius * Math.cos(angleSlice * i - Math.PI / 2))
          .attr('y2', radius * Math.sin(angleSlice * i - Math.PI / 2))
          .attr('class', 'line')
          .attr('stroke', 'gray')
          .attr('stroke-opacity', 0.3);
        
        // Label
        g.append('text')
          .attr('class', 'legend')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('x', (radius + 20) * Math.cos(angleSlice * i - Math.PI / 2))
          .attr('y', (radius + 20) * Math.sin(angleSlice * i - Math.PI / 2))
          .text(labels[d] || d)
          .attr('fill', 'currentColor')
          .style('font-size', '12px')
          .style('font-weight', '500');
      });
    
    // Create the radar chart areas for each period
    periodKeys.forEach((periodKey, periodIndex) => {
      const radarLine = d3.lineRadial()
        .curve(d3.curveCardinalClosed)
        .radius(d => d.value)
        .angle((d, i) => i * angleSlice);
      
      // Prepare data for the radar chart
      const radarData = [{
        metrics: metrics.map((metric, i) => {
          const value = data[0]?.[periodKey]?.[metric] || 0;
          const normalizedValue = maxValues[metric] ? value / maxValues[metric] : 0;
          return {
            key: metric,
            value: rScale(normalizedValue),
            originalValue: value,
            angle: angleSlice * i - Math.PI / 2,
            maxValue: maxValues[metric]
          };
        })
      }];
      
      // Create a group for this period
      const periodGroup = svg.append('g')
        .attr('class', `radarWrapper period-${periodIndex}`);

      // Draw the area
      periodGroup.append('path')
        .datum(radarData[0].metrics)
        .attr('class', `radarArea period-${periodIndex}`)
        .attr('d', d => radarLine(d))
        .attr('fill', colors[periodIndex])
        .attr('fill-opacity', 0.2)
        .attr('stroke', colors[periodIndex])
        .attr('stroke-width', 2)
        .on('mouseover', function(event) {
          if (showTooltip && tooltipRef.current) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('fill-opacity', 0.6);
            
            // Prepare tooltip content
            const tipContent = `
              <div class="chart-tooltip-title">${periods[periodIndex]}</div>
              <div class="chart-tooltip-info">Hover over data points for details</div>
            `;
            
            tooltipRef.current
              .transition().duration(200)
              .style('opacity', 0.9);
            
            tooltipRef.current.html(tipContent)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          }
        })
        .on('mouseout', function() {
          if (showTooltip && tooltipRef.current) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('fill-opacity', 0.2);
            
            tooltipRef.current
              .transition().duration(500)
              .style('opacity', 0);
          }
        })
        .on('click', function() {
          if (onClick) onClick(periods[periodIndex]);
        });

      // Draw data points
      periodGroup.selectAll(`.radarPoint-${periodIndex}`)
        .data(radarData[0].metrics)
        .enter()
        .append('circle')
        .attr('class', `radarPoint-${periodIndex}`)
        .attr('r', 5)
        .attr('cx', d => d.value * Math.cos(d.angle))
        .attr('cy', d => d.value * Math.sin(d.angle))
        .attr('fill', colors[periodIndex])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
          if (showTooltip && tooltipRef.current) {
            d3.select(this)
              .transition().duration(200)
              .attr('r', 8);
            
            // Prepare tooltip content
            let tooltipContent;
            if (tooltipFormatter) {
              tooltipContent = tooltipFormatter(d, periods[periodIndex]);
            } else {
              const metricLabel = labels[d.key] || d.key;
              const valueUnit = units[d.key] || '';
              tooltipContent = `
                <div class="chart-tooltip-title">${periods[periodIndex]} - ${metricLabel}</div>
                <div><span class="chart-tooltip-value">${d.originalValue.toLocaleString()}</span> ${valueUnit}</div>
                <div class="chart-tooltip-info">Max: ${d.maxValue.toLocaleString()} ${valueUnit}</div>
              `;
            }
            
            tooltipRef.current
              .transition().duration(200)
              .style('opacity', 0.9);
            
            tooltipRef.current.html(tooltipContent)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          }
        })
        .on('mouseout', function() {
          if (showTooltip && tooltipRef.current) {
            d3.select(this)
              .transition().duration(200)
              .attr('r', 5);
            
            tooltipRef.current
              .transition().duration(500)
              .style('opacity', 0);
          }
        });
    });

    // Add legend if enabled
    if (showLegend && derivedLegendItems && derivedLegendItems.length > 0) {
      const legendSpacing = 20;
      const legendItemWidth = 15;
      const legendItemHeight = 15;
      const legendTextOffset = 25;
      const legendGroupWidth = 150; // Space for each legend group
      
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${-radius}, ${-radius - 30})`);
      
      // Create legend items
      const legendItem = legend.selectAll('.legend-item')
        .data(derivedLegendItems)
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

  return (
    <div className={`w-full h-full ${className} metrics-radar-chart`} ref={containerRef}>
      {isLoading && (
        <div className="chart-skeleton h-full w-full rounded"></div>
      )}
      <div className={`w-full h-full ${isLoading ? 'hidden' : ''}`}>
        <svg ref={svgRef} width="100%" height="100%"></svg>
        {showTooltip && <div ref={tooltipDiv} className="chart-tooltip"></div>}
      </div>
    </div>
  );
}