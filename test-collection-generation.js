// Test script to verify Firebase collection generation
import { auth, db } from './src/firebase/firebaseConfig.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Test data
const testStudent = {
  name: 'Test Student',
  email: 'test@example.com',
  phone: '1234567890',
  studentId: 'TEST001',
  totalFees: 1000,
  feesPaid: 500,
  feesDue: 500,
  feesStructure: 'Annual'
};

const testUserCredentials = {
  email: 'testuser@example.com',
  password: 'testpassword123'
};

async function testCollectionGeneration() {
  console.log('=== Firebase Collection Generation Test ===');
  
  try {
    // Create a test user
    console.log('Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      testUserCredentials.email, 
      testUserCredentials.password
    );
    console.log('User created successfully:', userCredential.user.uid);
    
    // Sign in the user
    console.log('Signing in test user...');
    await signOut(auth); // Sign out first if needed
    const signInCredential = await signInWithEmailAndPassword(
      auth,
      testUserCredentials.email,
      testUserCredentials.password
    );
    console.log('User signed in successfully:', signInCredential.user.uid);
    
    // Test adding a student with ownerId
    console.log('Adding test student with ownerId...');
    const studentWithOwner = {
      ...testStudent,
      ownerId: signInCredential.user.uid
    };
    
    const studentsCollection = collection(db, 'students');
    const docRef = await addDoc(studentsCollection, studentWithOwner);
    console.log('Student added successfully with ID:', docRef.id);
    
    // Test retrieving students
    console.log('Retrieving students...');
    const querySnapshot = await getDocs(studentsCollection);
    console.log('Total students found:', querySnapshot.size);
    
    // Clean up - delete the test student
    console.log('Cleaning up test data...');
    await deleteDoc(doc(db, 'students', docRef.id));
    console.log('Test student deleted successfully');
    
    // Clean up - delete the test user
    console.log('Deleting test user...');
    // Note: Firebase doesn't provide a direct way to delete users from client SDK
    // This would typically be done through admin SDK or Firebase Console
    console.log('Test user cleanup would be done through Firebase Console or Admin SDK');
    
    // Sign out
    await signOut(auth);
    console.log('Signed out successfully');
    
    console.log('=== Test Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Try to clean up if partially completed
    try {
      await signOut(auth);
      console.log('Signed out after error');
    } catch (signOutError) {
      console.log('Could not sign out after error:', signOutError);
    }
    
    return false;
  }
}

// Run the test
testCollectionGeneration()
  .then(success => {
    if (success) {
      console.log('All tests passed!');
    } else {
      console.log('Some tests failed.');
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });