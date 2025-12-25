// Test Firebase connectivity
import { db } from './firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

console.log('Testing Firebase connectivity...');

// Test if Firebase is properly initialized
if (db) {
  console.log('Firebase initialized successfully');
  
  // Try to access the students collection
  try {
    const studentsCollection = collection(db, 'students');
    console.log('Students collection reference created');
    
    // Try to fetch data (this will fail if permissions are not set correctly)
    getDocs(studentsCollection)
      .then(snapshot => {
        console.log('Successfully connected to Firestore');
        console.log('Number of student documents:', snapshot.size);
      })
      .catch(error => {
        console.log('Error fetching data (might be permission issue):', error.message);
      });
  } catch (error) {
    console.error('Error creating collection reference:', error.message);
  }
} else {
  console.error('Firebase not initialized');
}