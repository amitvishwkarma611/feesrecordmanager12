import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { createUserProfile } from '../services/firebaseService';
import { createSubscription } from '../services/subscriptionService';
import './Login.css';

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [firmName, setFirmName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();

  // Check password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Medium';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#ddd';
    if (passwordStrength <= 1) return '#e74c3c';
    if (passwordStrength <= 2) return '#f39c12';
    return '#2ecc71';
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      emailRef.current?.focus();
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      emailRef.current?.focus();
      setLoading(false);
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      emailRef.current?.focus();
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      passwordRef.current?.focus();
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      confirmPasswordRef.current?.focus();
      setLoading(false);
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: fullName.trim()
      });
      
      // Save user profile data to Firestore with required fields only
      const profileData = {
        uid: userCredential.user.uid,
        email: email.trim(),
        displayName: fullName.trim(),
        createdAt: new Date()
      };
      
      try {
        await createUserProfile(profileData);
        
        // Create subscription for the user
        await createSubscription(userCredential.user.uid, {
          email: email.trim(),
          displayName: fullName.trim()
        });
      } catch (profileError) {
        console.error('Error creating user profile or subscription:', profileError);
        // Even if profile creation fails, we still want to complete the signup process
        // The user profile can be created later
      }
      
      // Send verification email
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Even if email fails, we still want to complete the signup process
        // The user will be prompted to resend verification email
      }
      
      // DO NOT signOut() the user after sign up
      // Redirect to email verification page
      navigate('/verify-email');
    } catch (err) {
      console.error('Sign up error:', err);
      let errorMessage = 'Sign up failed. Please try again.';
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already in use. Please try logging in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Create Account</h1>
          <p>Join us today to manage your fees efficiently</p>
        </div>
        
        <form onSubmit={handleSignUp} className="login-form">
          <div className="input-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              ref={emailRef}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                minLength="8"
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
            
            {password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ 
                  height: '4px', 
                  backgroundColor: '#eee', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${(passwordStrength / 4) * 100}%`, 
                      backgroundColor: getPasswordStrengthColor(),
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '4px',
                  fontSize: '0.8rem',
                  color: '#666'
                }}>
                  <span>Password strength: {getPasswordStrengthLabel()}</span>
                </div>
              </div>
            )}
            
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#666', 
              marginTop: '4px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: password.length >= 8 ? '#2ecc71' : '#ddd',
                  marginRight: '6px'
                }}></span>
                8+ characters
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: /[A-Z]/.test(password) ? '#2ecc71' : '#ddd',
                  marginRight: '6px'
                }}></span>
                Uppercase letter
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: /[0-9]/.test(password) ? '#2ecc71' : '#ddd',
                  marginRight: '6px'
                }}></span>
                Number
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: /[^A-Za-z0-9]/.test(password) ? '#2ecc71' : '#ddd',
                  marginRight: '6px'
                }}></span>
                Special character
              </span>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                ref={confirmPasswordRef}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="firmName">Firm/Organization Name</label>
            <input
              type="text"
              id="firmName"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Enter your firm or organization name"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
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
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
          
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.9rem', 
            color: '#666',
            marginTop: '10px'
          }}>
            Secure sign up • No credit card required
          </div>
          
          <div className="auth-options">
            <button 
              type="button" 
              className="switch-auth" 
              onClick={() => navigate('/login')}
            >
              Already have an account? Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;