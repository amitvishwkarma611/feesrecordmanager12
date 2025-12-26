import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { getTrialDaysRemaining } from '../../services/subscriptionService';

const TrialBanner = () => {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) {
    return null;
  }

  // If user has a paid subscription, don't show the trial banner
  if (subscription.isPaid === true) {
    return null;
  }

  // If subscription is not a trial or has expired, don't show the banner
  if (subscription.plan !== 'trial' || (subscription.status === 'expired')) {
    return null;
  }

  const trialDaysRemaining = getTrialDaysRemaining(subscription.trialEndsAt);

  // Don't show banner if trial is expired
  if (trialDaysRemaining <= 0) {
    return null;
  }

  return (
    <div className="trial-banner" style={{
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #bbdefb',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <strong>🎉 Free Trial Active!</strong> You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.
      <br />
      <small style={{display: 'block', marginTop: '8px'}}>
        <a 
          href="/subscribe" 
          style={{ 
            backgroundColor: '#1976d2',
            color: 'white', 
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none', 
            fontWeight: '600',
            display: 'inline-block',
            marginTop: '8px'
          }}
        >
          Subscribe Now for ₹499/month
        </a>
      </small>
    </div>
  );
};

export default TrialBanner;