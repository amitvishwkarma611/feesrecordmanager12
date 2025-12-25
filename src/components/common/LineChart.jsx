import React, { useState } from 'react';
import './Chart.css';

const LineChart = ({ data, width = "100%", height = 500 }) => {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  // Find min and max values for scaling
  const values = data.map(item => item.amount);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1; // Avoid division by zero

  // Chart dimensions
  const padding = 30;
  
  // If width is a percentage, we'll use it as is for the SVG
  // The actual rendering will be handled by the container
  const svgWidth = typeof width === 'string' ? 1000 : width;
  const svgHeight = height;

  // Calculate points
  const points = data.map((item, index) => {
    const x = padding + (index * (svgWidth - 2 * padding) / (data.length - 1));
    const y = svgHeight - padding - ((item.amount - minValue) / range) * (svgHeight - 2 * padding);
    return { x, y, ...item };
  });

  // Generate smooth path for the line using cubic bezier curves
  const generateSmoothPath = (points) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i - 1];
      
      // Calculate control points for smooth curve
      const controlX1 = prev.x + (current.x - prev.x) * 0.5;
      const controlY1 = prev.y;
      const controlX2 = current.x - (current.x - prev.x) * 0.5;
      const controlY2 = current.y;
      
      path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${current.x} ${current.y}`;
    }
    
    return path;
  };

  const pathData = generateSmoothPath(points);

  const renderGridLines = () => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
      <line
        key={i}
        x1={padding}
        y1={padding + ratio * (svgHeight - 2 * padding)}
        x2={svgWidth - padding}
        y2={padding + ratio * (svgHeight - 2 * padding)}
        className="grid-line"
      />
    ));
  };

  // Handle mouse events for tooltip
  const handleMouseOver = (point, event) => {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      content: `₹${point.amount.toLocaleString()} collected in ${point.month}`
    });
  };

  const handleMouseOut = () => {
    setTooltip(null);
  };

  return (
    <div className="line-chart-container">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="line-chart"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--info-color)" />
            <stop offset="100%" stopColor="var(--info-color-darker)" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--info-color)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--info-color)" stopOpacity="0" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feFlood floodColor="rgba(0,0,0,0.1)" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Grid lines */}
        {renderGridLines()}
        
        {/* Area fill under the line */}
        {points.length > 1 && (
          <path
            d={`${generateSmoothPath(points)} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`}
            fill="url(#areaGradient)"
            className="area-fill"
          />
        )}
        
        {/* Data line - Thicker line */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"  // Thicker line as requested
          filter="url(#shadow)"
          className="data-line"
        />
        
        {/* Data points - Larger points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="6"  // Larger data points
            fill="white"
            stroke="var(--info-color)"
            strokeWidth="2"
            className="data-point"
            onMouseOver={(e) => handleMouseOver(point, e)}
            onMouseOut={handleMouseOut}
          />
        ))}
        
        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={svgHeight - padding + 20}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-secondary)"
            className="axis-label"
          >
            {point.month}
          </text>
        ))}
      </svg>
      
      {/* Tooltip - Rounded white card style */}
      {tooltip && (
        <div 
          className="chart-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            background: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '12px',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 1000,
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default LineChart;