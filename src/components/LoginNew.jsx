import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import './Login.css';

const LoginNew = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const navigate = useNavigate();
  const emailRef = useRef();
  const passwordRef = useRef();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      emailRef.current?.focus();
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password');
      passwordRef.current?.focus();
      setLoading(false);
      return;
    }

    try {
      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.setItem('isLoggedIn', 'true');
        localStorage.removeItem('rememberMe');
      }
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please try again.';
      
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = 'Invalid email or password';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      emailRef.current?.focus();
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError('Password reset email sent. Please check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        default:
          errorMessage = 'Failed to send reset email. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>{isResetPassword ? 'Reset your password' : 'Sign in to your account'}</p>
        </div>
        
        <form onSubmit={isResetPassword ? handlePasswordReset : handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="Enter your email"
              required
              ref={emailRef}
            />
          </div>
          
          {!isResetPassword && (
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  ref={passwordRef}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '15px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}
          
          {!isResetPassword && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ 
                    marginRight: '8px',
                    width: '16px',
                    height: '16px'
                  }}
                />
                <label htmlFor="rememberMe" style={{ 
                  fontSize: '0.9rem', 
                  color: '#666',
                  cursor: 'pointer'
                }}>
                  Remember me
                </label>
              </div>
              
              <button 
                type="button" 
                className="switch-auth"
                onClick={() => setIsResetPassword(true)}
                style={{
                  fontSize: '0.9rem',
                  padding: '0',
                  margin: '0',
                  background: 'none',
                  border: 'none',
                  color: '#3498db',
                  cursor: 'pointer'
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
          
          {error && (
            <div className="error-message" style={{
              animation: 'fadeIn 0.3s ease'
            }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading || !email || (!isResetPassword && !password)}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></span>
                {isResetPassword ? 'Sending...' : 'Logging in...'}
              </span>
            ) : (
              isResetPassword ? 'Send Reset Email' : 'Log in securely'
            )}
          </button>
          
          {isResetPassword ? (
            <div className="auth-options">
              <button 
                type="button" 
                className="switch-auth" 
                onClick={() => {
                  setIsResetPassword(false);
                  setError('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="auth-options">
              <button 
                type="button" 
                className="switch-auth" 
                onClick={() => navigate('/signup')}
              >
                Create a new account
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginNew;