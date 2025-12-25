import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import dataManager from '../../utils/dataManager';
import './ExpenseForm.css';

const ExpenseForm = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    roomRent: '',
    staffSalary: '',
    electricityBill: '',
    internetBill: '',
    otherExpenses: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSalary, setIsLoadingSalary] = useState(false);
  
  // Fetch staff salary data when component mounts
  useEffect(() => {
    fetchStaffSalary();
  }, []);
  
  const fetchStaffSalary = async () => {
    setIsLoadingSalary(true);
    try {
      // Get current month in YYYY-MM format
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Load staff data
      const staffData = await dataManager.getStaff();
      
      // Load staff attendance data
      const staffAttendanceData = await dataManager.getStaffAttendance();
      
      // Calculate total salary for current month
      const totalSalary = calculateTotalSalary(staffData, staffAttendanceData, currentMonth);
      
      // Update form data with calculated salary
      setFormData(prev => ({
        ...prev,
        staffSalary: totalSalary.toString()
      }));
      
      // Show success message
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: 'Staff salary automatically calculated from current month attendance' }
      }));
    } catch (error) {
      console.error('Error fetching staff salary:', error);
      // Show error message
      window.dispatchEvent(new CustomEvent('showError', {
        detail: { message: 'Error fetching staff salary data.' }
      }));
    } finally {
      setIsLoadingSalary(false);
    }
  };
  
  const calculateTotalSalary = (staffData, staffAttendanceData, selectedMonth) => {
    const salaryResults = staffData.map(staffMember => {
      // Filter attendance for selected month and this staff member
      const staffAttendance = staffAttendanceData.filter(record => 
        record.staffId === staffMember.staffId && 
        record.date.startsWith(selectedMonth)
      );
      
      // Count only present days
      const presentDays = staffAttendance.filter(a => a.status === "present").length;
      const salary = staffMember.perDaySalary * presentDays;
      
      return salary;
    });
    
    // Sum all salaries
    return salaryResults.reduce((sum, salary) => sum + salary, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (formData.roomRent && isNaN(formData.roomRent)) {
      newErrors.roomRent = 'Room rent must be a valid number';
    }
    
    if (formData.staffSalary && isNaN(formData.staffSalary)) {
      newErrors.staffSalary = 'Staff salary must be a valid number';
    }
    
    if (formData.electricityBill && isNaN(formData.electricityBill)) {
      newErrors.electricityBill = 'Electricity bill must be a valid number';
    }
    
    if (formData.internetBill && isNaN(formData.internetBill)) {
      newErrors.internetBill = 'Internet bill must be a valid number';
    }
    
    if (formData.otherExpenses && isNaN(formData.otherExpenses)) {
      newErrors.otherExpenses = 'Other expenses must be a valid number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const calculateTotal = () => {
    const roomRent = parseFloat(formData.roomRent) || 0;
    const staffSalary = parseFloat(formData.staffSalary) || 0;
    const electricityBill = parseFloat(formData.electricityBill) || 0;
    const internetBill = parseFloat(formData.internetBill) || 0;
    const otherExpenses = parseFloat(formData.otherExpenses) || 0;
    return roomRent + staffSalary + electricityBill + internetBill + otherExpenses;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Process the form submission
        const expenseData = {
          roomRent: parseFloat(formData.roomRent) || 0,
          staffSalary: parseFloat(formData.staffSalary) || 0,
          electricityBill: parseFloat(formData.electricityBill) || 0,
          internetBill: parseFloat(formData.internetBill) || 0,
          otherExpenses: parseFloat(formData.otherExpenses) || 0,
          total: calculateTotal(),
          date: new Date().toISOString(),
          createdAt: new Date()
        };
        
        // Save to Firebase through dataManager
        await dataManager.addExpenditure(expenseData);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('expenseAdded'));
        
        // Show success message
        window.dispatchEvent(new CustomEvent('showSuccess', {
          detail: { message: 'Expense recorded successfully!' }
        }));
        
        // Navigate to expenses page
        navigate('/expenses');
      } catch (error) {
        console.error('Error saving expense:', error);
        // Show error message
        window.dispatchEvent(new CustomEvent('showError', {
          detail: { message: 'Error saving expense. Please try again.' }
        }));
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const handleCancel = () => {
    navigate('/dashboard');
  };
  
  const totalExpenses = calculateTotal();
  
  return (
    <div className="expense-form-container">
      <div className="expense-form-card">
        <h2>Add New Expense</h2>
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="roomRent">Room Rent (₹)</label>
            <input
              type="text"
              id="roomRent"
              name="roomRent"
              value={formData.roomRent}
              onChange={handleChange}
              className={errors.roomRent ? 'error' : ''}
              placeholder="Enter room rent amount"
            />
            {errors.roomRent && <span className="error-message">{errors.roomRent}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="staffSalary">Staff Salary (₹)</label>
            <div className="input-with-button">
              <input
                type="text"
                id="staffSalary"
                name="staffSalary"
                value={formData.staffSalary}
                onChange={handleChange}
                className={errors.staffSalary ? 'error' : ''}
                placeholder="Enter staff salary amount"
                disabled={isLoadingSalary}
              />
              <button 
                type="button" 
                className="refresh-button" 
                onClick={fetchStaffSalary}
                disabled={isLoadingSalary}
              >
                {isLoadingSalary ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {errors.staffSalary && <span className="error-message">{errors.staffSalary}</span>}
            <small className="info-text">Auto-calculated from current month's attendance</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="electricityBill">Electricity Bill (₹)</label>
            <input
              type="text"
              id="electricityBill"
              name="electricityBill"
              value={formData.electricityBill}
              onChange={handleChange}
              className={errors.electricityBill ? 'error' : ''}
              placeholder="Enter electricity bill amount"
            />
            {errors.electricityBill && <span className="error-message">{errors.electricityBill}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="internetBill">Internet Bill (₹)</label>
            <input
              type="text"
              id="internetBill"
              name="internetBill"
              value={formData.internetBill}
              onChange={handleChange}
              className={errors.internetBill ? 'error' : ''}
              placeholder="Enter internet bill amount"
            />
            {errors.internetBill && <span className="error-message">{errors.internetBill}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="otherExpenses">Other Expenses (₹)</label>
            <input
              type="text"
              id="otherExpenses"
              name="otherExpenses"
              value={formData.otherExpenses}
              onChange={handleChange}
              className={errors.otherExpenses ? 'error' : ''}
              placeholder="Enter other expenses amount"
            />
            {errors.otherExpenses && <span className="error-message">{errors.otherExpenses}</span>}
          </div>
          
          <div className="total-expenses-container">
            <div className="total-label">Total Expenses:</div>
            <div className="total-amount">₹{totalExpenses.toLocaleString()}</div>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;