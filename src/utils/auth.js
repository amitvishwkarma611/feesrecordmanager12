import { auth } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Global variable to store the current user's UID
let currentUserUID = null;

// Helper function to get the current user's UID
export const getCurrentUserUID = () => {
  if (!currentUserUID) {
    throw new Error('User not authenticated. Please sign in first.');
  }
  return currentUserUID;
};

// Helper function to create user-specific paths
export const userPath = (collectionName) => {
  const uid = getCurrentUserUID();
  return `users/${uid}/${collectionName}`;
};

// Function to auto-create user collections on first login
const autoCreateUserCollections = async () => {
  // This will be implemented in the firebaseService
  console.log('Auto-creating user collections for UID:', currentUserUID);
};

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserUID = user.uid;
    console.log('User authenticated with UID:', currentUserUID);
    
    // Auto-create user collections on first login
    autoCreateUserCollections();
  } else {
    currentUserUID = null;
    console.log('No user is signed in');
  }
});

// Function to check if user is authenticated
export const isAuthenticated = () => {
  // First check the global variable
  if (currentUserUID) {
    return true;
  }
  
  // Then check localStorage as fallback
  return localStorage.getItem('isLoggedIn') === 'true';
};

export default {
  getCurrentUserUID,
  userPath,
  isAuthenticated
};