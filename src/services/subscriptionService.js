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
      plan: 'monthly',
      status: 'active',
      isPaid: false,
      trialStartDate: Timestamp.fromDate(now),
      trialEndDate: Timestamp.fromDate(trialEndDate),
      paidAt: null,
      validTill: null, // Will be set after first payment
      amount: 499,
      currency: 'INR',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      userId: uid, // Add userId for easier querying
      ...userData
    };

    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    await setDoc(subscriptionRef, subscriptionData);

    console.log('Monthly subscription created successfully for user:', uid);
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
    
    // Calculate validTill date: 30 days from now
    const validTill = new Date();
    validTill.setDate(validTill.getDate() + 30);
    
    const updatedData = {
      plan: 'monthly',
      status: 'active',
      isPaid: true,
      paidAt: serverTimestamp(),
      validTill: Timestamp.fromDate(validTill),
      amount: amount,
      currency: 'INR',
      updatedAt: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Monthly subscription updated successfully for user:', uid);
    console.log('Subscription valid till:', validTill);
    
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
    
    // Check if trial is still valid
    if (subscription.isPaid === false && subscription.status === 'active') {
      // Check trial period
      if (subscription.trialEndDate) {
        let trialEnd;
        if (subscription.trialEndDate && typeof subscription.trialEndDate.toDate === 'function') {
          // Firestore Timestamp
          trialEnd = subscription.trialEndDate.toDate();
        } else if (subscription.trialEndDate instanceof Date) {
          // Regular Date object
          trialEnd = subscription.trialEndDate;
        } else {
          // String or number, convert to Date
          trialEnd = new Date(subscription.trialEndDate);
        }

        if (now <= trialEnd) {
          return true; // Still in trial period
        }
      }
      
      // Trial expired, update status
      await updateDoc(doc(db, `subscriptions/${uid}`), {
        status: 'expired',
        updatedAt: Timestamp.now()
      });
      return false;
    }
    
    // Check if paid subscription is still valid
    if (subscription.isPaid === true && subscription.validTill) {
      let validTill;
      if (subscription.validTill && typeof subscription.validTill.toDate === 'function') {
        // Firestore Timestamp
        validTill = subscription.validTill.toDate();
      } else if (subscription.validTill instanceof Date) {
        // Regular Date object
        validTill = subscription.validTill;
      } else {
        // String or number, convert to Date
        validTill = new Date(subscription.validTill);
      }
      
      if (now <= validTill) {
        return true; // Still within validity period
      } else {
        // Subscription expired, update status
        await updateDoc(doc(db, `subscriptions/${uid}`), {
          status: 'expired',
          updatedAt: Timestamp.now()
        });
        return false;
      }
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
    
    // Calculate validTill date: 30 days from now
    const validTill = new Date();
    validTill.setDate(validTill.getDate() + 30);
    
    const updatedData = {
      plan: 'monthly',
      status: 'active',
      isPaid: true,
      paidAt: serverTimestamp(),
      validTill: Timestamp.fromDate(validTill),
      amount: 499,
      currency: 'INR',
      updatedAt: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Monthly subscription upgraded to PRO successfully for user:', uid);
    console.log('Subscription valid till:', validTill);
    
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
 * @param {any} trialEndDate - Trial end date (can be Timestamp, Date, or string)
 * @returns {number} - Number of days remaining in trial
 */
export const getTrialDaysRemaining = (trialEndDate) => {
  if (!trialEndDate) return 0;

  let endDate;
  if (trialEndDate && typeof trialEndDate.toDate === 'function') {
    // Firestore Timestamp
    endDate = trialEndDate.toDate();
  } else if (trialEndDate instanceof Date) {
    // Regular Date object
    endDate = trialEndDate;
  } else {
    // String or number, convert to Date
    endDate = new Date(trialEndDate);
  }

  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays); // Return at least 0
};

/**
 * Calculates remaining validity days for a paid subscription
 * @param {any} validTill - Valid till date (can be Timestamp, Date, or string)
 * @returns {number} - Number of days remaining in validity
 */
export const getValidityDaysRemaining = (validTill) => {
  if (!validTill) return 0;

  let endDate;
  if (validTill && typeof validTill.toDate === 'function') {
    // Firestore Timestamp
    endDate = validTill.toDate();
  } else if (validTill instanceof Date) {
    // Regular Date object
    endDate = validTill;
  } else {
    // String or number, convert to Date
    endDate = new Date(validTill);
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
  
  // User is a paid user if isPaid is true and within validity period
  if (subscription.isPaid === true && subscription.validTill) {
    const validTill = subscription.validTill.toDate();
    const now = new Date();
    return now <= validTill;
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
  
  // User is a trial user if:
  // - isPaid is false (not paid)
  // - status is active
  // - trial has not expired
  if (subscription.isPaid === false && subscription.status === 'active' && subscription.trialEndDate) {
    const trialEndDate = subscription.trialEndDate.toDate();
    const now = new Date();
    return now <= trialEndDate;
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
  
  // Trial is expired if:
  // - isPaid is false (not paid)
  // - status is active
  // - trial has expired
  if (subscription.isPaid === false && subscription.status === 'active' && subscription.trialEndDate) {
    const trialEndDate = subscription.trialEndDate.toDate();
    const now = new Date();
    return now > trialEndDate;
  }
  return false;
};