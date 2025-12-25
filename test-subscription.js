import { db } from './src/firebase/firebaseConfig.js';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

async function testSubscription() {
  try {
    console.log('Testing subscription creation...');
    
    // Create a test subscription
    const testUserId = 'test-user-' + Date.now();
    const subscriptionDoc = doc(db, 'subscriptions', testUserId);
    const now = Timestamp.now();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    const subscriptionData = {
      plan: 'TRIAL',
      status: 'active',
      trialStartDate: now,
      trialEndDate: Timestamp.fromDate(trialEndDate),
      amount: 0,
      createdAt: now,
      updatedAt: now,
      userId: testUserId
    };
    
    console.log('Creating test subscription:', subscriptionData);
    await setDoc(subscriptionDoc, subscriptionData);
    console.log('Subscription created successfully');
    
    // Verify the document was created
    const docSnap = await getDoc(subscriptionDoc);
    if (docSnap.exists()) {
      console.log('Verified subscription document exists:', docSnap.data());
    } else {
      console.error('Failed to verify subscription document creation');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testSubscription();