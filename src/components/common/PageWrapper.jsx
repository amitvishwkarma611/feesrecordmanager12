import React from 'react';
import './PageWrapper.css';

const PageWrapper = ({ children }) => {
  return (
    <div className="page-wrapper">
      {children}
    </div>
  );
};

export default PageWrapper;