import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/firebaseConfig';
import { getSubscription, createSubscription } from '../services/subscriptionService';
import { handlePaymentClick } from '../utils/paymentService';

const TestSubscription = () => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateSubscription = async () => {
    if (!user) {
      setResult('No user logged in');
      return;
    }

    try {
      const sub = await createSubscription(user.uid);
      setSubscription(sub);
      setResult('Subscription created successfully');
    } catch (error) {
      console.error('Error creating subscription:', error);
      setResult('Error: ' + error.message);
    }
  };

  const handleGetSubscription = async () => {
    if (!user) {
      setResult('No user logged in');
      return;
    }

    try {
      const sub = await getSubscription(user.uid);
      setSubscription(sub);
      setResult(sub ? 'Subscription retrieved successfully' : 'No subscription found');
    } catch (error) {
      console.error('Error getting subscription:', error);
      setResult('Error: ' + error.message);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      setResult('No user logged in');
      return;
    }

    setLoading(true);
    try {
      // Open Razorpay checkout immediately as requested
      await handlePaymentClick(user.uid);
      setResult('Payment successful! Subscription upgraded successfully');
      
      // Refresh subscription data
      const sub = await getSubscription(user.uid);
      setSubscription(sub);
    } catch (error) {
      console.error('Error processing payment:', error);
      if (error.message === 'Payment cancelled by user') {
        setResult('Payment was cancelled. You can try again when ready.');
      } else {
        setResult('Error processing payment: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Subscription Test Component</h1>
      
      {user ? (
        <div>
          <p>Signed in as: {user.email}</p>
          <p>User ID: {user.uid}</p>
          
          <div style={{ margin: '20px 0' }}>
            <button 
              onClick={handleCreateSubscription} 
              disabled={loading}
              style={{ margin: '5px', padding: '10px 15px' }}
            >
              Create Subscription
            </button>
            
            <button 
              onClick={handleGetSubscription} 
              disabled={loading}
              style={{ margin: '5px', padding: '10px 15px' }}
            >
              Get Subscription
            </button>
            
            <button 
              onClick={handlePayment} 
              disabled={loading}
              style={{ margin: '5px', padding: '10px 15px' }}
            >
              {loading ? 'Processing Payment...' : 'Process Payment'}
            </button>
          </div>
        </div>
      ) : (
        <p>No user logged in</p>
      )}

      {subscription && (
        <div style={{ margin: '20px 0', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Current Subscription:</h3>
          <pre>{JSON.stringify(subscription, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ 
          margin: '10px 0', 
          padding: '10px', 
          background: result.includes('Error') ? '#ffebee' : '#e8f5e8', 
          border: result.includes('Error') ? '1px solid #f44336' : '1px solid #4caf50',
          borderRadius: '4px'
        }}>
          <strong>Result:</strong> {result}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>How to Test:</h3>
        <ol>
          <li>Make sure you're logged in</li>
          <li>Click "Create Subscription" to create a trial subscription</li>
          <li>Click "Process Payment" to simulate a payment and upgrade to PRO</li>
          <li>Click "Get Subscription" to check current subscription status</li>
        </ol>
      </div>
    </div>
  );
};

export default TestSubscription;