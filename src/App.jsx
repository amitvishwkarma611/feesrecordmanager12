import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import Dashboard from './components/dashboard/Dashboard';
import Students from './components/students/Students';
import StudentDetails from './components/students/StudentDetails';
import Fees from './components/fees/Fees';
import ExpenseForm from './components/fees/ExpenseForm';
import MonthlyExpenses from './components/fees/MonthlyExpenses';
import Profile from './components/profile/Profile';
import Settings from './components/profile/Settings';
import Attendance from './components/Attendance';

import Login from './components/Login';
import SignUp from './components/SignUp';
import LoginNew from './components/LoginNew';
import SplashScreen from './components/SplashScreen';
import CollectionTrend from './components/collectionTrend/CollectionTrend';
import BudgetManagement from './components/fees/BudgetManagement';
import ExpenseTrend from './components/fees/ExpenseTrend';
import FeedbackSupport from './components/FeedbackSupport';
import Subscribe from './components/Subscribe';
import TestSubscription from './components/TestSubscription';
import ProtectedRoute from './components/common/ProtectedRoute';
import FreeTrialContinue from './components/FreeTrialContinue';
import TestSubscriptionCreation from './components/TestSubscriptionCreation';
import VerifyEmail from './components/VerifyEmail';
import TermsAndConditions from './components/TermsAndConditions';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { AcademicYearProvider } from './contexts/AcademicYearContext';

import './App.css';

