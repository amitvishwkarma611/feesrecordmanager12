import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const FreeTrialContinue = () => {
  const navigate = useNavigate();

  const handleContinueWithFreeTrial = () => {
    navigate('/dashboard');
  };

  const handleUpgradeToPro = () => {
    navigate('/subscribe');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎉 Free Trial Activated!</h1>
          <p>You have 7 days to explore all premium features.</p>
        </div>
        
        <div className="trial-options">
          <div className="option-card" onClick={handleContinueWithFreeTrial}>
            <h3>Continue with Free Trial</h3>
            <p>Access all features for 7 days</p>
            <button className="btn-primary">Start Free Trial</button>
          </div>
          
          <div className="option-card" onClick={handleUpgradeToPro}>
            <h3>Upgrade to PRO ₹499</h3>
            <p>Unlock unlimited access forever</p>
            <button className="btn-secondary">Upgrade Now</button>
          </div>
        </div>
        
        <div className="login-footer">
          <p>No credit card required for trial</p>
        </div>
      </div>
    </div>
  );
};

export default FreeTrialContinue;