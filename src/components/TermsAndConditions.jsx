import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Using the same styling as login

const TermsAndConditions = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '800px', padding: '40px', textAlign: 'left' }}>
        <div className="login-header" style={{ textAlign: 'left', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Terms and Conditions</h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Please read these terms carefully before using our service</p>
        </div>
        
        <div className="terms-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>1. Introduction</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              Welcome to our fees management platform. These terms and conditions outline the rules and regulations for the use of our service.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>2. User Responsibilities</h2>
            <ul style={{ color: '#34495e', lineHeight: '1.6', paddingLeft: '20px', marginBottom: '10px' }}>
              <li style={{ marginBottom: '8px' }}>Maintain the accuracy of your account information</li>
              <li style={{ marginBottom: '8px' }}>Keep your login credentials secure</li>
              <li style={{ marginBottom: '8px' }}>Report any unauthorized access to your account</li>
              <li style={{ marginBottom: '8px' }}>Use the service in compliance with applicable laws</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>3. Data Privacy</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              We are committed to protecting your privacy. All personal and financial data is stored securely using industry-standard encryption.
            </p>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              Your data is used solely for the purpose of providing our fees management services and will not be shared with third parties without your consent.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>4. Service Availability</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              We strive to maintain service availability, but cannot guarantee 100% uptime. Scheduled maintenance will be communicated in advance when possible.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>5. Subscription and Payment</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              Our service operates on a subscription model. You will be charged according to the plan you select. All charges are non-refundable unless otherwise stated.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>6. Limitation of Liability</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              Our liability is limited to the extent permitted by law. We are not responsible for any indirect, incidental, or consequential damages arising from your use of our service.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>7. Changes to Terms</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#2c3e50', fontSize: '1.3rem', marginBottom: '10px' }}>8. Contact Information</h2>
            <p style={{ color: '#34495e', lineHeight: '1.6', marginBottom: '10px' }}>
              If you have any questions about these terms, please contact us at support@feesmanager.com
            </p>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={handleBack}
            className="switch-auth"
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;