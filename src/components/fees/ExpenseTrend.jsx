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
      {/* Header */}
      <div className="trend-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-text-container">
              <h1>Expense Trend Analysis</h1>
              <p className="subtitle">Analyze spending patterns and trends over time</p>
            </div>
          </div>
          <div className="header-right">
            <button className="back-btn" onClick={() => navigate(-1)}>
              ← Back to Expenses
            </button>
          </div>
        </div>
        
        <div className="year-selector">
          <div className="year-select-group">
            <label htmlFor="year-select">Analyze Year:</label>
            <select 
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-input"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="year-select-group">
            <label htmlFor="comparison-year-select">Compare With:</label>
            <select 
              id="comparison-year-select"
              value={comparisonYear}
              onChange={(e) => setComparisonYear(parseInt(e.target.value))}
              className="year-input"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card total-spent">
          <div className="card-header">
            <span className="card-title">Total Spending</span>
          </div>
          <div className="card-value">₹{yearlyTotals.total.toLocaleString()}</div>
          <div className="card-comparison">
            <span className={comparisonTotals.total > 0 && yearlyTotals.total >= comparisonTotals.total ? 'positive' : 'negative'}>
              {comparisonTotals.total > 0 ? (
                <>
                  {yearlyTotals.total >= comparisonTotals.total ? '▲' : '▼'} 
                  {Math.abs(((yearlyTotals.total - comparisonTotals.total) / comparisonTotals.total) * 100).toFixed(1)}% vs {comparisonYear}
                </>
              ) : ''}
            </span>
          </div>
          <div className="card-indicator total-spent-indicator"></div>
        </div>
        
        <div className="summary-card avg-monthly">
          <div className="card-header">
            <span className="card-title">Average Monthly</span>
          </div>
          <div className="card-value">₹{(yearlyTotals.total / 12).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
          <div className="card-comparison">
            <span className={comparisonTotals.total > 0 && (yearlyTotals.total / 12) >= (comparisonTotals.total / 12) ? 'positive' : 'negative'}>
              {comparisonTotals.total > 0 ? (
                <>
                  {(yearlyTotals.total / 12) >= (comparisonTotals.total / 12) ? '▲' : '▼'} 
                  {Math.abs((((yearlyTotals.total / 12) - (comparisonTotals.total / 12)) / (comparisonTotals.total / 12)) * 100).toFixed(1)}% vs {comparisonYear}
                </>
              ) : ''}
            </span>
          </div>
          <div className="card-indicator avg-monthly-indicator"></div>
        </div>
        
        <div className="summary-card highest-category">
          <div className="card-header">
            <span className="card-title">Top Expense Category</span>
          </div>
          <div className="card-value">
            {yearlyTotals.staffSalary >= yearlyTotals.roomRent && yearlyTotals.staffSalary >= yearlyTotals.otherExpenses ? 'Staff Salary' :
             yearlyTotals.roomRent >= yearlyTotals.otherExpenses ? 'Room Rent' : 'Miscellaneous'}
          </div>
          <div className="card-indicator highest-category-indicator"></div>
        </div>
      </div>
      
      {/* Comparison Messages */}
      <div className="comparison-messages">
        {comparisonTotals.total <= 0 && (
          <div className="no-comparison-message">
            No data for comparison
          </div>
        )}
        {comparisonTotals.total > 0 && (
          <div className="comparison-message">
            vs {comparisonTotals.staffSalary >= comparisonTotals.roomRent && comparisonTotals.staffSalary >= comparisonTotals.otherExpenses ? 'Staff Salary' :
             comparisonTotals.roomRent >= comparisonTotals.otherExpenses ? 'Room Rent' : 'Miscellaneous'} in {comparisonYear}
          </div>
        )}
      </div>
      
      {/* Trend Analysis */}
      {trendAnalysis && (
        <div className="trend-analysis">
          <h3>Year-over-Year Analysis ({selectedYear} vs {comparisonYear})</h3>
          <div className="analysis-cards">
            <div className="analysis-card">
              <div className="card-header">
                <span className="card-title">Total Spending Change</span>
              </div>
              <div className={`card-value ${trendAnalysis.totalChange >= 0 ? 'positive' : 'negative'}`}>
                {trendAnalysis.totalChange >= 0 ? '+' : ''}{trendAnalysis.totalChange.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </div>
              <div className={`card-comparison ${trendAnalysis.totalChangePercent >= 0 ? 'positive' : 'negative'}`}>
                {trendAnalysis.totalChangePercent >= 0 ? '+' : ''}{trendAnalysis.totalChangePercent.toFixed(1)}% change
              </div>
            </div>
            
            <div className="analysis-card">
              <div className="card-header">
                <span className="card-title">Biggest Increase</span>
              </div>
              <div className="card-value">
                {getCategoryDisplayName(trendAnalysis.highestIncreaseCategory)}
              </div>
              <div className="card-comparison positive">
                +{trendAnalysis.categoryChanges[trendAnalysis.highestIncreaseCategory]?.changePercent.toFixed(1)}%
              </div>
            </div>
            
            <div className="analysis-card">
              <div className="card-header">
                <span className="card-title">Biggest Decrease</span>
              </div>
              <div className="card-value">
                {getCategoryDisplayName(trendAnalysis.highestDecreaseCategory)}
              </div>
              <div className="card-comparison negative">
                {trendAnalysis.categoryChanges[trendAnalysis.highestDecreaseCategory]?.changePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Trend Chart */}
      {renderTrendChart()}
      
      {/* Category Breakdown */}
      {renderCategoryBreakdown()}
    </div>
  );
};

export default ExpenseTrend;