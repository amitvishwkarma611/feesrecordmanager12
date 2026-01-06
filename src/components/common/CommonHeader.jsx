import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AcademicYearSelector from './AcademicYearSelector';
import './CommonHeader.css';

const CommonHeader = ({ title, subtitle, showAvatar = true, showLogo = true, logoUrl, firmName, actions }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="common-header">
      <div className="header-left">
        {showLogo && (
          <div className="app-logo-container">
            {logoUrl ? (
              <img src={logoUrl} alt="Academy Logo" className="app-logo" />
            ) : (
              <img src="/Logo.png" alt="Academy Fees Manager Logo" className="app-logo" />
            )}
            <div className="app-title-container">
              <h1 className="app-name">{firmName ? `${firmName} Fees Manager` : 'Fees Manager'}</h1>
              <div className="app-subtitle">
                <span className="subtitle-text">{subtitle || 'Managing Fees'}</span>
                <span className="separator">•</span>
                <span className="current-month">{getCurrentMonthYear()}</span>
                <span className="separator">•</span>
                <span className="status-container">
                  <span className="status-dot active"></span>
                  <span className="status-text">Active</span>
                </span>
              </div>
            </div>
          </div>
        )}
        {!showLogo && <h1>{title}</h1>}
      </div>
      
      <div className="header-right">
        <AcademicYearSelector />
        {actions && (
          <div className="header-actions">
            {actions}
          </div>
        )}
        {showAvatar && (
          <div className="avatar-dropdown">
            {/* Avatar dropdown */}
            <div className="avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="avatar-initials">VP</span>
            </div>
            {showUserMenu && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => navigate('/profile')}>
                  Profile
                </button>
                <button className="dropdown-item" onClick={() => {
                  localStorage.removeItem('isLoggedIn');
                  navigate('/login');
                }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommonHeader;