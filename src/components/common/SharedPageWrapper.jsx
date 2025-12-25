import React from 'react';
import './SharedPageWrapper.css';

const SharedPageWrapper = ({ children }) => {
  return (
    <div className="shared-page-wrapper">
      {children}
    </div>
  );
};

export default SharedPageWrapper;