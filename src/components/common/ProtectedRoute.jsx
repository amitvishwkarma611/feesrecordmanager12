import React, { useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/firebaseConfig';
import { useSubscription } from '../../contexts/SubscriptionContext';

const ProtectedRoute = ({ children }) => {
  const { hasActiveSub, loading, subscription, error } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    // Check if user's email is verified
    if (!auth.currentUser.emailVerified) {
      navigate('/verify-email');
      return;
    }

    // If there's an error in the subscription context, log it
    if (error) {
      console.error('ProtectedRoute: Subscription context error:', error);
    }

    // If subscription check is complete and user doesn't have active subscription
    // But don't redirect if already on subscribe page
    if (!loading && !hasActiveSub && location.pathname !== '/subscribe') {
      navigate('/subscribe');
    }
  }, [hasActiveSub, loading, navigate, location, subscription, error]);

  // Handle loading state
  // But don't show loading if already on subscribe page
  if (loading && location.pathname !== '/subscribe') {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="loading-logo">
            <div className="loading-logo-inner"></div>
          </div>
          <div className="loading-text">Checking access...</div>
        </div>
      </div>
    );
  }
  
  // If user doesn't have active subscription and not on subscribe page, show loading
  // The useEffect will handle the actual navigation
  if (!hasActiveSub && location.pathname !== '/subscribe') {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="loading-logo">
            <div className="loading-logo-inner"></div>
          </div>
          <div className="loading-spinner-text">Redirecting to subscription page...</div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;