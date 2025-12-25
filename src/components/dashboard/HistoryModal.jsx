import React, { useState, useEffect } from 'react';
import { getPayments } from '../../services/firebaseService';
import './HistoryModal.css';

const HistoryModal = ({ onClose }) => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('month');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      const payments = await getPayments();
      
      // Group payments by month
      const monthlyData = {};
      
      payments.forEach(payment => {
        if (!payment.createdAt) return;
        
        // Parse the date
        let createdDate;
        if (payment.createdAt instanceof Date) {
          createdDate = payment.createdAt;
        } else if (typeof payment.createdAt === 'string') {
          createdDate = new Date(payment.createdAt);
        } else if (payment.createdAt.toDate) {
          createdDate = payment.createdAt.toDate();
        }
        
        if (!createdDate || isNaN(createdDate.getTime())) return;
        
        // Format as YYYY-MM for grouping
        const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = createdDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthLabel,
            totalAmount: 0,
            paymentCount: 0
          };
        }
        
        monthlyData[monthKey].totalAmount += parseFloat(payment.amount) || 0;
        monthlyData[monthKey].paymentCount += 1;
      });
      
      // Convert to array and sort by month (newest first)
      const historyArray = Object.values(monthlyData);
      historyArray.sort((a, b) => {
        // Simple string comparison for month names should work for sorting
        return new Date(b.month) - new Date(a.month);
      });
      
      setHistoryData(historyArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching history data:', error);
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...historyData].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'month':
        aValue = new Date(a.month);
        bValue = new Date(b.month);
        break;
      case 'amount':
        aValue = a.totalAmount;
        bValue = b.totalAmount;
        break;
      case 'count':
        aValue = a.paymentCount;
        bValue = b.paymentCount;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const exportToCSV = () => {
    const csvContent = [
      ['Month', 'Total Collected (₹)', 'Total Payments'],
      ...sortedData.map(item => [
        item.month,
        item.totalAmount,
        item.paymentCount
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'monthly-history.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Monthly History</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="loading">Loading history data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Monthly History</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-actions">
          <button className="export-button" onClick={exportToCSV}>
            Export to CSV
          </button>
        </div>
        
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('month')}>
                  Month {sortBy === 'month' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('amount')}>
                  Total Collected (₹) {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('count')}>
                  Total Payments {sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={index}>
                  <td>{item.month}</td>
                  <td>₹{item.totalAmount.toLocaleString()}</td>
                  <td>{item.paymentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;