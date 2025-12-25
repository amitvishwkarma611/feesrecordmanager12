import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Creates a new subscription for a user
 * @param {string} uid - User ID
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} - The created subscription object
 */
export const createSubscription = async (uid, userData = {}) => {
  try {
    const now = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    const subscriptionData = {
      plan: 'trial',
      isPaid: false,
      status: 'active',
      trialStartDate: Timestamp.fromDate(now),
      trialEndsAt: Timestamp.fromDate(trialEndDate), // Use trialEndsAt as required
      createdAt: Timestamp.fromDate(now),
      userId: uid, // Add userId for easier querying
      ...userData
    };

    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    await setDoc(subscriptionRef, subscriptionData);

    console.log('Trial subscription created successfully for user:', uid);
    return subscriptionData;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

/**
 * Gets a user's subscription
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} - The subscription object or null if not found
 */
export const getSubscription = async (uid) => {
  try {
    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    const subscriptionDoc = await getDoc(subscriptionRef);

    if (subscriptionDoc.exists()) {
      return subscriptionDoc.data();
    } else {
      console.log('No subscription found for user:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
};

/**
 * Updates a user's subscription on successful payment
 * @param {string} uid - User ID
 * @param {number} amount - Payment amount
 * @returns {Promise<Object>} - Updated subscription object
 */
export const updateSubscriptionOnPaymentSuccess = async (uid, amount = 499) => {
  try {
    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    const now = new Date();
    
    // Calculate expiresAt date: 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const updatedData = {
      plan: 'monthly',
      isPaid: true,
      status: 'active',
      paidAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      lastUpdated: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Monthly subscription updated successfully for user:', uid);
    console.log('Subscription expires at:', expiresAt);
    
    // Return the updated subscription data
    return {
      ...updatedData,
      userId: uid
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

/**
 * Checks if a user has an active subscription
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} - True if user has active subscription
 */
export const hasActiveSubscription = async (uid) => {
  try {
    const subscription = await getSubscription(uid);

    if (!subscription) {
      console.log('No subscription found for user:', uid);
      return false;
    }

    const now = new Date();
    
    // Derive flags safely:
    const isPaid = subscription.isPaid === true;
    const isTrial = subscription.plan === "trial";
    
    // Check if trial has expired
    let trialExpired = false;
    if (subscription.trialEndsAt) {
      let trialEnd;
      if (subscription.trialEndsAt && typeof subscription.trialEndsAt.toDate === 'function') {
        // Firestore Timestamp
        trialEnd = subscription.trialEndsAt.toDate();
      } else if (subscription.trialEndsAt instanceof Date) {
        // Regular Date object
        trialEnd = subscription.trialEndsAt;
      } else {
        // String or number, convert to Date
        trialEnd = new Date(subscription.trialEndsAt);
      }
      
      trialExpired = now > trialEnd;
    }
    
    // hasActiveSubscription logic:
    // (isPaid && expiresAt > now) OR (isTrial && !trialExpired)
    if (isPaid && subscription.expiresAt) {
      let expiresAt;
      if (subscription.expiresAt && typeof subscription.expiresAt.toDate === 'function') {
        // Firestore Timestamp
        expiresAt = subscription.expiresAt.toDate();
      } else if (subscription.expiresAt instanceof Date) {
        // Regular Date object
        expiresAt = subscription.expiresAt;
      } else {
        // String or number, convert to Date
        expiresAt = new Date(subscription.expiresAt);
      }
      
      if (now <= expiresAt) {
        return true; // Still within paid validity period
      }
    }
    
    if (isTrial && !trialExpired) {
      return true; // Still in trial period
    }
    
    // If we reach here, subscription is not active
    // Update status if expired
    if ((isTrial && trialExpired) || (isPaid && subscription.expiresAt && now > new Date(subscription.expiresAt.toDate()))) {
      await updateDoc(doc(db, `subscriptions/${uid}`), {
        status: 'expired',
        lastUpdated: Timestamp.now()
      });
    }

    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Upgrades a user's subscription to PRO
 * @param {string} uid - User ID
 * @returns {Promise<Object>} - Updated subscription object
 */
export const upgradeToPro = async (uid) => {
  try {
    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    const now = new Date();
    
    // Calculate expiresAt date: 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const updatedData = {
      plan: 'monthly',
      isPaid: true,
      status: 'active',
      paidAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      lastUpdated: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Monthly subscription upgraded to PRO successfully for user:', uid);
    console.log('Subscription expires at:', expiresAt);
    
    return {
      ...updatedData,
      userId: uid
    };
  } catch (error) {
    console.error('Error upgrading subscription to PRO:', error);
    throw error;
  }
};

/**
 * Calculates remaining trial days for a subscription
 * @param {any} trialEndsAt - Trial end date (can be Timestamp, Date, or string)
 * @returns {number} - Number of days remaining in trial
 */
export const getTrialDaysRemaining = (trialEndsAt) => {
  if (!trialEndsAt) return 0;

  let endDate;
  if (trialEndsAt && typeof trialEndsAt.toDate === 'function') {
    // Firestore Timestamp
    endDate = trialEndsAt.toDate();
  } else if (trialEndsAt instanceof Date) {
    // Regular Date object
    endDate = trialEndsAt;
  } else {
    // String or number, convert to Date
    endDate = new Date(trialEndsAt);
  }

  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays); // Return at least 0
};

/**
 * Calculates remaining validity days for a paid subscription
 * @param {any} expiresAt - Expires at date (can be Timestamp, Date, or string)
 * @returns {number} - Number of days remaining in validity
 */
export const getValidityDaysRemaining = (expiresAt) => {
  if (!expiresAt) return 0;

  let endDate;
  if (expiresAt && typeof expiresAt.toDate === 'function') {
    // Firestore Timestamp
    endDate = expiresAt.toDate();
  } else if (expiresAt instanceof Date) {
    // Regular Date object
    endDate = expiresAt;
  } else {
    // String or number, convert to Date
    endDate = new Date(expiresAt);
  }

  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays); // Return at least 0
};

/**
 * Checks if user is a paid user
 * @param {Object} subscription - Subscription object
 * @returns {boolean} - True if user is a paid user
 */
export const isPaidUser = (subscription) => {
  if (!subscription) return false;
  
  // isPaid = subscription.isPaid === true
  const isPaid = subscription.isPaid === true;
  
  // Check if paid subscription is still valid
  if (isPaid && subscription.expiresAt) {
    const expiresAt = subscription.expiresAt.toDate();
    const now = new Date();
    return now <= expiresAt;
  }
  return false;
};

/**
 * Checks if user is a trial user (trial active and not paid)
 * @param {Object} subscription - Subscription object
 * @returns {boolean} - True if user is a trial user
 */
export const isTrialUser = (subscription) => {
  if (!subscription) return false;
  
  // isTrial = subscription.plan === "trial"
  const isTrial = subscription.plan === "trial";
  
  // Check if trial has not expired
  if (isTrial && subscription.trialEndsAt) {
    const trialEndAt = subscription.trialEndsAt.toDate();
    const now = new Date();
    const trialExpired = now > trialEndAt;
    
    return !trialExpired;
  }
  return false;
};

/**
 * Checks if user's trial has expired
 * @param {Object} subscription - Subscription object
 * @returns {boolean} - True if user's trial has expired
 */
export const isTrialExpired = (subscription) => {
  if (!subscription) return false;
  
  // isTrial = subscription.plan === "trial"
  const isTrial = subscription.plan === "trial";
  
  // Check if trial has expired
  if (isTrial && subscription.trialEndsAt) {
    const trialEndAt = subscription.trialEndsAt.toDate();
    const now = new Date();
    
    return now > trialEndAt;
  }
  return false;
};