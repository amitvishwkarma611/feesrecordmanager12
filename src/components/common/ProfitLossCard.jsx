import React, { useState, useEffect } from 'react';
import { getExpenditures } from '../../services/firebaseService';
import './ProfitLossCard.css';

const ProfitLossCard = ({ totalFees, collectedFees }) => {
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExpenditures = async () => {
      try {
        setLoading(true);
        const expenditureData = await getExpenditures();
        setExpenditures(expenditureData);
      } catch (err) {
        console.error('Error fetching expenditures:', err);
        setError('Failed to load expenditure data');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenditures();
    
    // Listen for updates
    const handleExpenditureUpdate = () => {
      fetchExpenditures();
    };
    
    window.addEventListener('expenditureUpdated', handleExpenditureUpdate);
    
    return () => {
      window.removeEventListener('expenditureUpdated', handleExpenditureUpdate);
    };
  }, []);

  // Calculate total expenditures
  const totalExpenditures = expenditures.reduce((sum, exp) => {
    return sum + (parseFloat(exp.total) || 0);
  }, 0);

  // Calculate profit/loss using totalFees instead of collectedFees
  const profitLoss = totalFees - totalExpenditures;
  const isProfit = profitLoss >= 0;

  if (loading) {
    return (
      <div className="profit-loss-card">
        <div className="card-header">
          <h3>Financial Status</h3>
        </div>
        <div className="card-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profit-loss-card">
        <div className="card-header">
          <h3>Financial Status</h3>
        </div>
        <div className="card-content">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profit-loss-card">
      <div className="card-header">
        <h3>Financial Status</h3>
      </div>
      <div className="card-content">
        <div className="financial-summary">
          <div className="summary-row">
            <div className="label-column">
              <span className="label">Total Income (Fees)</span>
              <span className="label">Total Expenditure</span>
              <div className="net-label-container">
                <div className="label">Net {isProfit ? 'Profit' : 'Loss'}</div>
                <div className="helper-text">Financial health indicator</div>
              </div>
            </div>
            <div className="value-column">
              <span className="value income">₹{totalFees.toLocaleString()}</span>
              <span className="value expenditure">₹{totalExpenditures.toLocaleString()}</span>
              <span className={`value ${isProfit ? 'profit' : 'loss'}`}>
                {isProfit ? '₹' : '-₹'}{Math.abs(profitLoss).toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Visual indicator bar */}
          <div className="financial-ratio-bar">
            <div className="ratio-labels">
              <span>Income</span>
              <span>Expenditure</span>
            </div>
            <div className="ratio-container">
              <div 
                className="income-bar" 
                style={{ width: `${totalFees > 0 ? (totalFees / (totalFees + totalExpenditures)) * 100 : 50}%` }}
              ></div>
              <div 
                className="expenditure-bar" 
                style={{ width: `${totalExpenditures > 0 ? (totalExpenditures / (totalFees + totalExpenditures)) * 100 : 50}%` }}
              ></div>
            </div>
            <div className="ratio-percentages">
              <span>{totalFees > 0 ? Math.round((totalFees / (totalFees + totalExpenditures)) * 100) : 50}%</span>
              <span>{totalExpenditures > 0 ? Math.round((totalExpenditures / (totalFees + totalExpenditures)) * 100) : 50}%</span>
            </div>
          </div>
        </div>
        
        {/* Expenditure breakdown removed as requested */}
      </div>
    </div>
  );
};

export default ProfitLossCard;