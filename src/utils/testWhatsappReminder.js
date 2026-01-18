import whatsappReminder from './whatsappReminder';

// Test function to verify the updated overdue calculation logic
function testOverdueCalculation() {
  console.log('Testing WhatsApp Reminder Logic with Admission Date...\n');

  // Test case 1: New student admitted today (should NOT be overdue)
  const newStudent = {
    name: 'Test Student 1',
    totalFees: '10000',
    feesPaid: '0',
    feesCollectionFrequency: 'Monthly',
    admissionDate: new Date().toISOString().split('T')[0], // Today's date
  };

  console.log('Test Case 1: New student admitted today');
  console.log('Expected: NOT overdue (admission date is today)');
  console.log('Result:', whatsappReminder.isOverdue(newStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 2: Student admitted 2 months ago, monthly payments, no payments made (should be overdue)
  const oldStudent = {
    name: 'Test Student 2',
    totalFees: '10000',
    feesPaid: '0',
    feesCollectionFrequency: 'Monthly',
    admissionDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months ago
  };

  console.log('Test Case 2: Student admitted 2 months ago, monthly payments, no payments made');
  console.log('Expected: OVERDUE (should have 2 installments due)');
  console.log('Result:', whatsappReminder.isOverdue(oldStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 3: Student admitted 1.5 months ago, monthly payments, no payments made (should be overdue)
  const midStudent = {
    name: 'Test Student 3',
    totalFees: '10000',
    feesPaid: '0',
    feesCollectionFrequency: 'Monthly',
    admissionDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days ago
  };

  console.log('Test Case 3: Student admitted 1.5 months ago, monthly payments, no payments made');
  console.log('Expected: OVERDUE (should have 1 installment due after first full month)');
  console.log('Result:', whatsappReminder.isOverdue(midStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 4: Student admitted 1 month ago tomorrow, monthly payments, no payments made (should NOT be overdue)
  // This simulates a student who will cross the 1-month threshold tomorrow
  const almostDueStudent = {
    name: 'Test Student 4',
    totalFees: '10000',
    feesPaid: '0',
    feesCollectionFrequency: 'Monthly',
    admissionDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 29 days ago
  };

  console.log('Test Case 4: Student admitted 29 days ago, monthly payments, no payments made');
  console.log('Expected: NOT OVERDUE (first full month not completed yet)');
  console.log('Result:', whatsappReminder.isOverdue(almostDueStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 5: Student with custom date that has passed (should be overdue)
  const customDateStudent = {
    name: 'Test Student 5',
    totalFees: '5000',
    feesPaid: '0',
    feesCollectionFrequency: 'Custom Date',
    customDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    admissionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
  };

  console.log('Test Case 5: Student with custom date that has passed');
  console.log('Expected: OVERDUE (custom due date was 5 days ago)');
  console.log('Result:', whatsappReminder.isOverdue(customDateStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 6: Student with custom date that has not passed yet (should NOT be overdue)
  const futureCustomDateStudent = {
    name: 'Test Student 6',
    totalFees: '5000',
    feesPaid: '0',
    feesCollectionFrequency: 'Custom Date',
    customDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
    admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
  };

  console.log('Test Case 6: Student with custom date that has not passed yet');
  console.log('Expected: NOT OVERDUE (custom due date is 5 days from now)');
  console.log('Result:', whatsappReminder.isOverdue(futureCustomDateStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  // Test case 7: Student with all fees paid (should NOT be overdue regardless of schedule)
  const paidStudent = {
    name: 'Test Student 7',
    totalFees: '10000',
    feesPaid: '10000',
    feesCollectionFrequency: 'Monthly',
    admissionDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months ago
  };

  console.log('Test Case 7: Student with all fees paid');
  console.log('Expected: NOT OVERDUE (all fees paid)');
  console.log('Result:', whatsappReminder.isOverdue(paidStudent) ? 'OVERDUE' : 'NOT OVERDUE');
  console.log('');

  console.log('All tests completed!');
}

// Run the test
testOverdueCalculation();

export default testOverdueCalculation;