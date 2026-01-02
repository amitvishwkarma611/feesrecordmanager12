import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LineChart from '../common/LineChart';
import './CollectionTrend.css';

const CollectionTrend = () => {
  const navigate = useNavigate();
  const [collectionTrendData, setCollectionTrendData] = useState([]);

  const [timeRange, setTimeRange] = useState('6months'); // Default to 6 months
  
  // Generate sample data for the collection trend based on selected time range
  useEffect(() => {
    const currentDate = new Date();
    const trendData = [];
    
    let monthsToGenerate = 6;
    if (timeRange === '3months') monthsToGenerate = 3;
    else if (timeRange === '12months') monthsToGenerate = 12;
    
    for (let i = monthsToGenerate - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      
      // Generate realistic values with trend
      const baseValue = 35000;
      // Add a slight upward trend over time
      const trendAdjustment = (monthsToGenerate - i) * 1000;
      const variance = baseValue * 0.3;
      const value = Math.max(0, baseValue + trendAdjustment + (Math.random() - 0.5) * variance * 2);
      
      trendData.push({
        month: `${monthName} '${year}`,
        amount: Math.round(value),
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      });
    }
    setCollectionTrendData(trendData);
  }, [timeRange]);

  // Function to generate dynamic collection trend insight
  const generateCollectionTrendInsight = () => {
    // Check if we have data to analyze
    if (!collectionTrendData || collectionTrendData.length === 0) {
      return "Insufficient data to generate insight.";
    }
    
    // Calculate trend direction
    const firstValue = collectionTrendData[0]?.amount || 0;
    const lastValue = collectionTrendData[collectionTrendData.length - 1]?.amount || 0;
    const totalMonths = collectionTrendData.length;
    
    // Calculate average
    const totalAmount = collectionTrendData.reduce((sum, item) => sum + item.amount, 0);
    const average = totalAmount / totalMonths;
    
    // Calculate variance and identify peak/low months
    let maxAmount = Math.max(...collectionTrendData.map(item => item.amount));
    let minAmount = Math.min(...collectionTrendData.map(item => item.amount));
    let peakMonth = collectionTrendData.find(item => item.amount === maxAmount)?.month || 'N/A';
    let lowMonth = collectionTrendData.find(item => item.amount === minAmount)?.month || 'N/A';
    
    if (lastValue > firstValue) {
      const growthPercent = (((lastValue - firstValue) / firstValue) * 100).toFixed(1);
      return `Collections show an overall upward trend with ${growthPercent}% growth. Peak was in ${peakMonth} (₹${maxAmount.toLocaleString()}) and lowest in ${lowMonth} (₹${minAmount.toLocaleString()}). Average monthly collection: ₹${Math.round(average).toLocaleString()}.`;
    } else if (lastValue < firstValue) {
      const declinePercent = (((firstValue - lastValue) / firstValue) * 100).toFixed(1);
      return `Collections show a declining trend with ${declinePercent}% decrease. Peak was in ${peakMonth} (₹${maxAmount.toLocaleString()}) and lowest in ${lowMonth} (₹${minAmount.toLocaleString()}). Average monthly collection: ₹${Math.round(average).toLocaleString()}. Focus on follow-ups to reverse this trend.`;
    } else {
      return `Collections remain stable over time. Peak was in ${peakMonth} (₹${maxAmount.toLocaleString()}) and lowest in ${lowMonth} (₹${minAmount.toLocaleString()}). Average monthly collection: ₹${Math.round(average).toLocaleString()}. Maintaining consistent follow-ups is key to sustaining this performance.`;
    }
  };

  return (
    <div className="collection-trend-page">
      <div className="page-header">
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1 className="page-title">Collection Trend Over Time</h1>
          <div className="header-meta">
            <p className="page-subtitle">Month-wise fee collection performance</p>
            <div className="time-range-selector">
              <label htmlFor="timeRange">View:</label>
              <select 
                id="timeRange" 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-range-dropdown"
              >
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="12months">12 Months</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="header-divider"></div>
      
      <div className="chart-page-container">
        <div className="analytics-panel">
          <div className="analytics-header">
            <h2 className="panel-title">Collection Trend</h2>
            <p className="panel-subtext">Month-wise fee collection performance</p>
          </div>
          <div className="chart-card">
            <LineChart data={collectionTrendData} width="100%" height={420} />
            
            {/* Summary metrics */}
            <div className="summary-metrics">
              <div className="metric-card">
                <div className="metric-value">₹{collectionTrendData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</div>
                <div className="metric-label">Total Collections</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">₹{collectionTrendData.length > 0 ? Math.round(collectionTrendData.reduce((sum, item) => sum + item.amount, 0) / collectionTrendData.length).toLocaleString() : '0'}</div>
                <div className="metric-label">Avg. Monthly</div>
              </div>
              <div className="metric-card">
                <div className="metric-value" style={{ color: collectionTrendData.length > 1 && collectionTrendData[collectionTrendData.length - 1].amount > collectionTrendData[0].amount ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {collectionTrendData.length > 1 ? 
                    `${(((collectionTrendData[collectionTrendData.length - 1].amount - collectionTrendData[0].amount) / collectionTrendData[0].amount) * 100).toFixed(1)}%` : 
                    '0%'}
                </div>
                <div className="metric-label">Growth Rate</div>
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-icon">💡</span>
                <span className="insight-label">Key Insight</span>
              </div>
              <p className="insight-text">{generateCollectionTrendInsight()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionTrend;