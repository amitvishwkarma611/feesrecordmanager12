import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LineChart from '../common/LineChart';
import './CollectionTrend.css';

const CollectionTrend = () => {
  const navigate = useNavigate();
  const [collectionTrendData, setCollectionTrendData] = useState([]);

  // Generate sample data for the collection trend
  useEffect(() => {
    // Generate sample data for the last 6 months
    const currentDate = new Date();
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      
      // Generate realistic values
      const baseValue = 35000;
      const variance = baseValue * 0.3;
      const value = Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2);
      
      trendData.push({
        month: `${monthName} '${year}`,
        amount: Math.round(value)
      });
    }
    setCollectionTrendData(trendData);
  }, []);

  // Function to generate dynamic collection trend insight
  const generateCollectionTrendInsight = () => {
    // Check if we have data to analyze
    if (!collectionTrendData || collectionTrendData.length === 0) {
      return "Insufficient data to generate insight.";
    }
    
    // Calculate trend direction
    const firstValue = collectionTrendData[0]?.amount || 0;
    const lastValue = collectionTrendData[collectionTrendData.length - 1]?.amount || 0;
    
    if (lastValue > firstValue) {
      const growthPercent = (((lastValue - firstValue) / firstValue) * 100).toFixed(1);
      return `Collections show an overall upward trend with ${growthPercent}% growth. Maintaining follow-ups during low months can further stabilize cash flow.`;
    } else if (lastValue < firstValue) {
      const declinePercent = (((firstValue - lastValue) / firstValue) * 100).toFixed(1);
      return `Collections show a declining trend with ${declinePercent}% decrease. Focus on follow-ups to reverse this trend.`;
    } else {
      return "Collections remain stable over time. Maintaining consistent follow-ups is key to sustaining this performance.";
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
            <span className="view-badge">Monthly view</span>
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