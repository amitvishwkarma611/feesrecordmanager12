import React from 'react';

const Sparkline = ({ data, width = 40, height = 20, color = 'var(--info-color)' }) => {
  if (!data || data.length < 2) return null;

  // Normalize data to fit within the SVG dimensions
  const minX = 0;
  const maxX = width;
  const minY = 0;
  const maxY = height;
  
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const dataRange = dataMax - dataMin || 1; // Avoid division by zero
  
  // Map data points to coordinates
  const points = data.map((value, index) => {
    const x = minX + (index / (data.length - 1)) * (maxX - minX);
    const y = maxY - ((value - dataMin) / dataRange) * (maxY - minY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Sparkline;