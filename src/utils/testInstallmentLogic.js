import whatsappReminder from './whatsappReminder';

console.log('Testing new installment-based WhatsApp reminder logic...\n');

// Test data for different frequencies
const testStudents = [
  {
    name: 'John Doe',
    class: '10th',
    fatherName: 'Robert Doe',
    totalFees: 50000,
    feesPaid: 10000,
    feesCollectionFrequency: 'Monthly',
    admissionDate: '2025-01-15', // Jan 15, 2025
    contact: '9876543210'
  },
  {
    name: 'Jane Smith',
    class: '9th',
    fatherName: 'Michael Smith',
    totalFees: 60000,
    feesPaid: 20000,
    feesCollectionFrequency: '2 installments',
    admissionDate: '2025-01-15',
    contact: '9876543211'
  },
  {
    name: 'Alice Johnson',
    class: '8th',
    fatherName: 'David Johnson',
    totalFees: 45000,
    feesPaid: 15000,
    feesCollectionFrequency: '3 installments',
    admissionDate: '2025-01-15',
    contact: '9876543212'
  },
  {
    name: 'Bob Brown',
    class: '7th',
    fatherName: 'Charlie Brown',
    totalFees: 80000,
    feesPaid: 20000,
    feesCollectionFrequency: '4 installments',
    admissionDate: '2025-01-15',
    contact: '9876543213'
  }
];

// Run tests for each student
testStudents.forEach((student, index) => {
  console.log(`--- Test ${index + 1}: ${student.name} (${student.feesCollectionFrequency}) ---`);
  
  // Calculate installment schedule
  const schedule = whatsappReminder.calculateInstallmentSchedule(student.admissionDate, student.feesCollectionFrequency);
  console.log('Installment Schedule:', schedule.map(inst => ({
    number: inst.installmentNumber,
    label: inst.label,
    dueDate: inst.dueDate.toISOString().split('T')[0]
  })));
  
  // Get installment amount
  const installmentAmount = whatsappReminder.getInstallmentAmount(student.totalFees, student.feesCollectionFrequency);
  console.log('Installment Amount:', installmentAmount);
  
  // Get next due installment
  const nextInstallment = whatsappReminder.getNextDueInstallment(student);
  console.log('Next Due Installment:', nextInstallment ? {
    number: nextInstallment.installmentNumber,
    label: nextInstallment.label,
    dueDate: nextInstallment.dueDate.toISOString().split('T')[0],
    amount: nextInstallment.amount,
    expectedPaid: nextInstallment.expectedPaid,
    pendingAmount: nextInstallment.pendingAmount
  } : 'None');
  
  // Check if overdue
  const isOverdue = whatsappReminder.isOverdue(student);
  console.log('Is Overdue:', isOverdue);
  
  // Build WhatsApp message
  const message = whatsappReminder.buildWhatsAppMessage(student);
  console.log('WhatsApp Message:', message);
  
  console.log('\n');
});

// Test edge cases
console.log('--- Edge Case Tests ---');

// Student with no admission date
const noAdmissionDateStudent = {
  name: 'No Admission',
  class: '5th',
  fatherName: 'Unknown',
  totalFees: 30000,
  feesPaid: 0,
  feesCollectionFrequency: 'Monthly',
  admissionDate: null,
  contact: '9876543214'
};

console.log('Student with no admission date:');
console.log('Is Overdue:', whatsappReminder.isOverdue(noAdmissionDateStudent));
console.log('Next Due Installment:', whatsappReminder.getNextDueInstallment(noAdmissionDateStudent));

// Student with fully paid fees
const fullyPaidStudent = {
  name: 'Fully Paid',
  class: '6th',
  fatherName: 'Paid Parent',
  totalFees: 30000,
  feesPaid: 30000,
  feesCollectionFrequency: 'Monthly',
  admissionDate: '2025-01-15',
  contact: '9876543215'
};

console.log('\nStudent with fully paid fees:');
console.log('Is Overdue:', whatsappReminder.isOverdue(fullyPaidStudent));
console.log('Next Due Installment:', whatsappReminder.getNextDueInstallment(fullyPaidStudent));

console.log('\nAll tests completed!');