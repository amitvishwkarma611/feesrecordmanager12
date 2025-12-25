import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';
import dataManager from '../../utils/dataManager';
import './BudgetManagement.css';

const BudgetManagement = () => {
  const navigate = useNavigate();
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [currentMonthSpend, setCurrentMonthSpend] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load budget limit and current month spend from Firestore
  const loadData = async () => {
    try {
      if (!isAuthenticated()) return;
        
      const uid = getCurrentUserUID();
        
      // Load budget limit
      const settingsDoc = doc(db, `users/${uid}/settings/budget`);
      const docSnap = await getDoc(settingsDoc);
        
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMonthlyBudget(data.monthlyBudget || null);
        setBudgetInput(data.monthlyBudget?.toString() || '');
      } else {
        setMonthlyBudget(null);
        setBudgetInput('');
      }
        
      // Load current month spend
      const currentDate = new Date();
      const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
      const savedExpenses = await dataManager.getExpenditures();
      const groupedExpenses = groupExpensesByMonth(savedExpenses);
        
      const currentMonthExpenses = groupedExpenses.find(month => month.key === currentMonthKey) || {
        total: 0,
        roomRent: 0,
        staffSalary: 0,
        otherExpenses: 0,
        electricityBill: 0,
        internetBill: 0
      };
        
      setCurrentMonthSpend(currentMonthExpenses.total);
        
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
    
  // Group expenses by month (copied from MonthlyExpenses component)
  const groupExpensesByMonth = (expenses) => {
    const grouped = {};
      
    // Add current month even if no expenses
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
    grouped[currentMonthKey] = {
      key: currentMonthKey,
      label: currentMonthLabel,
      expenses: [],
      total: 0,
      roomRent: 0,
      staffSalary: 0,
      otherExpenses: 0,
      electricityBill: 0,
      internetBill: 0
    };
      
    expenses.forEach(expense => {
      // Parse the date
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          key: monthKey,
          label: monthLabel,
          expenses: [],
          total: 0,
          roomRent: 0,
          staffSalary: 0,
          otherExpenses: 0,
          electricityBill: 0,
          internetBill: 0
        };
      }
        
      grouped[monthKey].expenses.push(expense);
      grouped[monthKey].total += expense.total;
      grouped[monthKey].roomRent += expense.roomRent;
      grouped[monthKey].staffSalary += expense.staffSalary;
      grouped[monthKey].otherExpenses += expense.otherExpenses;
      grouped[monthKey].electricityBill += expense.electricityBill || 0;
      grouped[monthKey].internetBill += expense.internetBill || 0;
    });
      
    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a, b) => {
      const [aYear, aMonth] = a.key.split('-').map(Number);
      const [bYear, bMonth] = b.key.split('-').map(Number);
        
      if (aYear !== bYear) {
        return bYear - aYear;
      }
      return bMonth - aMonth;
    });
  };

  // Save budget limit to Firestore
  const saveBudgetLimit = async () => {
    try {
      // Validate input
      const budgetValue = parseFloat(budgetInput);
      
      if (isNaN(budgetValue) || budgetValue < 0) {
        setBudgetError('Please enter a valid positive number');
        return;
      }
      
      if (budgetValue < currentMonthSpend) {
        setBudgetError(`Budget must be at least ₹${currentMonthSpend.toLocaleString()} (current spend)`);
        return;
      }
      
      setIsSavingBudget(true);
      setBudgetError('');
      
      if (!isAuthenticated()) {
        throw new Error('User not authenticated');
      }
      
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/budget`);
      
      await setDoc(settingsDoc, {
        monthlyBudget: budgetValue
      }, { merge: true });
      
      // Update local state
      setMonthlyBudget(budgetValue);
      
      // Notify other components about budget update
      window.dispatchEvent(new CustomEvent('budgetUpdated', {
        detail: { budget: budgetValue }
      }));
      
      // Show success message
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: 'Budget limit updated successfully' }
      }));
      
    } catch (error) {
      console.error('Error saving budget limit:', error);
      setBudgetError('Failed to save budget limit. Please try again.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for expenditure updates
    const handleExpenditureUpdate = () => {
      loadData();
    };
    
    window.addEventListener('expenditureUpdated', handleExpenditureUpdate);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('expenditureUpdated', handleExpenditureUpdate);
    };
  }, []);

  // Calculate budget utilization percentage
  const budgetUtilization = monthlyBudget ? (currentMonthSpend / monthlyBudget) * 100 : 0;

  return (
    <div className="budget-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path></path>
            <path></path>
          </svg>
          Back
        </button>
        <h1>Budget Management</h1>
      </div>
      
      {loading ? (
        <div className="loading">Loading budget data...</div>
      ) : (
        <div className="budget-content">
          <div className="budget-card">
            <h2>Monthly Budget Limit</h2>
            
            <div className="budget-input-section">
              <label htmlFor="budget-input">Set your monthly budget:</label>
              <div className="budget-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  id="budget-input"
                  type="number"
                  value={budgetInput}
                  onChange={(e) => {
                    setBudgetInput(e.target.value);
                    if (budgetError) setBudgetError('');
                  }}
                  placeholder="Enter monthly budget"
                  className="budget-input"
                  min="0"
                  step="100"
                />
                <button
                  onClick={saveBudgetLimit}
                  disabled={isSavingBudget}
                  className="save-budget-btn"
                >
                  {isSavingBudget ? 'Saving...' : 'Save'}
                </button>
              </div>
              {budgetError && <div className="budget-error">{budgetError}</div>}
            </div>
            
            <div className="budget-display">
              {monthlyBudget ? (
                <>
                  <div className="budget-amount">
                    ₹{monthlyBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="budget-info">
                    Current month spend: ₹{currentMonthSpend.toLocaleString()}
                  </div>
                  <div className="utilization-container">
                    <div className="utilization-bar-container">
                      <div 
                        className="utilization-bar"
                        style={{
                          width: `${Math.min(budgetUtilization, 100)}%`,
                          background: budgetUtilization < 70 ? 'linear-gradient(90deg, #27ae60, #2ecc71)' : 
                                     budgetUtilization <= 90 ? 'linear-gradient(90deg, #f39c12, #f59e0b)' : 
                                     'linear-gradient(90deg, #e74c3c, #ef4444)'
                        }}
                      ></div>
                    </div>
                    <div className="utilization-text">
                      {budgetUtilization.toFixed(1)}% of budget used
                      {budgetUtilization >= 90 && budgetUtilization < 100 && (
                        <span className="budget-warning"> • Approaching budget limit</span>
                      )}
                      {budgetUtilization >= 100 && (
                        <span className="budget-exceeded"> • Budget exceeded</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-budget-set">
                  No budget limit set. Set a budget to track your monthly expenses.
                </div>
              )}
            </div>
          </div>
          
          <div className="budget-guidance">
            <h3>Budget Tips</h3>
            <ul>
              <li>Set a realistic budget based on your average monthly expenses</li>
              <li>Review your budget regularly to adjust for changing needs</li>
              <li>Use the budget utilization tracker to stay within your limits</li>
              <li>Consider setting alerts when you reach 80% of your budget</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManagement;