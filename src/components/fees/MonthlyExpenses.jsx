import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../../utils/dataManager';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import RootLayout from '../common/RootLayout';
import './MonthlyExpenses.css';

const MonthlyExpenses = () => {
  const navigate = useNavigate();
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [individualExpenses, setIndividualExpenses] = useState([]);
  const [showExpenditureModal, setShowExpenditureModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Budget limit state
  const [monthlyBudget, setMonthlyBudget] = useState(null);

  // Load budget limit from Firestore
  const loadBudgetLimit = async () => {
    try {
      if (!isAuthenticated()) return;
      
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/budget`);
      const docSnap = await getDoc(settingsDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMonthlyBudget(data.monthlyBudget || null);
      } else {
        setMonthlyBudget(null);
      }
    } catch (error) {
      console.error('Error loading budget limit:', error);
      setMonthlyBudget(null);
    }
  };
  
  // Group expenses by month
  const groupExpensesByMonth = (expenses) => {
    const grouped = {};
    
    // Add current month even if no expenses
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    grouped[currentMonthKey] = {
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
    
    // Convert to array and sort by month (newest first)
    return Object.entries(grouped)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.key.localeCompare(a.key));
  };

  // Load expenses from Firebase when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const fetchExpenses = async () => {
      try {
        const savedExpenses = await dataManager.getExpenditures();
        
        // Check if component is still mounted
        if (!isMounted) return;
        
        const grouped = groupExpensesByMonth(savedExpenses);
        setMonthlyExpenses(grouped);
        
        // Load budget limit
        await loadBudgetLimit();
        
        // Flatten all expenses for the table
        const allExpenses = savedExpenses.flatMap(expense => {
          const expenseDate = new Date(expense.date);
          const expenseMonthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
          
          return [
            {
              id: `${expense.id}-rent`,
              date: expense.date,
              name: 'Room Rent',
              category: 'rent',
              amount: expense.roomRent,
              paymentMode: expense.paymentMode || 'Cash',
              addedBy: expense.addedBy || 'System',
              parentId: expense.id
            },
            {
              id: `${expense.id}-salary`,
              date: expense.date,
              name: 'Staff Salary',
              category: 'salary',
              amount: expense.staffSalary,
              paymentMode: expense.paymentMode || 'Bank',
              addedBy: expense.addedBy || 'System',
              parentId: expense.id
            },
            {
              id: `${expense.id}-electricity`,
              date: expense.date,
              name: 'Electricity Bill',
              category: 'electricity',
              amount: expense.electricityBill || 0,
              paymentMode: expense.paymentMode || 'Cash',
              addedBy: expense.addedBy || 'System',
              parentId: expense.id
            },
            {
              id: `${expense.id}-internet`,
              date: expense.date,
              name: 'Internet Bill',
              category: 'internet',
              amount: expense.internetBill || 0,
              paymentMode: expense.paymentMode || 'Cash',
              addedBy: expense.addedBy || 'System',
              parentId: expense.id
            },
            {
              id: `${expense.id}-other`,
              date: expense.date,
              name: 'Other Expenses',
              category: 'miscellaneous',
              amount: expense.otherExpenses,
              paymentMode: expense.paymentMode || 'Cash',
              addedBy: expense.addedBy || 'System',
              parentId: expense.id
            }
          ].filter(item => item.amount > 0);
        });
        
        setIndividualExpenses(allExpenses);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchExpenses();
    
    // Listen for expenditure updates
    const handleExpenditureUpdate = () => {
      if (isMounted) {
        fetchExpenses();
      }
    };
    
    // Listen for budget updates
    const handleBudgetUpdate = (event) => {
      if (isMounted) {
        const { budget } = event.detail;
        setMonthlyBudget(budget);
      }
    };
    
    window.addEventListener('expenditureUpdated', handleExpenditureUpdate);
    window.addEventListener('budgetUpdated', handleBudgetUpdate);
    
    // Cleanup event listeners
    return () => {
      isMounted = false;
      window.removeEventListener('expenditureUpdated', handleExpenditureUpdate);
      window.removeEventListener('budgetUpdated', handleBudgetUpdate);
    };
  }, []);

  // Handle clicks outside export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get icon for category
  const getCategoryIcon = (category) => {
    const icons = {
      'rent': '🏢',
      'salary': '👥',
      'electricity': '💡',
      'internet': '🌐',
      'miscellaneous': '📦'
    };
    return icons[category] || '📋';
  };

  // Get display name for category
  const getCategoryDisplayName = (category) => {
    const names = {
      'rent': 'Room Rent',
      'salary': 'Staff Salary',
      'electricity': 'Electricity',
      'internet': 'Internet',
      'miscellaneous': 'Miscellaneous'
    };
    return names[category] || category;
  };

  // Check if budget is exceeded
  const isBudgetExceeded = () => {
    if (!monthlyBudget) return false;
    const currentMonthExpenses = monthlyExpenses.find(month => month.key === selectedMonth) || { total: 0 };
    return currentMonthExpenses.total > monthlyBudget;
  };

  // Export filtered expenses to CSV
  const exportToCSV = async () => {
    // Create CSV content
    let csvContent = "Date,Expense Name,Category,Amount,Payment Mode,Added By\n";
    
    filteredExpenses.forEach(expense => {
      const row = [
        `"${new Date(expense.date).toLocaleDateString()}"`,
        `"${expense.name}"`,
        `"${getCategoryDisplayName(expense.category)}"`,
        `"₹${expense.amount.toLocaleString()}"`,
        `"${expense.paymentMode}"`,
        `"${expense.addedBy}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered expenses to PDF
  const exportToPDF = async () => {
    try {
      
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Expense Report - ${selectedMonth}`, 20, 20);
      
      // Add date
      const date = new Date().toLocaleDateString();
      doc.setFontSize(12);
      doc.text(`Generated on: ${date}`, 20, 30);
      
      // Check if we have data to export
      if (filteredExpenses && filteredExpenses.length > 0) {
        // Prepare table data
        const headers = [['Date', 'Expense Name', 'Category', 'Amount', 'Payment Mode', 'Added By']];
        
        // Map expense data to table rows
        const data = filteredExpenses.map(expense => [
          expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A',
          expense.name || 'N/A',
          getCategoryDisplayName(expense.category || 'miscellaneous'),
          expense.amount ? `₹${Number(expense.amount).toLocaleString()}` : '₹0',
          expense.paymentMode || 'N/A',
          expense.addedBy || 'System'
        ]);
        
        // Add table using autotable
        doc.autoTable({
          head: headers,
          body: data,
          startY: 40,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [52, 152, 219] }, // Blue header
          alternateRowStyles: { fillColor: [240, 240, 240] }, // Light gray alternate rows
          margin: { horizontal: 10 }
        });
      } else {
        doc.text('No expense data available for this period.', 20, 40);
      }
      
      // Save the PDF
      doc.save(`expenses_${selectedMonth}.pdf`);
      
      console.log('PDF export completed successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  // Calculate KPI metrics
  const calculateKPIs = () => {
    const currentMonthExpenses = monthlyExpenses.find(month => month.key === selectedMonth) || {
      total: 0,
      roomRent: 0,
      staffSalary: 0,
      otherExpenses: 0,
      electricityBill: 0,
      internetBill: 0,
      expenses: []
    };
    
    // Find previous month for comparison
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthExpenses = monthlyExpenses.find(month => month.key === prevMonthKey) || { total: 0 };
    
    // Calculate highest expense category
    const categories = [
      { name: 'Staff Salary', amount: currentMonthExpenses.staffSalary, icon: '👥' },
      { name: 'Room Rent', amount: currentMonthExpenses.roomRent, icon: '🏢' },
      { name: 'Electricity Bill', amount: currentMonthExpenses.electricityBill, icon: '💡' },
      { name: 'Internet Bill', amount: currentMonthExpenses.internetBill, icon: '🌐' },
      { name: 'Other Expenses', amount: currentMonthExpenses.otherExpenses, icon: '📦' }
    ];
    const highestCategory = categories.reduce((max, category) => 
      category.amount > max.amount ? category : max, { name: 'None', amount: 0, icon: '' });
    
    // Calculate average daily spend
    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]), 
      parseInt(selectedMonth.split('-')[1]), 
      0
    ).getDate();
    const avgDailySpend = currentMonthExpenses.total / daysInMonth;
    
    // Use saved budget limit or fallback to calculated value
    const budgetLimit = monthlyBudget || (currentMonthExpenses.total * 1.1);
    
    return {
      totalExpenditure: currentMonthExpenses.total,
      thisMonthSpend: currentMonthExpenses.total,
      highestCategory,
      avgDailySpend,
      trend: currentMonthExpenses.total > prevMonthExpenses.total ? 'up' : 'down',
      budgetLimit: budgetLimit,
      prevMonthTotal: prevMonthExpenses.total
    };
  };

  // Filter expenses for the table
  const filteredExpenses = individualExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseMonthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Month filter
      if (expenseMonthKey !== selectedMonth) return false;
      
      // Search filter
      if (searchTerm && !expense.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
      
      // Payment mode filter
      if (paymentModeFilter !== 'all' && expense.paymentMode !== paymentModeFilter) return false;
      
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate expense distribution
  const calculateExpenseDistribution = () => {
    const currentMonth = monthlyExpenses.find(month => month.key === selectedMonth) || {
      roomRent: 0,
      staffSalary: 0,
      otherExpenses: 0,
      electricityBill: 0,
      internetBill: 0,
      total: 0
    };
    
    const total = currentMonth.total || 1; // Avoid division by zero
    
    // Always include all categories with consistent color coding
    const distribution = [
      {
        name: 'Staff Salary',
        amount: currentMonth.staffSalary,
        percentage: ((currentMonth.staffSalary / total) * 100).toFixed(1),
        color: 'var(--info-color)', // Blue
        icon: '👥'
      },
      {
        name: 'Room Rent',
        amount: currentMonth.roomRent,
        percentage: ((currentMonth.roomRent / total) * 100).toFixed(1),
        color: 'var(--success-color)', // Green
        icon: '🏢'
      },
      {
        name: 'Electricity Bill',
        amount: currentMonth.electricityBill || 0,
        percentage: (((currentMonth.electricityBill || 0) / total) * 100).toFixed(1),
        color: 'var(--warning-color)', // Yellow
        icon: '💡'
      },
      {
        name: 'Internet Bill',
        amount: currentMonth.internetBill || 0,
        percentage: (((currentMonth.internetBill || 0) / total) * 100).toFixed(1),
        color: 'var(--purple-color)', // Purple
        icon: '🌐'
      },
      {
        name: 'Miscellaneous',
        amount: currentMonth.otherExpenses,
        percentage: ((currentMonth.otherExpenses / total) * 100).toFixed(1),
        color: 'var(--text-secondary)', // Grey
        icon: '📦'
      }
    ];
    
    // Update amounts and percentages for categories that have actual expenses
    if (currentMonth.staffSalary > 0) {
      const staffSalaryIndex = distribution.findIndex(item => item.name === 'Staff Salary');
      distribution[staffSalaryIndex].amount = currentMonth.staffSalary;
      distribution[staffSalaryIndex].percentage = ((currentMonth.staffSalary / total) * 100).toFixed(1);
    }
    
    if (currentMonth.roomRent > 0) {
      const roomRentIndex = distribution.findIndex(item => item.name === 'Room Rent');
      distribution[roomRentIndex].amount = currentMonth.roomRent;
      distribution[roomRentIndex].percentage = ((currentMonth.roomRent / total) * 100).toFixed(1);
    }
    
    if (currentMonth.electricityBill > 0) {
      const electricityIndex = distribution.findIndex(item => item.name === 'Electricity Bill');
      distribution[electricityIndex].amount = currentMonth.electricityBill;
      distribution[electricityIndex].percentage = ((currentMonth.electricityBill / total) * 100).toFixed(1);
    }
    
    if (currentMonth.internetBill > 0) {
      const internetIndex = distribution.findIndex(item => item.name === 'Internet Bill');
      distribution[internetIndex].amount = currentMonth.internetBill;
      distribution[internetIndex].percentage = ((currentMonth.internetBill / total) * 100).toFixed(1);
    }
    
    if (currentMonth.otherExpenses > 0) {
      const miscIndex = distribution.findIndex(item => item.name === 'Miscellaneous');
      distribution[miscIndex].amount = currentMonth.otherExpenses;
      distribution[miscIndex].percentage = ((currentMonth.otherExpenses / total) * 100).toFixed(1);
    }
    
    // Filter out categories with zero amounts if needed (but keep them for consistency)
    // For now, we'll show all categories as per requirements
    
    return distribution;
  };

  const kpis = calculateKPIs();
  const distribution = calculateExpenseDistribution();
  
  // Get selected month label
  const selectedMonthData = monthlyExpenses.find(month => month.key === selectedMonth);
  const selectedMonthLabel = selectedMonthData ? selectedMonthData.label : 
    new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Calculate days in month for use in the UI
  const daysInMonth = new Date(
    parseInt(selectedMonth.split('-')[0]), 
    parseInt(selectedMonth.split('-')[1]), 
    0
  ).getDate();
  
  // Handle card clicks
  const handleTotalExpenditureClick = () => {
    // Scroll to expense records section
    const expenseRecordsSection = document.querySelector('.section:last-child');
    if (expenseRecordsSection) {
      expenseRecordsSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Show modal with breakdown
    setShowExpenditureModal(true);
  };

  const handleThisMonthSpendClick = () => {
    // Already filtered by selected month, no additional action needed
  };

  const handleHighestCategoryClick = (categoryName) => {
    // Filter by category
    const categoryMap = {
      'Staff Salary': 'salary',
      'Room Rent': 'rent',
      'Electricity Bill': 'electricity',
      'Internet Bill': 'internet',
      'Other Expenses': 'miscellaneous'
    };
    
    const categoryKey = categoryMap[categoryName];
    if (categoryKey) {
      setCategoryFilter(categoryKey);
      setHighlightedCategory(categoryName);
    }
  };

  const handleAvgDailySpendClick = () => {
    setShowCalculationModal(true);
  };

  // Handle distribution bar clicks
  const handleDistributionBarClick = (categoryName) => {
    const categoryMap = {
      'Staff Salary': 'salary',
      'Room Rent': 'rent',
      'Electricity Bill': 'electricity',
      'Internet Bill': 'internet',
      'Miscellaneous': 'miscellaneous'
    };
    
    const categoryKey = categoryMap[categoryName];
    if (categoryKey) {
      setCategoryFilter(categoryKey);
      setHighlightedCategory(categoryName);
      
      // Scroll to expense records section
      setTimeout(() => {
        const expenseRecordsSection = document.querySelector('.section:last-child');
        if (expenseRecordsSection) {
          expenseRecordsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  if (loading) {
    return (
      <RootLayout>
        <div className="expenditure-container">
          <div className="expenditure-header">
            <div className="header-content">
              <div className="header-left">
                <h1>Expenditure</h1>
                <p className="subtitle">Track and manage academy expenses</p>
              </div>
              <div className="header-right">
                <button className="primary-btn" onClick={() => navigate('/expense-form')}>
                  + Add Expense
                </button>
              </div>
            </div>
            <div className="month-selector">
              <label htmlFor="month-select">Select Month:</label>
              <input 
                type="month" 
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-input"
              />
            </div>
          </div>
          
          <div className="kpi-skeleton-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="kpi-card skeleton-card"></div>
            ))}
          </div>
          
          <div className="distribution-skeleton">
            <div className="skeleton-header"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-bar"></div>
            ))}
          </div>
          
          <div className="table-skeleton">
            <div className="skeleton-header"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-row"></div>
            ))}
          </div>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout>
      <div className="expenditure-container">
        {/* Budget Exceeded Notification */}
        {isBudgetExceeded() && (
          <div className="budget-exceeded-notification">
            <div className="notification-content">
              <span className="notification-icon">⚠️</span>
              <span className="notification-message">Your spending has crossed the set monthly budget. Review high-expense categories and adjust allocations to maintain financial control.</span>
            </div>
          </div>
        )}
      
      {/* Page Header */}
      <div className="expenditure-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Expenditure</h1>
            <p className="subtitle">Track and manage academy expenses</p>
          </div>
          <div className="header-right">
            <button className="primary-btn" onClick={() => navigate('/expense-form')}>
              + Add Expense
            </button>
          </div>
        </div>
        <div className="month-selector">
          <label htmlFor="month-select">Select Month:</label>
          <input 
            type="month" 
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-input"
          />
        </div>
      </div>
      
      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card total-expenditure" onClick={handleTotalExpenditureClick} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-icon">💰</span>
            <span className="kpi-title">Total Expenditure</span>
          </div>
          <div className="kpi-value">₹{kpis.totalExpenditure.toLocaleString()}</div>
          <div className="helper-text">Overall spending for the month</div>
          <div className={`kpi-context ${kpis.trend}`}>
            {kpis.prevMonthTotal > 0 ? (
              <>
                {kpis.trend === 'up' ? (
                  <span style={{ color: 'var(--danger-color)' }}>↑ {(Math.abs(kpis.totalExpenditure - kpis.prevMonthTotal) / kpis.prevMonthTotal * 100).toFixed(1)}% vs last month</span>
                ) : (
                  <span style={{ color: 'var(--success-color)' }}>↓ {(Math.abs(kpis.totalExpenditure - kpis.prevMonthTotal) / kpis.prevMonthTotal * 100).toFixed(1)}% vs last month</span>
                )}
              </>
            ) : (
              'First month recorded'
            )}
          </div>
        </div>
        
        <div className="kpi-card this-month-spend" onClick={handleThisMonthSpendClick} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-icon">📅</span>
            <span className="kpi-title">This Month Spend</span>
          </div>
          <div className="kpi-value">₹{kpis.thisMonthSpend.toLocaleString()}</div>
          <div className="helper-text">Budget utilization tracking</div>
          <div className="kpi-context">
            Budget limit: <a href="/budget-management" className="budget-link">₹{kpis.budgetLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</a>
          </div>
          <div className="budget-bar-container">
            <div 
              className="budget-bar"
              style={{
                width: `${Math.min((kpis.thisMonthSpend / kpis.budgetLimit) * 100, 100)}%`,
                backgroundColor: (kpis.thisMonthSpend / kpis.budgetLimit) * 100 < 70 ? 'var(--success-color)' : 
                              (kpis.thisMonthSpend / kpis.budgetLimit) * 100 <= 90 ? 'var(--warning-color)' : 'var(--danger-color)'
              }}
            ></div>
          </div>
          <div className="budget-percentage">
            {isNaN((kpis.thisMonthSpend / kpis.budgetLimit) * 100) ? '0' : Math.min((kpis.thisMonthSpend / kpis.budgetLimit) * 100, 100).toFixed(1)}% of budget used
            {monthlyBudget && (kpis.thisMonthSpend / monthlyBudget) * 100 >= 90 && (kpis.thisMonthSpend / monthlyBudget) * 100 < 100 && (
              <span className="budget-warning"> • Approaching budget limit</span>
            )}
            {monthlyBudget && (kpis.thisMonthSpend / monthlyBudget) * 100 >= 100 && (
              <span className="budget-exceeded"> • Budget exceeded</span>
            )}
          </div>
        </div>
        
        <div className="kpi-card highest-category" onClick={() => handleHighestCategoryClick(kpis.highestCategory.name)} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-icon">{kpis.highestCategory.icon}</span>
            <span className="kpi-title">Highest Category</span>
          </div>
          <div className="kpi-value">{kpis.highestCategory.name}</div>
          <div className="helper-text">Largest expense category</div>
          <div className="kpi-context">
            ₹{kpis.highestCategory.amount.toLocaleString()} spent
          </div>
        </div>
        
        <div className="kpi-card avg-daily-spend" onClick={handleAvgDailySpendClick} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-icon">📊</span>
            <span className="kpi-title">Avg. Daily Spend</span>
          </div>
          <div className="kpi-value">₹{kpis.avgDailySpend.toFixed(2)}</div>
          <div className="helper-text">Daily spending average</div>
          <div className="kpi-context">
            {daysInMonth} days in month
          </div>
        </div>
      </div>
      
      {/* Expense Distribution Section */}
      <div className="section">
        <h2 className="section-title">Expense Distribution</h2>
        
        <div className="distribution-container">
          {distribution.map((item, index) => (
            <div 
              key={index} 
              className={`distribution-item ${highlightedCategory === item.name ? 'highlighted' : ''}`}
              onClick={() => handleDistributionBarClick(item.name)}
              style={{ cursor: 'pointer' }}
            >
              <div className="distribution-header">
                <span className="distribution-icon">{item.icon}</span>
                <span className="distribution-name">{item.name}</span>
                <span className="distribution-amount">₹{item.amount.toLocaleString()}</span>
              </div>
              <div className="distribution-bar-container">
                <div 
                  className="distribution-bar animate"
                  style={{
                    '--target-width': `${item.percentage}%`,
                    backgroundColor: `var(${item.color})`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <span className="distribution-bar-percentage">{item.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Expense Trend Button */}
      <div className="section">
        <button className="primary-btn" onClick={() => navigate('/expense-trend')}>
          📈 View Expense Trend Analysis
        </button>
      </div>
      
      {/* Expense Records Table */}
      <div className="section">
        <div className="table-header">
          <div className="header-content">
            <div>
              <h2 className="section-title">Expense Records</h2>
              <p className="subtitle">Detailed view of all expenses for {selectedMonthLabel}</p>
            </div>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search by name, category, date, amount, payment mode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                <option value="rent">Room Rent</option>
                <option value="salary">Staff Salary</option>
                <option value="electricity">Electricity Bill</option>
                <option value="internet">Internet Bill</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Online">Online Payment</option>
              </select>
              <div className="export-dropdown">
                <button 
                  className="export-btn" 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                >
                  Export ▼
                </button>
                {showExportDropdown && (
                  <div className="export-dropdown-menu">
                    <button className="export-option" onClick={async () => {
                      await exportToCSV();
                      setShowExportDropdown(false);
                    }}>
                      Export as CSV
                    </button>
                    <button className="export-option" onClick={async () => {
                      await exportToPDF();
                      setShowExportDropdown(false);
                    }}>
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {filteredExpenses.length > 0 ? (
          <div className="table-container">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Name</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.name}</td>
                    <td>
                      <span className={`category-badge category-${expense.category}`}>
                        {getCategoryIcon(expense.category)} {getCategoryDisplayName(expense.category)}
                      </span>
                    </td>
                    <td className="amount">₹{expense.amount.toLocaleString()}</td>
                    <td>{expense.paymentMode}</td>
                    <td>{expense.addedBy}</td>
                    <td>
                      <button className="action-btn view-btn">View</button>
                      <button className="action-btn edit-btn">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Expenses Found</h3>
            <p>No expenses recorded for the selected month and filters.</p>
            <button className="primary-btn" onClick={() => navigate('/expense-form')}>
              Add Expense
            </button>
          </div>
        )}
      </div>
      
      {/* Total Expenditure Breakdown Modal */}
      {showExpenditureModal && (
        <div className="modal-overlay" onClick={() => setShowExpenditureModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Total Monthly Expenditure Breakdown</h2>
              <button className="close-btn" onClick={() => setShowExpenditureModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Total expenditure for {selectedMonthLabel}: ₹{kpis.totalExpenditure.toLocaleString()}</p>
              <div className="breakdown-list">
                {distribution.map((item, index) => (
                  <div key={index} className="breakdown-item">
                    <span className="breakdown-label">
                      <span className="breakdown-icon">{item.icon}</span>
                      {item.name}
                    </span>
                    <span className="breakdown-value">₹{item.amount.toLocaleString()} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Average Daily Spend Calculation Modal */}
      {showCalculationModal && (
        <div className="modal-overlay" onClick={() => setShowCalculationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Average Daily Spend Calculation</h2>
              <button className="close-btn" onClick={() => setShowCalculationModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="calculation-details">
                <p><strong>Formula:</strong> Total Spend / Number of Days in Month</p>
                <p><strong>Total Spend:</strong> ₹{kpis.totalExpenditure.toLocaleString()}</p>
                <p><strong>Number of Days:</strong> {daysInMonth} days</p>
                <p><strong>Calculation:</strong> ₹{kpis.totalExpenditure.toLocaleString()} / {daysInMonth} days</p>
                <p><strong>Result:</strong> ₹{kpis.avgDailySpend.toFixed(2)} per day</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </RootLayout>
  );
};

export default MonthlyExpenses;