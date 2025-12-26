import React from 'react';
import TrialBanner from './TrialBanner';
import './RootLayout.css';

const RootLayout = ({ children }) => {
  return (
    <div className="root-layout">
      <TrialBanner />
      <div className="main-content-wrapper">
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RootLayout;