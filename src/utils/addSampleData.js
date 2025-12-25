import { addStudent, addPayment } from '../services/firebaseService.js';
import { isAuthenticated, getCurrentUserUID } from '../utils/auth.js';

export const addSampleData = async () => {
  try {
    console.log('Checking authentication status...');
    const authenticated = isAuthenticated();
    console.log('Is authenticated:', authenticated);
    
    if (!authenticated) {
      console.log('User not authenticated. Please sign in first.');
      return { success: false, message: 'User not authenticated. Please sign in first.' };
    }
    
    console.log('Current user UID:', getCurrentUserUID());
    
    // Add sample students
    console.log('Adding sample students...');
    const student1 = await addStudent({
      name: 'John Doe',
      class: '10th Grade',
      totalFees: 5000,
      feesPaid: 3000,
      feesDue: 2000,
      feesStructure: 'Annual',
      contact: '+1234567890',
      email: 'john.doe@example.com',
      address: '123 Main St, City',
      fatherName: 'Robert Doe',
      motherName: 'Jane Doe',
      status: 'Active'
    });
    
    const student2 = await addStudent({
      name: 'Jane Smith',
      class: '9th Grade',
      totalFees: 4500,
      feesPaid: 4500,
      feesDue: 0,
      feesStructure: 'Annual',
      contact: '+1234567891',
      email: 'jane.smith@example.com',
      address: '456 Oak Ave, City',
      fatherName: 'Michael Smith',
      motherName: 'Sarah Smith',
      status: 'Active'
    });
    
    console.log('Added students:', student1, student2);
    
    // Add sample payments
    console.log('Adding sample payments...');
    const payment1 = await addPayment({
      studentId: student1.id,
      studentName: 'John Doe',
      studentClass: '10th Grade',
      amount: 1000,
      dueDate: '2025-12-31',
      status: 'paid',
      description: 'First installment',
      createdAt: new Date()
    });
    
    const payment2 = await addPayment({
      studentId: student1.id,
      studentName: 'John Doe',
      studentClass: '10th Grade',
      amount: 1000,
      dueDate: '2025-12-31',
      status: 'pending',
      description: 'Second installment',
      createdAt: new Date()
    });
    
    const payment3 = await addPayment({
      studentId: student2.id,
      studentName: 'Jane Smith',
      studentClass: '9th Grade',
      amount: 1500,
      dueDate: '2025-11-30',
      status: 'paid',
      description: 'Full payment',
      createdAt: new Date()
    });
    
    console.log('Added payments:', payment1, payment2, payment3);
    
    console.log('Sample data added successfully!');
    return { success: true, message: 'Sample data added successfully!' };
  } catch (error) {
    console.error('Error adding sample data:', error);
    return { success: false, message: 'Error adding sample data: ' + error.message };
  }
};

export default addSampleData;