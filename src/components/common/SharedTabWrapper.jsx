import React from 'react';
import './SharedTabWrapper.css';

const SharedTabWrapper = ({ children }) => {
  return (
    <div className="shared-tab-wrapper">
      {children}
    </div>
  );
};

export default SharedTabWrapper;