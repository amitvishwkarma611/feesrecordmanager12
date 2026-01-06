import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../utils/dataManager';
import { setStudentsList, setPaymentsList } from '../utils/dataStore';
import AcademicYearSelector from './common/AcademicYearSelector';
import '../styles/Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [supportQueries, setSupportQueries] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalFees: 0,
    paymentPercentage: 0,
    totalStudentPending: 0,
    studentBasedCollected: 0,
    studentBasedPending: 0,
    studentBasedOverdue: 0
  });

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  // Listen for storage changes to update data across components
  useEffect(() => {
    const handleStorageChange = () => {
      refreshData();
    };
    
    // Listen for studentsUpdated event to refresh UI instantly after payment updates
    const handleStudentsUpdated = () => {
      refreshData();
    };
    
    // Listen for feesManagementSync event
    const handleFeesManagementSync = () => {
      refreshData();
    };
    
    // Listen for payment events
    const handlePaymentEvents = () => {
      refreshData();
    };

    // Load initial data
    refreshData();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    window.addEventListener('feesManagementSync', handleFeesManagementSync);
    window.addEventListener('paymentAdded', handlePaymentEvents);
    window.addEventListener('paymentRecorded', handlePaymentEvents);
    window.addEventListener('paymentUpdated', handlePaymentEvents);
    window.addEventListener('paymentsRefresh', handlePaymentEvents);
    
    // Cleanup listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
      window.removeEventListener('feesManagementSync', handleFeesManagementSync);
      window.removeEventListener('paymentAdded', handlePaymentEvents);
      window.removeEventListener('paymentRecorded', handlePaymentEvents);
      window.removeEventListener('paymentUpdated', handlePaymentEvents);
      window.removeEventListener('paymentsRefresh', handlePaymentEvents);
    };
  }, []);

  const refreshData = async () => {
    try {
      // Load data from data manager
      const loadedStudents = await dataManager.getStudents();
      const loadedPayments = await dataManager.getPayments();
      const loadedFeedback = await dataManager.getFeedback();
      const loadedSupportQueries = await dataManager.getSupportQueries();
      
      // Store in global data store
      setStudentsList(loadedStudents);
      setPaymentsList(loadedPayments);
      
      // Store in component state
      setStudents(loadedStudents);
      setPayments(loadedPayments);
      setFeedback(loadedFeedback);
      setSupportQueries(loadedSupportQueries);
      
      // Get real statistics from the improved function
      const statistics = await dataManager.getPaymentStatistics();
      
      // Map the correct property names for the dashboard
      const dashboardStats = {
        ...statistics,
        feesCollected: statistics.totalCollected,
        pendingFees: statistics.totalPending,
        overdueFees: statistics.totalOverdue,
        totalFees: statistics.totalStudentFees,
        paymentProgress: statistics.totalStudentFees > 0 
          ? Math.round((statistics.totalCollected / statistics.totalStudentFees) * 100) 
          : 0
      };
      
      // Use the improved statistics directly
      setStats(dashboardStats);
      
      // Debug log with improved data
      console.log('Dashboard Data (Improved):', {
        totalStudents: dashboardStats.totalStudents,
        totalFees: dashboardStats.totalFees,
        feesCollected: dashboardStats.feesCollected,
        pendingFees: dashboardStats.pendingFees,
        paymentProgress: dashboardStats.paymentProgress,
        statistics
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values to prevent blank page
      setStudents([]);
      setPayments([]);
      setFeedback([]);
      setSupportQueries([]);
      setStats({
        totalStudents: 0,
        totalFees: 0,
        feesCollected: 0,
        pendingFees: 0,
        paymentProgress: 0,
        
        totalStudentsWithPayments: 0,
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalStudentPending: 0,
        totalStudentPaid: 0,
        totalStudentFees: 0,
        paymentBasedTotal: 0,
        studentBasedTotal: 0,
        consistencyCheck: {
          paymentTotal: 0,
          studentTotal: 0,
          difference: 0
        }
      });
    }
  };

  const handleLogout = () => {
    // Remove authentication data from sessionStorage instead of localStorage
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Simple bar chart component
  const BarChart = ({ data }) => {
    // Ensure we have valid data
    const validData = data.filter(item => item && typeof item.value === 'number' && !isNaN(item.value) && isFinite(item.value) && item.value >= 0);
    if (validData.length === 0) return <div className="no-data">No data available</div>;
    
    // Find the maximum value to scale the bars
    const maxValue = Math.max(...validData.map(item => item.value), 1);
    
    // If all values are zero, show equal height bars
    const allZero = validData.every(item => item.value === 0);
    
    return (
      <div className="chart-container">
        <div className="chart-bars">
          {validData.map((item, index) => {
            // Calculate height - if all values are zero, show 50% height for visibility
            const heightPercent = allZero ? 50 : Math.max((item.value / maxValue) * 100, 5);
            
            return (
              <div key={index} className="chart-bar-container">
                <div 
                  className="chart-bar"
                  style={{ 
                    height: `${heightPercent}%`,
                    backgroundColor: item.color,
                    minHeight: '5px'
                  }}
                ></div>
                <div className="chart-label">{item.label}</div>
                <div className="chart-value">₹{Math.round(item.value).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Enhanced pie chart component with better visualization
  const PieChart = ({ data }) => {
    // Ensure we have valid data
    const validData = data.filter(item => item && typeof item.value === 'number' && !isNaN(item.value) && isFinite(item.value) && item.value >= 0);
    if (validData.length === 0) return <div className="no-data">No data available</div>;
    
    const total = validData.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return <div className="no-data">No data available</div>;
    
    // Calculate angles for each slice
    let startAngle = 0;
    
    return (
      <div className="pie-chart-container">
        <div className="pie-chart-wrapper">
          <svg viewBox="0 0 100 100" className="pie-svg">
            {validData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              
              if (angle <= 0) return null;
              
              // For small slices, we still want to show them
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              // Calculate the end point of the arc
              const endAngle = startAngle + angle;
              const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
              const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
              
              // Create the path for the slice
              const pathData = [
                `M 50 50`,
                `L ${startX} ${startY}`,
                `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                'Z'
              ].join(' ');
              
              const sliceStartAngle = startAngle;
              startAngle = endAngle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="1"
                  className="pie-slice"
                />
              );
            })}
            {/* Center circle for donut effect */}
            <circle cx="50" cy="50" r="15" fill="rgba(255, 255, 255, 0.1)" />
          </svg>
        </div>
        <div className="pie-chart-legend">
          {validData.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="legend-label">{item.label}</div>
              <div className="legend-value">₹{Math.round(item.value).toLocaleString()}</div>
              <div className="legend-percentage">
                {((item.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation */}
      <div className="top-nav">
        <div className="nav-brand">
          <h2>FeeManager</h2>
        </div>
        <div className="nav-buttons">
          <button 
            className="nav-button" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button 
            className="nav-button" 
            onClick={() => navigate('/students')}
          >
            Students
          </button>
          <button 
            className="nav-button" 
            onClick={() => navigate('/payments')}
          >
            Payments
          </button>

          <button 
            className="logout-button" 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content full-width">
        <div className="header">
          <h1>Dashboard</h1>
          <div className="header-right">
            <AcademicYearSelector />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-title">Total Students</div>
            <div className="summary-card-value">{stats.totalStudents}</div>
            <div className="summary-card-description">Registered students</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Total Fees</div>
            <div className="summary-card-value">₹{stats.totalFees?.toLocaleString() || 0}</div>
            <div className="summary-card-description">Overall fee structure</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Fees Collected</div>
            <div className="summary-card-value">₹{Math.round(stats.feesCollected || 0).toLocaleString()}</div>
            <div className="summary-card-description">Received payments</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Pending Fees</div>
            <div className="summary-card-value">₹{Math.round(stats.pendingFees || 0).toLocaleString()}</div>
            <div className="summary-card-description">Outstanding payments</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Payment Progress</div>
            <div className="summary-card-value">{stats.paymentProgress || 0}%</div>
            <div className="summary-card-description">Collection rate</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="recent-activity">
            <div className="section-header">
              <h2>Payment Statistics</h2>
            </div>
            <div className="charts-container">
              <div className="chart-wrapper">
                <h3>Payment Distribution</h3>
                {/* Create chart data inside render to ensure it updates */}
                <BarChart data={[
                  { label: 'Collected', value: Math.max(0, stats.totalCollected || 0), color: 'var(--success-color)' },
                  { label: 'Pending', value: Math.max(0, stats.totalPending || 0), color: 'var(--warning-color)' }
                ]} />
              </div>
              <div className="chart-wrapper">
                <h3>Payment Proportion</h3>
                {/* Create chart data inside render to ensure it updates */}
                <PieChart data={[
                  { label: 'Collected', value: Math.max(0, stats.totalCollected || 0), color: 'var(--success-color)' },
                  { label: 'Pending', value: Math.max(0, stats.totalPending || 0), color: 'var(--warning-color)' }
                ]} />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback and Support Queries Section */}
        <div className="feedback-section">
          <div className="section-header">
            <h2>User Feedback & Support Queries</h2>
          </div>
          <div className="feedback-content">
            <div className="feedback-list">
              <h3>Feedback ({feedback.length})</h3>
              {feedback.length > 0 ? (
                <div className="feedback-items">
                  {feedback.map(item => (
                    <div key={item.id} className="feedback-item">
                      <div className="feedback-header">
                        <span className="feedback-rating">{item.rating}/5 stars</span>
                        <span className="feedback-type">{item.type}</span>
                        <span className="feedback-date">
                          {item.createdAt && item.createdAt.toDate ? 
                            item.createdAt.toDate().toLocaleDateString() : 
                            new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="feedback-message">
                        {item.message || 'No message provided'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No feedback submitted yet.</p>
              )}
            </div>
            
            <div className="support-queries-list">
              <h3>Support Queries ({supportQueries.length})</h3>
              {supportQueries.length > 0 ? (
                <div className="support-query-items">
                  {supportQueries.map(query => (
                    <div key={query.id} className="support-query-item">
                      <div className="support-query-header">
                        <span className="query-category">{query.category}</span>
                        <span className="query-priority priority-{query.priority.toLowerCase()}">
                          {query.priority}
                        </span>
                        <span className="query-status">{query.status}</span>
                        <span className="query-date">
                          {query.createdAt && query.createdAt.toDate ? 
                            query.createdAt.toDate().toLocaleDateString() : 
                            new Date(query.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="query-description">
                        {query.description || 'No description provided'}
                      </div>
                      <div className="query-contact">
                        Contact: {query.email || 'Not provided'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No support queries submitted yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;