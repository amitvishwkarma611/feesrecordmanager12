import React, { useState, useEffect } from 'react';
import './StatCard.css';

const StatCard = ({ title, value, icon, color, animate = false }) => {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (animate) {
      let start = 0;
      const end = typeof value === 'string' ? 
        (value.includes('₹') ? parseFloat(value.replace(/[^0-9.]/g, '')) : 0) : 
        value;
      
      if (end === 0) {
        setDisplayValue(value);
        return;
      }
      
      const duration = 1000;
      const increment = end / (duration / 16);
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          clearInterval(timer);
          setDisplayValue(value);
        } else {
          if (typeof value === 'string' && value.includes('₹')) {
            setDisplayValue(`₹${Math.floor(current).toLocaleString()}`);
          } else {
            setDisplayValue(Math.floor(current));
          }
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [value, animate]);

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
        <span className="stat-icon-content">{icon}</span>
      </div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value">
          {animate ? displayValue : value}
        </div>
      </div>
    </div>
  );
};

export default StatCard;