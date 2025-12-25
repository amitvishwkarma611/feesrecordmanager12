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
      status: 'active',
      trialEndsAt: Timestamp.fromDate(trialEndDate),
      isPaid: false,
      paidAt: null,
      trialStartDate: now,
      amount: 0,
      createdAt: now,
      updatedAt: now,
      userId: uid, // Add userId for easier querying
      ...userData
    };

    const subscriptionRef = doc(db, `subscriptions/${uid}`);
    await setDoc(subscriptionRef, subscriptionData);

    console.log('Subscription created successfully for user:', uid);
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
    
    const updatedData = {
      plan: 'paid',
      status: 'active',
      isPaid: true,
      paidAt: serverTimestamp(),
      amount: amount,
      updatedAt: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Subscription updated successfully for user:', uid);
    
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

    // Check if user has paid access
    if (subscription.isPaid === true) {
      return true; // Paid users always have access
    }

    // Check if trial is still valid
    if (subscription.plan === 'trial') {
      const now = new Date();
      // Handle both Timestamp objects and regular Date objects
      let trialEndsAt;
      if (subscription.trialEndsAt && typeof subscription.trialEndsAt.toDate === 'function') {
        // Firestore Timestamp
        trialEndsAt = subscription.trialEndsAt.toDate();
      } else if (subscription.trialEndsAt instanceof Date) {
        // Regular Date object
        trialEndsAt = subscription.trialEndsAt;
      } else {
        // String or number, convert to Date
        trialEndsAt = new Date(subscription.trialEndsAt);
      }

      if (now <= trialEndsAt) {
        return true; // Still in trial period
      } else {
        // Trial expired, update status
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

    const updatedData = {
      plan: 'PRO_499_MONTHLY',
      status: 'active',
      isPaid: true,
      paidAt: serverTimestamp(),
      amount: 499,
      updatedAt: serverTimestamp()
    };

    await updateDoc(subscriptionRef, updatedData);

    console.log('Subscription upgraded to PRO successfully for user:', uid);
    
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