import { getStudents, getPayments } from './src/services/firebaseService';
import { isAuthenticated } from './src/utils/auth';

const testData = async () => {
  try {
    console.log('Checking authentication status...');
    console.log('Is authenticated:', isAuthenticated());
    
    if (!isAuthenticated()) {
      console.log('User not authenticated. Please sign in first.');
      return;
    }
    
    console.log('Fetching students...');
    const students = await getStudents();
    console.log('Students:', students);
    
    console.log('Fetching payments...');
    const payments = await getPayments();
    console.log('Payments:', payments);
    
    console.log('Test completed.');
  } catch (error) {
    console.error('Error during test:', error);
  }
};

testData();