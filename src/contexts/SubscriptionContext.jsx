import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase/firebaseConfig';
import { hasActiveSubscription, getSubscription, createSubscription, isPaidUser, isTrialUser, isTrialExpired } from '../services/subscriptionService';

const SubscriptionContext = createContext();

// Track subscription creation to prevent duplicates
const subscriptionCreationInProgress = new Set();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  console.log('SubscriptionProvider initialized');
  const [subscription, setSubscription] = useState(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;
      
    if (auth) {
      console.log('Setting up auth state listener');
      unsubscribe = auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed, user:', user?.uid);
        if (user) {
          try {
            console.log('Subscription context: Checking subscription for user:', user.uid);
            setLoading(true);
            setError(null);
              
            // Get subscription data
            let subData = await getSubscription(user.uid);
            console.log('Subscription context: Got subscription data:', subData);
              
            // If no subscription exists, create one immediately
            if (!subData) {
              console.log('No subscription found, creating new one for user:', user.uid);
              // Prevent duplicate subscription creation
              if (subscriptionCreationInProgress.has(user.uid)) {
                console.log('Subscription creation already in progress for user:', user.uid);
                // Wait a bit and try again
                await new Promise(resolve => setTimeout(resolve, 100));
                return;
              }
                
              subscriptionCreationInProgress.add(user.uid);
              try {
                console.log('Creating subscription for user:', user.uid);
                subData = await createSubscription(user.uid);
                console.log('Subscription created for user:', user.uid, subData);
              } catch (creationError) {
                console.error('Error creating subscription for user:', user.uid, creationError);
                console.error('Error details:', creationError.message, creationError.stack);
                throw creationError;
              } finally {
                subscriptionCreationInProgress.delete(user.uid);
              }
            }
              
            setSubscription(subData);
              
            // Compute subscription status booleans
            const paidUser = isPaidUser(subData);
            const trialUser = isTrialUser(subData);
            const trialExpired = isTrialExpired(subData);
            
            console.log('Subscription context: Paid user:', paidUser);
            console.log('Subscription context: Trial user:', trialUser);
            console.log('Subscription context: Trial expired:', trialExpired);
            console.log('Subscription context: Subscription data:', subData);
            
            setHasActiveSub(paidUser || trialUser);
          } catch (err) {
            console.error('Error fetching/creating subscription for user:', user?.uid, err);
            console.error('Error details:', err.message, err.stack);
            setError(err.message);
            setHasActiveSub(false);
            setSubscription(null);
          } finally {
            console.log('Subscription context: Finished loading for user:', user?.uid);
            setLoading(false);
          }
        } else {
          // No user, reset state
          setSubscription(null);
          setHasActiveSub(false);
          setLoading(false);
        }
      });
    }
  
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let subData = await getSubscription(auth.currentUser.uid);
      
      // If no subscription exists, create one immediately
      if (!subData) {
        // Prevent duplicate subscription creation
        if (subscriptionCreationInProgress.has(auth.currentUser.uid)) {
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 100));
          return;
        }
        
        subscriptionCreationInProgress.add(auth.currentUser.uid);
        try {
          subData = await createSubscription(auth.currentUser.uid);
        } finally {
          subscriptionCreationInProgress.delete(auth.currentUser.uid);
        }
      }
      
      setSubscription(subData);
      
      const paidUser = isPaidUser(subData);
      const trialUser = isTrialUser(subData);
      const trialExpired = isTrialExpired(subData);
      
      console.log('Refresh subscription: Paid user:', paidUser);
      console.log('Refresh subscription: Trial user:', trialUser);
      console.log('Refresh subscription: Trial expired:', trialExpired);
      
      setHasActiveSub(paidUser || trialUser);
    } catch (err) {
      console.error('Error refreshing/creating subscription:', err);
      setError(err.message);
      setHasActiveSub(false);
    } finally {
      setLoading(false);
    }
  }, [auth.currentUser]);

    // Compute subscription status booleans for the context
  const paidUser = isPaidUser(subscription);
  const trialUser = isTrialUser(subscription);
  const trialExpired = isTrialExpired(subscription);

  const value = {
    subscription,
    hasActiveSub,
    loading,
    error,
    refreshSubscription,
    isPaidUser: paidUser,
    isTrialUser: trialUser,
    isTrialExpired: trialExpired
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;