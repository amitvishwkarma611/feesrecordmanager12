import React, { useState } from 'react';
import './Chart.css';

const PieChart = ({ data }) => {
  // Extract data values
  const { collected, pending } = data;
  const total = collected + pending;
  
  // Handle empty data case
  if (total === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }
  
  // Calculate percentages
  const collectedPercentage = (collected / total) * 100;
  const pendingPercentage = (pending / total) * 100;
  
  // ====================
  // SVG Configuration
  // ====================
  const SVG_SIZE = 180;  // Reduced size for better balance in the new layout
  const CENTER = SVG_SIZE / 2;
  const OUTER_RADIUS = 70;  // Adjusted for smaller size
  const INNER_RADIUS = 45;  // Adjusted for thinner ring
  
  // ====================
  // Mathematical Functions
  // ====================
  // Convert angles to radians for calculations
  const toRadians = (angle) => (angle * Math.PI) / 180;
  
  // Calculate angles for the pie slices
  const collectedAngle = (collectedPercentage / 100) * 360;
  
  // Function to create a doughnut slice path
  const createDoughnutSlice = (startAngle, endAngle, outerRadius, innerRadius) => {
    // Calculate outer arc points
    const startOuterX = CENTER + outerRadius * Math.cos(toRadians(startAngle - 90));
    const startOuterY = CENTER + outerRadius * Math.sin(toRadians(startAngle - 90));
    const endOuterX = CENTER + outerRadius * Math.cos(toRadians(endAngle - 90));
    const endOuterY = CENTER + outerRadius * Math.sin(toRadians(endAngle - 90));
    
    // Calculate inner arc points
    const startInnerX = CENTER + innerRadius * Math.cos(toRadians(startAngle - 90));
    const startInnerY = CENTER + innerRadius * Math.sin(toRadians(startAngle - 90));
    const endInnerX = CENTER + innerRadius * Math.cos(toRadians(endAngle - 90));
    const endInnerY = CENTER + innerRadius * Math.sin(toRadians(endAngle - 90));
    
    // Determine if we need to draw large arcs
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    // Create the path string
    return [
      `M ${startOuterX} ${startOuterY}`, // Move to start point of outer arc
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`, // Outer arc
      `L ${endInnerX} ${endInnerY}`, // Line to end point of inner arc
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`, // Inner arc
      'Z' // Close path
    ].join(' ');
  };
  
  // Create paths for the slices
  const collectedPath = createDoughnutSlice(0, collectedAngle, OUTER_RADIUS, INNER_RADIUS);
  const pendingPath = createDoughnutSlice(collectedAngle, 360, OUTER_RADIUS, INNER_RADIUS);
  
  // State for hover effects
  const [hoveredSlice, setHoveredSlice] = useState(null);
  
  return (
    <div className="pie-chart-container">
      <div className="pie-chart-wrapper">
        <svg 
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} 
          className="pie-svg"
          style={{ width: '100%', height: 'auto' }}
        >
          {/* Collected slice */}
          <path
            d={collectedPath}
            fill="var(--success-color)"
            className="pie-slice"
            onMouseEnter={() => setHoveredSlice('collected')}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === 'collected' ? 'scale(1.05)' : 'scale(1)',
              filter: hoveredSlice === 'collected' 
                ? 'drop-shadow(0 4px 10px rgba(28, 200, 138, 0.3))' 
                : 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.1))',
              transition: 'all 0.3s ease'
            }}
          />
          
          {/* Pending slice */}
          <path
            d={pendingPath}
            fill="var(--warning-color)"
            className="pie-slice"
            onMouseEnter={() => setHoveredSlice('pending')}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === 'pending' ? 'scale(1.05)' : 'scale(1)',
              filter: hoveredSlice === 'pending' 
                ? 'drop-shadow(0 4px 10px rgba(246, 194, 62, 0.3))' 
                : 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.1))',
              transition: 'all 0.3s ease'
            }}
          />
          
          {/* Center circle for doughnut effect */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_RADIUS - 6}
            fill="white"
            stroke="rgba(0, 0, 0, 0.03)"
            strokeWidth="1"
          />
          
          {/* Center text showing total */}
          <text
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            className="center-text"
            fill="var(--text-primary)"
            style={{ fontSize: '20px', fontWeight: '800' }}
          >
            {Math.round(total).toLocaleString()}
          </text>
          <text
            x={CENTER}
            y={CENTER + 10}
            textAnchor="middle"
            className="center-text"
            fill="var(--text-secondary)"
            style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px' }}
          >
            TOTAL
          </text>
        </svg>
      </div>
      
      {/* Legend */}
      <div className="chart-legend-side">
        <div className="chart-legend">
          <div 
            className="legend-item"
            onMouseEnter={() => setHoveredSlice('collected')}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === 'collected' ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'all 0.2s ease'
            }}
          >
            <div 
              className="legend-color" 
              style={{ backgroundColor: 'var(--success-color)' }}
            ></div>
            <div className="legend-text">
              <div className="legend-label">Collected</div>
              <div className="legend-value">₹{Math.round(collected).toLocaleString()}</div>
            </div>
            <div className="legend-percentage">
              {collectedPercentage.toFixed(1)}%
            </div>
          </div>
          
          <div 
            className="legend-item"
            onMouseEnter={() => setHoveredSlice('pending')}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{
              transform: hoveredSlice === 'pending' ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'all 0.2s ease'
            }}
          >
            <div 
              className="legend-color" 
              style={{ backgroundColor: 'var(--warning-color)' }}
            ></div>
            <div className="legend-text">
              <div className="legend-label">Pending</div>
              <div className="legend-value">₹{Math.round(pending).toLocaleString()}</div>
            </div>
            <div className="legend-percentage">
              {pendingPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* Percentage display */}
        <div className="percentage-display">
          <div className="percentage-value">
            {collectedPercentage.toFixed(1)}%
          </div>
          <div className="percentage-label">Collection Rate</div>
          <div className="total-amount">
            Total: ₹{Math.round(total).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;