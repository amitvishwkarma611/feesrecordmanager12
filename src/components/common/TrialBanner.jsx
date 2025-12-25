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
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '15px',
      border: '1px solid #bbdefb',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: '0.9rem'
    }}>
      <strong>🎉 Free Trial Active!</strong> You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.
      <br />
      <small>
        <a 
          href="/subscribe" 
          style={{ 
            color: '#1976d2', 
            textDecoration: 'underline', 
            fontWeight: '600' 
          }}
        >
          Upgrade to PRO now for lifetime access
        </a>
      </small>
    </div>
  );
};

export default TrialBanner;