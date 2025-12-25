import React from 'react';
import './RootLayout.css';

const RootLayout = ({ children }) => {
  return (
    <div className="root-layout">
      <div className="main-content-wrapper">
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default RootLayout;