import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenditures } from '../../services/firebaseService';
import './ExpenditureCard.css';

const ExpenditureCard = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  
  // Load expenses from Firebase when component mounts
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const fetchedExpenses = await getExpenditures();
        setExpenses(fetchedExpenses);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExpenses();
  }, []);
  
  // Listen for expense updates
  useEffect(() => {
    const handleExpenseUpdate = async () => {
      try {
        const fetchedExpenses = await getExpenditures();
        setExpenses(fetchedExpenses);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };
    
    window.addEventListener('expenseAdded', handleExpenseUpdate);
    window.addEventListener('expenditureUpdated', handleExpenseUpdate);
    
    return () => {
      window.removeEventListener('expenseAdded', handleExpenseUpdate);
      window.removeEventListener('expenditureUpdated', handleExpenseUpdate);
    };
  }, []);
  
  // Calculate total expenditure
  const totalExpenditure = expenses.reduce((sum, expense) => sum + (expense.total || 0), 0);
  
  const handleAddExpense = () => {
    navigate('/expense-form');
  };
  
  const handleViewMonthly = () => {
    navigate('/monthly-expenses');
  };
  
  if (loading) {
    return (
      <div className="expenditure-card">
        <div className="expenditure-total">
          <span className="label">Total:</span>
          <span className="amount">₹0</span>
        </div>
        <div className="expenditure-list">
          <div className="loading-message">Loading...</div>
        </div>
        <div className="expenditure-actions">
          <button className="add-expense-btn" onClick={handleAddExpense}>Add Expense</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="expenditure-card">
      <div className="expenditure-header">
        <h3>Monthly Expenditure</h3>
        <div className="expenditure-total">
          <span className="label">Total Expenses:</span>
          <span className="amount">₹{totalExpenditure.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="expenditure-list">
        {expenses.length > 0 ? (
          <div className="expenditure-summary">
            <div className="summary-item">
              <span className="summary-label">Recorded Expenses:</span>
              <span className="summary-value">{expenses.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">This Month:</span>
              <span className="summary-value">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        ) : (
          <div className="no-expenditures">
            <div className="no-expenditures-icon">📊</div>
            <div className="no-expenditures-text">No expenditures recorded yet</div>
            <div className="no-expenditures-subtext">Add your first expense to get started</div>
          </div>
        )}
      </div>
      
      <div className="expenditure-actions">
        <button className="add-expense-btn" onClick={handleAddExpense}>Add Expense</button>
        {expenses.length > 0 && (
          <button className="view-monthly-btn" onClick={handleViewMonthly}>View Monthly Report</button>
        )}
      </div>
    </div>
  );
};

export default ExpenditureCard;