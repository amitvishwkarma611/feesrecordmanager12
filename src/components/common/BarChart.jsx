import React, { useState } from 'react';
import './Chart.css';

const BarChart = ({ data, width = "100%", height = 300 }) => {
  const [tooltip, setTooltip] = useState(null);

  // Define fixed months to ensure all months are shown
  const fixedMonths = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025'];
  
  // Ensure data includes all months, adding zero values for missing months
  const completeData = fixedMonths.map(month => {
    const monthData = data.find(item => item.month === month);
    return monthData || { month, collected: 0, pending: 0 };
  });

  // Chart dimensions
  const padding = { top: 30, right: 20, bottom: 50, left: 60 };
  const svgWidth = typeof width === 'string' ? 1000 : width;
  const svgHeight = height;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Fixed Y-axis ticks: ₹0, ₹10k, ₹20k, ₹30k, ₹40k
  const yAxisTicks = [0, 10000, 20000, 30000, 40000];
  const maxValue = 40000; // Fixed max value for consistent scaling

  // Bar dimensions
  const barWidth = 20;
  const groupWidth = barWidth * 2.5;
  const gapBetweenGroups = (chartWidth - (groupWidth * completeData.length)) / (completeData.length - 1);

  // Generate bars
  const bars = [];
  completeData.forEach((month, index) => {
    const groupX = padding.left + index * (groupWidth + gapBetweenGroups);
    
    // Collected bar
    const collectedHeight = (month.collected / maxValue) * chartHeight;
    const collectedY = padding.top + chartHeight - collectedHeight;
    
    bars.push({
      x: groupX,
      y: collectedY,
      width: barWidth,
      height: collectedHeight,
      value: month.collected,
      month: month.month,
      type: 'Collected',
      color: '#1cc88a', // muted green
      isCurrent: month.month === 'Dec 2025'
    });
    
    // Pending bar
    const pendingHeight = (month.pending / maxValue) * chartHeight;
    const pendingY = padding.top + chartHeight - pendingHeight;
    
    bars.push({
      x: groupX + barWidth * 1.5,
      y: pendingY,
      width: barWidth,
      height: pendingHeight,
      value: month.pending,
      month: month.month,
      type: 'Pending',
      color: '#f6c23e', // soft orange
      isCurrent: month.month === 'Dec 2025'
    });
  });

  // Handle mouse events for tooltip
  const handleMouseOver = (bar, event) => {
    // Find the group data for this month
    const monthData = completeData.find(item => item.month === bar.month);
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      month: bar.month,
      collected: monthData.collected,
      pending: monthData.pending
    });
  };

  const handleMouseOut = () => {
    setTooltip(null);
  };

  return (
    <div className="bar-chart-container">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="bar-chart"
      >
        <defs>
          {/* Gradient for collected bars */}
          <linearGradient id="collectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1cc88a" />
            <stop offset="100%" stopColor="#139d6d" />
          </linearGradient>
          
          {/* Gradient for pending bars */}
          <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f6c23e" />
            <stop offset="100%" stopColor="#e5a525" />
          </linearGradient>
          
          {/* Glow effect for current month */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Horizontal grid lines */}
        {yAxisTicks.map((tick, i) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={svgWidth - padding.right}
              y2={y}
              stroke="rgba(0, 0, 0, 0.05)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {yAxisTicks.map((tick, i) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <text
              key={i}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="14"  // Increased font size
              fill="#6c757d"
              fontFamily="sans-serif"
            >
              ₹{tick === 0 ? '0' : tick >= 1000 ? `${tick/1000}k` : tick}
            </text>
          );
        })}
        
        {/* Bars with rounded corners (no animations) */}
        {bars.map((bar, index) => (
          <g key={index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.type === 'Collected' ? 'url(#collectedGradient)' : 'url(#pendingGradient)'}
              rx="8" // Rounded corners (6-8px)
              ry="8"
              onMouseOver={(e) => handleMouseOver(bar, e)}
              onMouseOut={handleMouseOut}
              style={{
                opacity: bar.value === 0 ? 0.3 : 1, // Low opacity for zero values
                filter: bar.isCurrent ? 'url(#glow)' : 'none' // Glow for current month
              }}
            />
            {/* Border for current month */}
            {bar.isCurrent && (
              <rect
                x={bar.x - 1}
                y={bar.y - 1}
                width={bar.width + 2}
                height={bar.height + 2}
                fill="none"
                rx="9"
                ry="9"
                stroke="#1cc88a"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            )}
          </g>
        ))}
        
        {/* X-axis labels */}
        {completeData.map((month, index) => {
          const groupX = padding.left + index * (groupWidth + gapBetweenGroups) + groupWidth / 2;
          return (
            <g key={index}>
              <text
                x={groupX}
                y={svgHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="14"  // Increased font size
                fill="#6c757d"
                fontFamily="sans-serif"
              >
                {month.month.split(' ')[0]}
              </text>
              {/* Current month indicator */}
              {month.month === 'Dec 2025' && (
                <text
                  x={groupX}
                  y={svgHeight - padding.bottom + 35}
                  textAnchor="middle"
                  fontSize="12"  // Increased font size
                  fill="#1cc88a"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  Current
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="chart-legend-top-right">
        <div className="legend-item-horizontal">
          <div className="legend-color-box" style={{ backgroundColor: '#1cc88a' }}></div>
          <span className="legend-label">Collected</span>
        </div>
        <div className="legend-item-horizontal">
          <div className="legend-color-box" style={{ backgroundColor: '#f6c23e' }}></div>
          <span className="legend-label">Pending</span>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="chart-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            background: 'white',
            padding: '10px 15px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '13px',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 1000,
            border: '1px solid rgba(0, 0, 0, 0.05)',
            minWidth: '180px'
          }}
        >
          <div style={{ marginBottom: '5px', fontWeight: '700' }}>{tooltip.month}</div>
          <div style={{ color: '#1cc88a' }}>Collected: ₹{tooltip.collected.toLocaleString()}</div>
          <div style={{ color: '#f6c23e' }}>Pending: ₹{tooltip.pending.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};

export default BarChart;