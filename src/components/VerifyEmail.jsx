import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { sendEmailVerification, signOut } from 'firebase/auth';
import './Login.css';

const VerifyEmail = () => {
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(30); // 30 seconds countdown
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and email is verified
    const checkVerificationStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      
      if (user.emailVerified) {
        navigate('/dashboard');
        return;
      }
    };

    checkVerificationStatus();

    // Set up countdown timer for resend button
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleResendVerification = async () => {
    if (!canResend || isVerifying) return;

    setIsVerifying(true);
    setMessage('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setMessage('No user is currently logged in.');
        return;
      }

      await sendEmailVerification(user);
      setMessage('Verification email sent successfully! Please check your inbox (and spam folder).');
      setCanResend(false);
      setCountdown(30);
      
      // Restart countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error sending verification email:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Email Verification Required</h2>
          <p className="login-subtitle">Please verify your email address to continue</p>
        </div>

        <div className="verification-info">
          <div className="verification-icon">📧</div>
          <h3>Verify Your Email</h3>
          <div className="email-display">
            <strong>{auth.currentUser?.email}</strong>
          </div>
          <p>Please check your inbox and click the verification link.</p>
        </div>

        <div className="verification-actions">
          <button 
            className={`btn-primary ${!canResend || isVerifying ? 'btn-disabled' : ''}`}
            onClick={handleResendVerification}
            disabled={!canResend || isVerifying}
          >
            {isVerifying ? (
              <>
                <span className="loading-spinner"></span> Sending...
              </>
            ) : canResend ? (
              'Resend Verification Email'
            ) : (
              `Resend in ${countdown}s`
            )}
          </button>

          <button 
            className="btn-secondary"
            onClick={handleSignOut}
          >
            <span>🚪</span> Sign Out
          </button>

          <button 
            className="btn-tertiary"
            onClick={handleRefresh}
          >
            <span>🔄</span> I've Verified - Refresh
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="verification-help">
          <h4>Didn't receive it?</h4>
          <ul>
            <li>📧 Check spam folder</li>
            <li>📋 Add to contacts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;