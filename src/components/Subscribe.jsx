import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { useSubscription } from '../contexts/SubscriptionContext';
import { handlePaymentClick } from '../utils/paymentService';
import { getTrialDaysRemaining } from '../services/subscriptionService';

const Subscribe = () => {
  const { subscription, loading, refreshSubscription, isPaidUser, isTrialUser, isTrialExpired } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If user already has an active paid subscription, redirect to dashboard
    if (isPaidUser) {
      // Paid users get full access, redirect to dashboard
      navigate('/dashboard');
      return;
    }
  }, [isPaidUser, navigate]);

  useEffect(() => {
    // Show subscription options if subscription is active (new trial)
    // We'll show the subscription options page for users who want to upgrade early
    if (subscription && subscription.status === 'active' && subscription.isPaid !== true) {
      // Stay on this page to show subscription options
      return;
    }
    
    // If subscription is expired, stay on this page to show upgrade options
    if (subscription && subscription.status === 'expired') {
      // User should see upgrade options
      return;
    }
    
    // If no subscription data and not loading, the subscription context should handle it
    // We don't need to manually refresh here as the context already handles creation
  }, [subscription, loading]);

  const handleUpgrade = async () => {
    // Check subscription status using new functions
    const paidUser = isPaidUser;
    const trialUser = isTrialUser;
    const trialExpired = isTrialExpired;
    
    // PAYMENT BUTTON RULE (CRITICAL): Block payment if user already has active access
    const now = new Date();
    
    // Check if user has active access (trial or paid)
    const hasActiveAccess = trialUser || (paidUser && subscription?.validTill && now <= subscription.validTill.toDate());
    
    if (hasActiveAccess) {
      console.log('Payment blocked: user already has active access');
      setError('You already have active PRO access. No payment required until validity expires.');
      return;
    }
    
    setProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Open Razorpay checkout immediately as requested
      await handlePaymentClick(auth.currentUser.uid, false); // Pass false since we're handling the check above
      setSuccessMessage('Payment successful! Your PRO access is now renewed for 30 days.');

      // Refresh subscription data through context
      await refreshSubscription();

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error processing payment:', err);
      if (err.message === 'Payment cancelled by user') {
        setError('Payment was cancelled. You can try again when ready.');
      } else {
        setError('Failed to process payment. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="subscribe-loading">
            <div className="loading-logo">
              <div className="loading-logo-inner"></div>
            </div>
            <div className="loading-text">Loading subscription details...</div>
          </div>
        </div>
      </div>
    );
  }

  // If user has an active paid subscription, show loading while redirecting
  if (subscription && subscription.status === 'active' && subscription.isPaid === true) {
    // The useEffect will handle the actual navigation
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="subscribe-loading">
            <div className="loading-logo">
              <div className="loading-logo-inner"></div>
            </div>
            <div className="loading-text">Redirecting to dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  const trialDaysRemaining = subscription ? getTrialDaysRemaining(subscription.trialEndsAt) : 0;

  return (
    <div className="login-container" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px'
    }}>
      <div className="login-card" style={{
        maxWidth: '700px',
        width: '100%',
        borderRadius: '12px',
        boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          color: 'white',
          padding: '15px',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: '600'
          }}>🚀 Unlock PRO Features</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            Upgrade to access all premium features
          </p>
        </div>

        <div className="subscription-info" style={{ padding: '20px', flex: '1', overflowY: 'auto' }}>
          {subscription && subscription.status === 'active' && subscription.plan === 'trial' && trialDaysRemaining > 0 && (
            <div className="trial-banner" style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #c3e6cb',
              textAlign: 'center',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}>
              <strong>⏰ Free Trial Active!</strong> You have {trialDaysRemaining} days remaining.
              <br /><small>You can upgrade now for unlimited access forever.</small>
            </div>
          )}
          
          {trialDaysRemaining <= 0 && subscription && subscription.status === 'expired' && (
            <div className="trial-banner" style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #f5c6cb',
              textAlign: 'center',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}>
              <strong>⚠️ Trial Expired</strong> Your free trial ended {Math.abs(trialDaysRemaining)} days ago.
              <br /><small>Upgrade now to continue using the service.</small>
            </div>
          )}

          <div className="feature-list" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#2c3e50', textAlign: 'center', marginBottom: '15px' }}>✨ Premium Features Include:</h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '10px'
            }}>
              <li style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                marginBottom: '8px',
                fontSize: '0.95rem'
              }}>
                <span style={{ 
                  color: '#27ae60', 
                  marginRight: '8px', 
                  fontSize: '1.2rem' 
                }}>✓</span>
                <span>Unlimited student records</span>
              </li>
              <li style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                marginBottom: '8px',
                fontSize: '0.95rem'
              }}>
                <span style={{ 
                  color: '#27ae60', 
                  marginRight: '8px', 
                  fontSize: '1.2rem' 
                }}>✓</span>
                <span>Advanced reporting & analytics</span>
              </li>
              <li style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                marginBottom: '8px',
                fontSize: '0.95rem'
              }}>
                <span style={{ 
                  color: '#27ae60', 
                  marginRight: '8px', 
                  fontSize: '1.2rem' 
                }}>✓</span>
                <span>Priority customer support</span>
              </li>
              <li style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                marginBottom: '8px',
                fontSize: '0.95rem'
              }}>
                <span style={{ 
                  color: '#27ae60', 
                  marginRight: '8px', 
                  fontSize: '1.2rem' 
                }}>✓</span>
                <span>Custom branding options</span>
              </li>
            </ul>
          </div>

          <div className="pricing-card" style={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f0 100%)',
            border: '2px solid #e0e6ed',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              color: '#2c3e50', 
              margin: '0 0 10px 0',
              fontSize: '1.3rem'
            }}>Monthly Payment</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              color: '#2c3e50',
              marginBottom: '5px'
            }}>
              ₹499
            </div>
            <div style={{ 
              color: '#7f8c8d', 
              fontSize: '0.9rem',
              marginBottom: '15px'
            }}>
              30 days access to all PRO features
            </div>
            <p style={{ 
              color: '#e74c3c', 
              fontSize: '0.85rem',
              fontStyle: 'italic',
              margin: 0
            }}>
              Manual monthly payment - pay every 30 days
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #f5c6cb',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #c3e6cb',
              textAlign: 'center'
            }}>
              {successMessage}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={processing || isPaidUser}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '8px',
              background: isPaidUser 
                ? 'linear-gradient(90deg, #95a5a6, #7f8c8d)' 
                : 'linear-gradient(90deg, #667eea, #764ba2)',
              border: 'none',
              color: 'white',
              cursor: (processing || isPaidUser) ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!processing && !isPaidUser) {
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {processing ? (
              <span>
                <span className="loading-spinner" style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px',
                  verticalAlign: 'middle'
                }}></span>
                Processing...
              </span>
            ) : isPaidUser ? (
              '✅ PRO Active'
            ) : isTrialExpired ? (
              '💳 Renew PRO – ₹499'
            ) : (
              '💳 Upgrade to PRO – ₹499'
            )}
          </button>

          <div style={{
            textAlign: 'center',
            marginTop: '15px',
            fontSize: '0.85rem',
            color: '#7f8c8d'
          }}>
            <p>🔒 Secure payment processing powered by Razorpay</p>
            <p>💳 You can use any debit/credit card, UPI, or net banking</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;