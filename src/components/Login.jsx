import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut,
  sendEmailVerification,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { createUserProfile } from '../services/firebaseService';
import { hasActiveSubscription, getSubscription, createSubscription } from '../services/subscriptionService';
import SkeletonLoader from './common/SkeletonLoader';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(''); // For phone number during signup
  const [firmName, setFirmName] = useState(''); // For firm name during signup
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown in seconds
  const [resendTimer, setResendTimer] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for signup success message in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('signup') === 'verification') {
      // Show success message for account creation and verification email sent
      setSuccessMessage('Account created. Verification email sent. Please check your inbox.');
      setError('');
      // Clear the signup param from URL
      navigate('/login', { replace: true });
    } else if (params.get('signup') === 'success') {
      setSuccessMessage('Account created successfully. Please sign in to continue.');
      // Clear the signup param from URL
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  // Handle resend cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // If this is a new user, create a profile
      if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
        const profileData = {
          email: result.user.email,
          phone: result.user.phoneNumber || '',
          firmName: firmName || '',
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          createdAt: new Date(),
          uid: result.user.uid
        };
        
        try {
          await createUserProfile(profileData);
          
          // Create subscription for the user
          await createSubscription(result.user.uid, {
            email: result.user.email,
            displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User'
          });
        } catch (profileError) {
          console.error('Error creating user profile or subscription:', profileError);
        }
      } else {
        // For existing users, check if they have a subscription
        try {
          const subscription = await getSubscription(result.user.uid);
          if (!subscription) {
            // Create a new trial subscription
            await createSubscription(result.user.uid);
          }
          
          // Check if subscription is active
          const activeSubscription = await hasActiveSubscription(result.user.uid);
          if (!activeSubscription) {
            // Redirect to subscribe page if subscription is not active
            navigate('/subscribe');
            return;
          }
        } catch (subscriptionError) {
          console.error('Error checking subscription:', subscriptionError);
          // Continue with login even if subscription check fails
        }
      }
      
      // Save login status to localStorage
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/dashboard'); // Navigate directly to dashboard since splash screen is disabled
    } catch (err) {
      console.error('Google authentication error:', err);
      let errorMessage = 'Google authentication failed. Please try again.';
      
      switch (err.code) {
        case 'auth/popup-blocked':
          errorMessage = 'Popup blocked by browser. Please allow popups and try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Popup closed by user.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Account exists with different credential. Please sign in using your email and password.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0) return; // Prevent spamming
    
    setLoading(true);
    setError('');
    setSuccessMessage(''); // Clear any success messages
    
    try {
      // Only allow resending if user is already logged in
      if (!auth.currentUser) {
        // Silently disable button instead of showing error
        setLoading(false);
        return;
      }
      
      // Check if email is already verified
      if (auth.currentUser.emailVerified) {
        setError('Email is already verified. Please sign in normally.');
        setLoading(false);
        return;
      }
      
      // Attempt to send verification email
      await sendEmailVerification(auth.currentUser);
      
      // Set cooldown (30 seconds as per requirements)
      setResendCooldown(30);
      
      // Show toast-like message
      setSuccessMessage('Verification email resent. Check your inbox.');
      
      // Do NOT logout user after resending verification email
      // User should remain logged in to check their email
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error resending verification email:', err);
      let errorMessage = 'Failed to resend verification email. Please try again.';
      
      switch (err.code) {
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isResetPassword) {
        // Handle password reset
        await sendPasswordResetEmail(auth, email);
        setError('Password reset email sent. Please check your inbox.');
        setIsResetPassword(false);
      } else if (isSignUp) {
        // Handle sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
        // Update user profile with display name
        await updateProfile(userCredential.user, {
          displayName: firmName || email.split('@')[0]
        });
      
        // Save user profile data to Firestore
        const profileData = {
          email: email,
          phone: phone,
          firmName: firmName,
          displayName: firmName || email.split('@')[0],
          createdAt: new Date(),
          uid: userCredential.user.uid
        };
      
        try {
          await createUserProfile(profileData);
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      
        // Immediately sign out the user after successful sign up
        await signOut(auth);
        // Clear any local auth state
        localStorage.removeItem('isLoggedIn');
        // Show success message and switch to login view
        setSuccessMessage('Account created successfully. Please sign in to continue.');
        setIsSignUp(false);
        setError('');
      } else {
        // Handle login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        console.log('Login: Checking email verification for user:', userCredential.user.email, userCredential.user.emailVerified);
        if (!userCredential.user.emailVerified) {
          // Redirect to email verification page
          navigate('/verify-email');
          return;
        }
        
        // Check if user has a subscription, create one if not
        try {
          console.log('Login: Checking subscription for user:', userCredential.user.uid);
          const subscription = await getSubscription(userCredential.user.uid);
          console.log('Login: Got subscription data:', subscription);
          if (!subscription) {
            // Create a new trial subscription
            console.log('Login: No subscription found, creating new one for user:', userCredential.user.uid);
            await createSubscription(userCredential.user.uid);
          } else if (subscription.plan === 'trial') {
            // For trial users, redirect to free trial continue page
            console.log('Login: User has trial subscription, redirecting to free trial page');
            navigate('/free-trial-continue');
            return;
          } else {
            // Check if subscription is active for non-trial users
            const activeSubscription = await hasActiveSubscription(userCredential.user.uid);
            console.log('Login: Has active subscription:', activeSubscription);
            if (!activeSubscription) {
              // Redirect to subscribe page if subscription is not active
              console.log('Login: No active subscription, redirecting to subscribe page');
              navigate('/subscribe');
              return;
            }
          }
        } catch (subscriptionError) {
          console.error('Error checking subscription:', subscriptionError);
          // Continue with login even if subscription check fails
        }
        
        // Fetch Firestore document ONLY by UID
        // In a real implementation, you might want to fetch user data here
        // For now, we'll just allow the login to proceed
        
        // Save login status to localStorage
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/dashboard'); // Navigate directly to dashboard since splash screen is disabled
      }
    } catch (err) {
      console.error('Authentication error:', err);
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
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
          errorMessage = err.message || errorMessage;
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
          <h1>🔒 {isResetPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Access Required'}</h1>
          <p>{isResetPassword ? 'Enter your email to reset your password' : isSignUp ? 'Create a new account' : 'Please sign in to continue'}</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Reset all states when email changes to ensure clean UI
                if (showResendButton) {
                  setShowResendButton(false);
                }
                if (error) {
                  setError('');
                }
                if (successMessage) {
                  setSuccessMessage('');
                }
              }}
              placeholder="Enter your email"
              required
            />
          </div>
          
          {!isResetPassword && (
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                minLength="6"
                required={!isResetPassword}
              />
            </div>
          )}
          
          {isSignUp && !isResetPassword && (
            <>
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
            </>
          )}
          
          {successMessage && <div className="success-message">{successMessage}</div>}
          {(error || showResendButton) && (
                      <div className={error ? "error-message" : "info-message"}>
                        {error || 'Please verify your email before signing in.'}
                        {showResendButton && (
                          <div style={{ marginTop: '10px' }}>
                            <button 
                              type="button"
                              className="resend-button"
                              onClick={handleResendVerificationEmail}
                              disabled={loading || resendCooldown > 0}
                              style={{
                                background: 'none',
                                border: '1px solid #3498db',
                                color: '#3498db',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                marginTop: '5px',
                                opacity: resendCooldown > 0 ? 0.6 : 1
                              }}
                            >
                              {resendCooldown > 0 
                                ? `Resend available in ${resendCooldown}s` 
                                : 'Resend Verification Email'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
          
          {showResendButton ? (
            <div className="login-button-disabled" style={{
              backgroundColor: '#f5f5f5',
              color: '#999',
              border: '1px solid #ddd',
              padding: '12px',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '1rem',
              cursor: 'not-allowed'
            }}>
              Verify email to enable sign in
            </div>
          ) : (
            <button 
              type="submit" 
              className="login-button"
              disabled={loading || !email || (!isResetPassword && !password)}
            >
              {loading ? 'Processing...' : 
               isResetPassword ? 'Send Reset Email' : 
               isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          )}
          
          {/* Google Login Button */}
          {!isResetPassword && (
            <button 
              type="button"
              className="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">G</span>
              Sign in with Google
            </button>
          )}
          
          <div className="auth-options">
            {isResetPassword ? (
              <button 
                type="button" 
                className="switch-auth" 
                onClick={() => setIsResetPassword(false)}
              >
                Back to Sign In
              </button>
            ) : isSignUp ? (
              <button 
                type="button" 
                className="switch-auth" 
                onClick={() => setIsSignUp(false)}
              >
                Already have an account? Sign In
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="switch-auth" 
                  onClick={() => setIsSignUp(true)}
                >
                  Don't have an account? Sign Up
                </button>
                <button 
                  type="button" 
                  className="switch-auth" 
                  onClick={() => setIsResetPassword(true)}
                >
                  Forgot Password?
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;