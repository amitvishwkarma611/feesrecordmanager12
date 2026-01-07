import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../../utils/dataManager';
import { isAuthenticated } from '../../utils/auth';
import './ExpenseTrend.css';

const ExpenseTrend = () => {
  const navigate = useNavigate();
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonYear, setComparisonYear] = useState(new Date().getFullYear() - 1);
  const [trendAnalysis, setTrendAnalysis] = useState(null);

  // Load monthly expenses data
  useEffect(() => {
    const loadMonthlyExpenses = async () => {
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const expenses = await dataManager.getExpenditures();
        console.log('Raw expenses data:', expenses);
        const groupedExpenses = groupExpensesByMonth(expenses);
        console.log('Grouped expenses data:', groupedExpenses);
        setMonthlyExpenses(groupedExpenses);
      } catch (error) {
        console.error('Error loading monthly expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyExpenses();
  }, [navigate]);

  // Get display name for category
  const getCategoryDisplayName = (category) => {
    const names = {
      'rent': 'Room Rent',
      'salary': 'Staff Salary',
      'electricity': 'Electricity',
      'internet': 'Internet',
      'miscellaneous': 'Miscellaneous',
      'roomRent': 'Room Rent',
      'staffSalary': 'Staff Salary',
      'otherExpenses': 'Miscellaneous',
      'electricityBill': 'Electricity',
      'internetBill': 'Internet'
    };
    return names[category] || category;
  };

  // Group expenses by month
  const groupExpensesByMonth = (expenses) => {
    console.log('Grouping expenses:', expenses);
    const grouped = {};

    expenses.forEach(expense => {
      console.log('Processing expense:', expense);
      // Parse the date
      const date = new Date(expense.date);
      console.log('Parsed date:', date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      console.log('Month key:', monthKey, 'Month label:', monthLabel);

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

      // Add expense to the month
      grouped[monthKey].expenses.push(expense);

      // Update totals
      // For expenditure records, we sum the individual category amounts instead of using a single 'amount' field
      grouped[monthKey].total += (parseFloat(expense.roomRent) || 0) + 
                                (parseFloat(expense.staffSalary) || 0) + 
                                (parseFloat(expense.electricityBill) || 0) + 
                                (parseFloat(expense.internetBill) || 0) + 
                                (parseFloat(expense.otherExpenses) || 0);

      // Update category totals
      grouped[monthKey].roomRent += parseFloat(expense.roomRent) || 0;
      grouped[monthKey].staffSalary += parseFloat(expense.staffSalary) || 0;
      grouped[monthKey].electricityBill += parseFloat(expense.electricityBill) || 0;
      grouped[monthKey].internetBill += parseFloat(expense.internetBill) || 0;
      grouped[monthKey].otherExpenses += parseFloat(expense.otherExpenses) || 0;
      
      console.log('Updated month data:', grouped[monthKey]);
    });

    // Convert to array and sort chronologically
    const result = Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
    console.log('Final grouped result:', result);
    return result;
  };

  // Filter expenses for the selected year
  const filteredExpenses = monthlyExpenses.filter(month => 
    month.key.startsWith(selectedYear.toString())
  );
  
  // Filter expenses for the comparison year
  const comparisonExpenses = monthlyExpenses.filter(month => 
    month.key.startsWith(comparisonYear.toString())
  );

  // Calculate yearly totals
  const yearlyTotals = filteredExpenses.reduce((acc, month) => {
    acc.total += month.total;
    acc.roomRent += month.roomRent;
    acc.staffSalary += month.staffSalary;
    acc.otherExpenses += month.otherExpenses;
    acc.electricityBill += month.electricityBill;
    acc.internetBill += month.internetBill;
    return acc;
  }, {
    total: 0,
    roomRent: 0,
    staffSalary: 0,
    otherExpenses: 0,
    electricityBill: 0,
    internetBill: 0
  });
  
  // Calculate comparison year totals
  const comparisonTotals = comparisonExpenses.reduce((acc, month) => {
    acc.total += month.total;
    acc.roomRent += month.roomRent;
    acc.staffSalary += month.staffSalary;
    acc.otherExpenses += month.otherExpenses;
    acc.electricityBill += month.electricityBill;
    acc.internetBill += month.internetBill;
    return acc;
  }, {
    total: 0,
    roomRent: 0,
    staffSalary: 0,
    otherExpenses: 0,
    electricityBill: 0,
    internetBill: 0
  });
  
  // Calculate trend analysis
  useEffect(() => {
    if (filteredExpenses.length > 0 && comparisonExpenses.length > 0) {
      const analysis = {
        totalChange: yearlyTotals.total - comparisonTotals.total,
        totalChangePercent: comparisonTotals.total > 0 ? ((yearlyTotals.total - comparisonTotals.total) / comparisonTotals.total) * 100 : 0,
        highestIncreaseCategory: '',
        highestDecreaseCategory: '',
        categoryChanges: {}
      };
      
      // Calculate category changes
      const categories = ['roomRent', 'staffSalary', 'otherExpenses', 'electricityBill', 'internetBill'];
      let maxIncrease = -Infinity;
      let maxDecrease = Infinity;
      
      categories.forEach(category => {
        const change = yearlyTotals[category] - comparisonTotals[category];
        const changePercent = comparisonTotals[category] > 0 ? ((yearlyTotals[category] - comparisonTotals[category]) / comparisonTotals[category]) * 100 : 0;
        
        analysis.categoryChanges[category] = {
          change,
          changePercent
        };
        
        if (changePercent > maxIncrease) {
          maxIncrease = changePercent;
          analysis.highestIncreaseCategory = category;
        }
        
        if (changePercent < maxDecrease) {
          maxDecrease = changePercent;
          analysis.highestDecreaseCategory = category;
        }
      });
      
      setTrendAnalysis(analysis);
    }
  }, [filteredExpenses, comparisonExpenses, yearlyTotals, comparisonTotals]);

  // Render expense trend chart
  const renderTrendChart = () => {
    if (filteredExpenses.length === 0) {
      return (
        <div className="chart-placeholder">
          <div className="placeholder-icon">📊</div>
          <h3>No Data Available</h3>
          <p>No expense data found for {selectedYear}</p>
        </div>
      );
    }

    // Combine both years' data for comparison
    const allMonths = [...filteredExpenses, ...comparisonExpenses];
    
    // Get max total for scaling
    const maxTotal = Math.max(...allMonths.map(month => month.total), 1);

    return (
      <div className="trend-chart-container">
        <div className="chart-header">
          <h3>Monthly Expense Trend Comparison</h3>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color current-year"></div>
              <span>{selectedYear} (Current)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color comparison-year"></div>
              <span>{comparisonYear} (Previous)</span>
            </div>
          </div>
        </div>
        <div className="chart-wrapper">
          <div className="y-axis">
            {[100, 75, 50, 25, 0].map(percent => (
              <div key={percent} className="y-axis-label">
                ₹{(maxTotal * percent / 100).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </div>
            ))}
          </div>
          <div className="chart-area">
            <svg viewBox={`0 0 ${Math.max(filteredExpenses.length, comparisonExpenses.length) * 100} 300`} className="trend-svg">
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="currentYearGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3498db" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3498db" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="comparisonYearGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#e74c3c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#e74c3c" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="0"
                  y1={i * 75}
                  x2={Math.max(filteredExpenses.length, comparisonExpenses.length) * 100}
                  y2={i * 75}
                  stroke="#eee"
                  strokeWidth="1"
                />
              ))}
              
              {/* Area under curve for current year */}
              <polygon
                points={`0,300 ${filteredExpenses.map((month, index) => {
                  const x = index * 100 + 50;
                  const y = 300 - (month.total / maxTotal) * 250;
                  return `${x},${y}`;
                }).join(' ')} ${(filteredExpenses.length - 1) * 100 + 50},300`}
                fill="url(#currentYearGradient)"
              />
              
              {/* Line for current year */}
              <polyline
                points={filteredExpenses.map((month, index) => {
                  const x = index * 100 + 50;
                  const y = 300 - (month.total / maxTotal) * 250;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#3498db"
                strokeWidth="4"
                className="trend-line"
              />
              
              {/* Area under curve for comparison year */}
              <polygon
                points={`0,300 ${comparisonExpenses.map((month, index) => {
                  const x = index * 100 + 50;
                  const y = 300 - (month.total / maxTotal) * 250;
                  return `${x},${y}`;
                }).join(' ')} ${(comparisonExpenses.length - 1) * 100 + 50},300`}
                fill="url(#comparisonYearGradient)"
              />
              
              {/* Line for comparison year */}
              <polyline
                points={comparisonExpenses.map((month, index) => {
                  const x = index * 100 + 50;
                  const y = 300 - (month.total / maxTotal) * 250;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#e74c3c"
                strokeWidth="4"
                strokeDasharray="6,6"
                className="trend-line"
              />
              
              {/* Data points for current year */}
              {filteredExpenses.map((month, index) => {
                const x = index * 100 + 50;
                const y = 300 - (month.total / maxTotal) * 250;
                return (
                  <g key={`current-${month.key}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="#3498db"
                      stroke="white"
                      strokeWidth="3"
                      className="data-point"
                    />
                    <text
                      x={x}
                      y={y - 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#333"
                      fontWeight="600"
                      className="data-label"
                    >
                      ₹{month.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </text>
                  </g>
                );
              })}
              
              {/* Data points for comparison year */}
              {comparisonExpenses.map((month, index) => {
                const x = index * 100 + 50;
                const y = 300 - (month.total / maxTotal) * 250;
                return (
                  <g key={`compare-${month.key}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="#e74c3c"
                      stroke="white"
                      strokeWidth="3"
                      className="data-point"
                    />
                    <text
                      x={x}
                      y={y + 30}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#333"
                      fontWeight="600"
                      className="data-label"
                    >
                      ₹{month.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* X-axis labels */}
            <div className="x-axis">
              {Array.from({length: Math.max(filteredExpenses.length, comparisonExpenses.length)}).map((_, index) => {
                const months = filteredExpenses[index] || comparisonExpenses[index];
                return (
                  <div key={index} className="x-axis-label" style={{left: `${index * 100 + 50}px`}}>
                    {months ? months.label.split(' ')[0] : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render category breakdown
  const renderCategoryBreakdown = () => {
    const categories = [
      { 
        name: 'Staff Salary', 
        current: yearlyTotals.staffSalary, 
        comparison: comparisonTotals.staffSalary,
        color: '--info-color'
      },
      { 
        name: 'Room Rent', 
        current: yearlyTotals.roomRent, 
        comparison: comparisonTotals.roomRent,
        color: '--success-color'
      },
      { 
        name: 'Electricity', 
        current: yearlyTotals.electricityBill, 
        comparison: comparisonTotals.electricityBill,
        color: '--warning-color'
      },
      { 
        name: 'Internet', 
        current: yearlyTotals.internetBill, 
        comparison: comparisonTotals.internetBill,
        color: '--primary-color'
      },
      { 
        name: 'Miscellaneous', 
        current: yearlyTotals.otherExpenses, 
        comparison: comparisonTotals.otherExpenses,
        color: '--accent-color'
      }
    ];

    return (
      <div className="category-breakdown">
        <h3>Category Breakdown Comparison</h3>
        <div className="category-comparison-header">
          <div className="header-column">Category</div>
          <div className="header-column">{selectedYear}</div>
          <div className="header-column">{comparisonYear}</div>
          <div className="header-column">Change</div>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => {
            const change = category.current - category.comparison;
            const changePercent = category.comparison > 0 ? ((category.current - category.comparison) / category.comparison) * 100 : 0;
            
            return (
              <div key={index} className="category-card">
                <div className="category-header">
                  <span className="category-name">{category.name}</span>
                </div>
                <div className="category-comparison">
                  <div className="comparison-value">
                    <div className="value-label">Current</div>
                    <div className="value-amount">₹{category.current.toLocaleString()}</div>
                  </div>
                  <div className="comparison-value">
                    <div className="value-label">Previous</div>
                    <div className="value-amount">₹{category.comparison.toLocaleString()}</div>
                  </div>
                  <div className={`comparison-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    <div className="change-amount">
                      {change >= 0 ? '+' : ''}{change.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                    <div className="change-percent">
                      ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="category-bar-container">
                  <div 
                    className="category-bar current"
                    style={{
                      width: `${yearlyTotals.total > 0 ? (category.current / yearlyTotals.total) * 100 : 0}%`,
                      backgroundColor: `var(${category.color})`
                    }}
                  ></div>
                  <div 
                    className="category-bar comparison"
                    style={{
                      width: `${comparisonTotals.total > 0 ? (category.comparison / comparisonTotals.total) * 100 : 0}%`,
                      backgroundColor: `var(${category.color})`,
                      opacity: 0.5
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="expense-trend-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading expense trend data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-trend-container">
      {/* Welcome Row */}
      <div className="welcome-row">
        <h2 className="welcome-text">Welcome, <span className="accent-text">Admin</span></h2>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-cards-row">
        <div className="summary-card">
          <div className="card-top-section">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="card-bottom-section">
            <div className="card-label">Total Expense</div>
            <div className="card-value">₹{yearlyTotals.total.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-top-section">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V9H9M21 21V15H15M7 17L3 21M21 3L17 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="card-bottom-section">
            <div className="card-label">Monthly Avg</div>
            <div className="card-value">₹{(yearlyTotals.total / 12).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-top-section">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 17H21M13 7H21M3 17L7 13L3 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="card-bottom-section">
            <div className="card-label">Categories</div>
            <div className="card-value">
              {Object.keys(new Set(filteredExpenses.flatMap(m => 
                ['roomRent', 'staffSalary', 'otherExpenses', 'electricityBill', 'internetBill']))).length}
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-top-section">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7H21M13 17H21M3 7L7 11L3 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="card-bottom-section">
            <div className="card-label">Highest Month</div>
            <div className="card-value">
              {filteredExpenses.length > 0 ? 
                filteredExpenses.reduce((max, month) => month.total > max.total ? month : max).label : 
                'N/A'}
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-top-section">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7H21M13 17H21M3 7L7 11L3 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="card-bottom-section">
            <div className="card-label">Lowest Month</div>
            <div className="card-value">
              {filteredExpenses.length > 0 ? 
                filteredExpenses.reduce((min, month) => month.total < min.total ? month : min).label : 
                'N/A'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Two Report Cards Row */}
      <div className="report-cards-row">
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Overall Expense Report</h3>
          </div>
          <div className="report-table">
            <div className="table-row">
              <div className="table-cell-label">Total Expense</div>
              <div className="table-cell-value">₹{yearlyTotals.total.toLocaleString()}</div>
            </div>
            <div className="table-row">
              <div className="table-cell-label">Paid Amount</div>
              <div className="table-cell-value">₹{yearlyTotals.total.toLocaleString()}</div>
            </div>
            <div className="table-row">
              <div className="table-cell-label">Pending Amount</div>
              <div className="table-cell-value">₹0</div>
            </div>
          </div>
        </div>
        
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Overall Expense Summary</h3>
          </div>
          <div className="report-table">
            <div className="table-row">
              <div className="table-cell-label">Highest Expense Month</div>
              <div className="table-cell-value">
                {filteredExpenses.length > 0 ? 
                  filteredExpenses.reduce((max, month) => month.total > max.total ? month : max).label : 
                  'N/A'}
              </div>
            </div>
            <div className="table-row">
              <div className="table-cell-label">Lowest Expense Month</div>
              <div className="table-cell-value">
                {filteredExpenses.length > 0 ? 
                  filteredExpenses.reduce((min, month) => month.total < min.total ? month : min).label : 
                  'N/A'}
              </div>
            </div>
            <div className="table-row">
              <div className="table-cell-label">Total Categories</div>
              <div className="table-cell-value">
                {Object.keys(new Set(filteredExpenses.flatMap(m => 
                  ['roomRent', 'staffSalary', 'otherExpenses', 'electricityBill', 'internetBill']))).length}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Section Row */}
      <div className="chart-section-row">
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Monthly Expense Trend</h2>
            <div className="header-controls">
              <select 
                value={new Date().getMonth()}
                className="month-dropdown"
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="year-dropdown"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="action-icon">⚙️</div>
            </div>
          </div>
          <div className="chart-content">
            {filteredExpenses.length > 0 ? renderTrendChart() : (
              <div className="chart-placeholder">
                <div className="placeholder-icon">📊</div>
                <h3>No Data Available</h3>
                <p>No expense data found for {selectedYear}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Monthly Expense Total</h2>
            <div className="header-controls">
              <select 
                value={new Date().getMonth()}
                className="month-dropdown"
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="year-dropdown"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="action-icon">⚙️</div>
            </div>
          </div>
          <div className="chart-content">
            {filteredExpenses.length > 0 ? (
              <div className="trend-chart-container">
                <div className="chart-wrapper">
                  <div className="y-axis">
                    {[100, 75, 50, 25, 0].map(percent => (
                      <div key={percent} className="y-axis-label">
                        ₹{Math.round((Math.max(...filteredExpenses.map(m => m.total), 1) * percent / 100)).toLocaleString()}
                      </div>
                    ))}
                  </div>
                  <div className="chart-area">
                    <svg viewBox={`0 0 ${filteredExpenses.length * 100} 300`} className="trend-svg">
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 75}
                          x2={filteredExpenses.length * 100}
                          y2={i * 75}
                          stroke="#eee"
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Bars for each month */}
                      {filteredExpenses.map((month, index) => {
                        const maxTotal = Math.max(...filteredExpenses.map(m => m.total), 1);
                        const barHeight = (month.total / maxTotal) * 250;
                        const barWidth = 60;
                        const xPosition = index * 100 + 20;
                        
                        return (
                          <g key={month.key}>
                            <rect
                              x={xPosition}
                              y={300 - barHeight}
                              width={barWidth}
                              height={barHeight}
                              fill="var(--info-color)"
                              rx="4"
                              className="chart-bar"
                            />
                            <text
                              x={xPosition + barWidth / 2}
                              y={300 - barHeight - 10}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#333"
                              fontWeight="600"
                              className="data-label"
                            >
                              ₹{month.total.toLocaleString()}
                            </text>
                            <text
                              x={xPosition + barWidth / 2}
                              y={320}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#64748b"
                              fontWeight="500"
                              className="month-label"
                            >
                              {month.label.split(' ')[0]}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-placeholder">
                <div className="placeholder-icon">📊</div>
                <h3>No Data Available</h3>
                <p>No expense data found for {selectedYear}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTrend;