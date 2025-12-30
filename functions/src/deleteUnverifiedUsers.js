const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.deleteUnverifiedUsers = functions.pubsub
  .schedule('0 0 * * *') // Run daily at midnight
  .timeZone('Asia/Kolkata') // Set to IST timezone
  .onRun(async (context) => {
    try {
      console.log('Starting unverified user cleanup process...');
      
      // Calculate the date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get all users from Firebase Auth
      const listUsersResult = await admin.auth().listUsers();
      const usersToDelete = [];
      
      // Filter users who are unverified and created more than 7 days ago
      for (const user of listUsersResult.users) {
        const creationTime = new Date(user.metadata.creationTime);
        
        // Check if email is not verified and account was created more than 7 days ago
        if (!user.emailVerified && creationTime < sevenDaysAgo) {
          usersToDelete.push(user.uid);
          console.log(`User ${user.email} (${user.uid}) marked for deletion - unverified and older than 7 days`);
        }
      }
      
      if (usersToDelete.length === 0) {
        console.log('No users to delete');
        return { success: true, deletedCount: 0 };
      }
      
      // Delete users from Firebase Auth
      const authDeleteResults = await admin.auth().deleteUsers(usersToDelete);
      console.log(`Successfully deleted ${authDeleteResults.successCount} users from Firebase Auth`);
      
      if (authDeleteResults.failureCount > 0) {
        console.error(`Failed to delete ${authDeleteResults.failureCount} users from Firebase Auth`);
        console.error('Failed user IDs:', authDeleteResults.errors.map(error => error.index));
      }
      
      // Also delete user data from Firestore
      const batch = db.batch();
      let firestoreDeleteCount = 0;
      
      for (const userId of usersToDelete) {
        // Delete user profile document
        batch.delete(db.collection('userProfiles').doc(userId));
        
        // Delete user-specific data collections
        const userCollections = ['students', 'payments', 'expenditures', 'attendance', 'staff', 'feedback', 'supportQueries', 'staffAttendance'];
        
        for (const collection of userCollections) {
          const userCollectionRef = db.collection('users').doc(userId).collection(collection);
          const docs = await userCollectionRef.get();
          
          docs.forEach(doc => {
            batch.delete(userCollectionRef.doc(doc.id));
          });
        }
        
        // Delete user document
        batch.delete(db.collection('users').doc(userId));
        
        firestoreDeleteCount++;
      }
      
      await batch.commit();
      console.log(`Successfully deleted Firestore data for ${firestoreDeleteCount} users`);
      
      return {
        success: true,
        deletedCount: usersToDelete.length,
        details: {
          authDeletions: authDeleteResults.successCount,
          firestoreDeletions: firestoreDeleteCount
        }
      };
      
    } catch (error) {
      console.error('Error in deleteUnverifiedUsers function:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });