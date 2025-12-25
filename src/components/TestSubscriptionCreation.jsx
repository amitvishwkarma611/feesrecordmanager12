import React, { useEffect, useState } from 'react';
import { auth } from '../firebase/firebaseConfig';
import { createSubscription, getSubscription } from '../services/subscriptionService';

const TestSubscriptionCreation = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const testSubscription = async () => {
      if (!auth.currentUser) {
        setError('No user logged in');
        return;
      }

      setLoading(true);
      try {
        console.log('Testing subscription creation for user:', auth.currentUser.uid);
        
        // First try to get existing subscription
        const existingSubscription = await getSubscription(auth.currentUser.uid);
        console.log('Existing subscription:', existingSubscription);
        
        if (!existingSubscription) {
          // Create a new subscription
          console.log('Creating new subscription...');
          const newSubscription = await createSubscription(auth.currentUser.uid);
          console.log('New subscription created:', newSubscription);
          setResult(newSubscription);
        } else {
          setResult(existingSubscription);
        }
      } catch (err) {
        console.error('Error in test:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testSubscription();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Subscription Test</h2>
      {loading && <p>Testing subscription creation...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && (
        <div>
          <p style={{ color: 'green' }}>Success!</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestSubscriptionCreation;