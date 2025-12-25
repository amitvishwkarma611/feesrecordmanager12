import React from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="logo-container">
          <div className="logo">💰</div>
        </div>
        <h1 className="app-name">Fees Management System</h1>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;