// Separate component for authenticated routes
const AuthenticatedApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Update lastUpdated when data changes
  useEffect(() => {
    const handleDataUpdate = () => {
      setLastUpdated(new Date());
    };

    // Listen for data update events
    window.addEventListener('paymentAdded', handleDataUpdate);
    window.addEventListener('paymentRecorded', handleDataUpdate);
    window.addEventListener('paymentUpdated', handleDataUpdate);
    window.addEventListener('paymentDeleted', handleDataUpdate);
    window.addEventListener('studentsUpdated', handleDataUpdate);
    window.addEventListener('dashboardRefresh', handleDataUpdate);
    window.addEventListener('paymentsRefresh', handleDataUpdate);
    window.addEventListener('studentAdded', handleDataUpdate);
    window.addEventListener('studentUpdated', handleDataUpdate);
    window.addEventListener('studentDeleted', handleDataUpdate);
    window.addEventListener('expenseAdded', handleDataUpdate);
    window.addEventListener('expenseUpdated', handleDataUpdate);
    window.addEventListener('expenseDeleted', handleDataUpdate);

    return () => {
      window.removeEventListener('paymentAdded', handleDataUpdate);
      window.removeEventListener('paymentRecorded', handleDataUpdate);
      window.removeEventListener('paymentUpdated', handleDataUpdate);
      window.removeEventListener('paymentDeleted', handleDataUpdate);
      window.removeEventListener('studentsUpdated', handleDataUpdate);
      window.removeEventListener('dashboardRefresh', handleDataUpdate);
      window.removeEventListener('paymentsRefresh', handleDataUpdate);
      window.removeEventListener('studentAdded', handleDataUpdate);
      window.removeEventListener('studentUpdated', handleDataUpdate);
      window.removeEventListener('studentDeleted', handleDataUpdate);
      window.removeEventListener('expenseAdded', handleDataUpdate);
      window.removeEventListener('expenseUpdated', handleDataUpdate);
      window.removeEventListener('expenseDeleted', handleDataUpdate);
    };
  }, []);

  

  // Determine active tab based on current route
  const getActiveTab = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'dashboard';
      case '/students':
        return 'students';
      case '/student-details':
        return 'students'; // Keep students tab active when viewing student details
      case '/fees':
        return 'fees';
      case '/expenses':
        return 'expenses';
      case '/profile':
        return 'profile';
      case '/settings':
        return 'settings';
      case '/attendance':
        return 'attendance';
      default:
        return 'dashboard';
    }
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Format time ago function
  const formatTimeAgo = (date) => {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) {
      return `${seconds} seconds ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location]);

  useEffect(() => {
    // Listen for success notifications
    const handleSuccess = (event) => {
      const { message } = event.detail;
      setNotification({ show: true, message });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 3000);
    };
    
    window.addEventListener('showSuccess', handleSuccess);
    
    return () => {
      window.removeEventListener('showSuccess', handleSuccess);
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'students':
        navigate('/students');
        break;
      case 'fees':
        navigate('/fees');
        break;
      case 'expenses':
        navigate('/expenses');
        break;
      case 'attendance':
        navigate('/attendance');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isLoggedIn');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'dashboard': return '📊';
      case 'students': return '👥';
      case 'fees': return '💰';
      case 'expenses': return '📊';
      case 'attendance': return '📋';
      case 'profile': return '👤';
      case 'settings': return '⚙️';
      default: return '🏠';
    }
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'Students';
      case 'fees': return 'Fees';
      case 'expenses': return 'Expenses';
      case 'attendance': return 'Attendance';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      default: return 'Home';
    }
  };

  return (
    <div className="app">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="sidebar">
        {['dashboard', 'students', 'fees', 'expenses', 'attendance', 'profile', 'settings'].map((tab) => (
          <button 
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
            data-tooltip={getTabLabel(tab)}
          >
            <div className="nav-icon-container">
              <span className="nav-icon">{getTabIcon(tab)}</span>
            </div>
            <span className="nav-label">{getTabLabel(tab)}</span>
          </button>
        ))}
        
        {/* Logout Button at Bottom */}
        <button 
          className="logout-btn"
          onClick={handleLogout}
          data-tooltip="Logout"
        >
          <div className="logout-icon-container">
            <span className="logout-icon">🚪</span>
          </div>
          <span className="logout-label">Logout</span>
        </button>
      </div>
      
      <div className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/student-details" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><MonthlyExpenses /></ProtectedRoute>} />
          <Route path="/expense-form" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
          <Route path="/monthly-expenses" element={<ProtectedRoute><MonthlyExpenses /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          
          <Route path="/collection-trend" element={<ProtectedRoute><CollectionTrend /></ProtectedRoute>} />
          <Route path="/budget-management" element={<ProtectedRoute><BudgetManagement /></ProtectedRoute>} />
          <Route path="/expense-trend" element={<ProtectedRoute><ExpenseTrend /></ProtectedRoute>} />
          <Route path="/feedback-support" element={<ProtectedRoute><FeedbackSupport /></ProtectedRoute>} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/free-trial-continue" element={<FreeTrialContinue />} />
          <Route path="/test-subscription" element={<TestSubscription />} />
          <Route path="/test-subscription-creation" element={<TestSubscriptionCreation />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login-new" element={<LoginNew />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        </Routes>
      </div>
    

      
      {/* Footer Summary Bar */}
      <div className="footer-summary">
        <div className="footer-left">
          <span>Last updated: {formatTimeAgo(lastUpdated)}</span>
          <div className="sync-status">
            <span className="sync-indicator"></span>
            <span>Data synced</span>
          </div>
        </div>
        <div className="footer-right">
          <span>© 2025 Victory Point Academy</span>
        </div>
      </div>
    </div>
  );
};

// Wrapper component to maintain the tab navigation while using routing
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize dark mode on app load
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        // Clean up any existing freshLogin flag
        localStorage.removeItem('freshLogin');
      } else {
        // User is signed out
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="loading-logo">
            <div className="loading-logo-inner"></div>
          </div>
          <div className="loading-spinner-text">Loading and checking access...</div>
        </div>
      </div>
    );
  }

  // Skip splash screen and go directly to dashboard
  /*
  if (showSplash) {
    return <SplashScreen />;
  }
  */

  // If user is logged in and on login page, redirect to dashboard
  if (isLoggedIn && location.pathname === '/login') {
    navigate('/dashboard');
  }

  // Only render AuthenticatedApp if user is logged in and email is verified
  if (isLoggedIn) {
    return <AuthenticatedApp />;
  }
  
  // Otherwise render login components
  if (location.pathname === '/signup') {
    return <SignUp />;
  } else if (location.pathname === '/login-new') {
    return <LoginNew />;
  } else if (location.pathname !== '/login') {
    navigate('/login');
    return <Login />;
  }
  return <Login />;
};

function App() {
  return (
    <Router>
      <SubscriptionProvider>
        <AcademicYearProvider>
          <AppContent />
        </AcademicYearProvider>
      </SubscriptionProvider>
    </Router>
  );
}

export default App;