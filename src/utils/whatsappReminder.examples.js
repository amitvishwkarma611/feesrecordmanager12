/**
 * Example Usage of Universal WhatsApp Reminder Logic
 * Demonstrates how to integrate the new functionality
 */

// Import the WhatsApp reminder helper
import whatsappReminder from './whatsappReminder';

/**
 * Example 1: Monthly Fee Structure
 */
const monthlyStudent = {
  id: 'STU001',
  name: 'Rahul Kumar',
  fatherName: 'Mr. Rajesh Kumar',
  pendingAmount: '2500',
  feeCycle: 'MONTHLY',
  lastPaidDate: '2024-01-15', // Paid on Jan 15, 2024
  contact: '9876543210'
};

console.log('=== Monthly Student Example ===');
console.log('Next Due Date:', whatsappReminder.getNextDueDate(monthlyStudent));
console.log('Is Overdue:', whatsappReminder.isOverdue(monthlyStudent));
console.log('Message:', whatsappReminder.buildWhatsAppMessage(monthlyStudent));

/**
 * Example 2: Every 3 Months Fee Structure
 */
const quarterlyStudent = {
  id: 'STU002',
  name: 'Priya Sharma',
  motherName: 'Mrs. Sunita Sharma',
  pendingAmount: '7500',
  feeCycle: 'EVERY_3_MONTH',
  lastPaidDate: '2023-12-01', // Paid on Dec 1, 2023
  contact: '9876543211'
};

console.log('\n=== Quarterly Student Example ===');
console.log('Next Due Date:', whatsappReminder.getNextDueDate(quarterlyStudent));
console.log('Is Overdue:', whatsappReminder.isOverdue(quarterlyStudent));
console.log('Message:', whatsappReminder.buildWhatsAppMessage(quarterlyStudent));

/**
 * Example 3: Custom Due Date
 */
const customStudent = {
  id: 'STU003',
  name: 'Amit Patel',
  fatherName: 'Mr. Deepak Patel',
  pendingAmount: '5000',
  feeCycle: 'CUSTOM',
  customNextDueDate: '2024-03-31', // Custom due date
  contact: '9876543212'
};

console.log('\n=== Custom Due Date Example ===');
console.log('Next Due Date:', whatsappReminder.getNextDueDate(customStudent));
console.log('Is Overdue:', whatsappReminder.isOverdue(customStudent));
console.log('Message:', whatsappReminder.buildWhatsAppMessage(customStudent));

/**
 * Example 4: Bulk Processing Multiple Students
 */
const allStudents = [monthlyStudent, quarterlyStudent, customStudent];

console.log('\n=== Bulk Processing Example ===');
const overdueStudents = allStudents.filter(student => whatsappReminder.isOverdue(student));
console.log(`Found ${overdueStudents.length} overdue students out of ${allStudents.length}`);

// Send bulk reminders (this would open WhatsApp for each overdue student)
// whatsappReminder.sendBulkReminders(overdueStudents);

/**
 * Example 5: Integration with Existing Dashboard
 */
function getOverdueStudentsForDashboard(studentsList) {
  return studentsList.filter(student => 
    whatsappReminder.isOverdue(student) && 
    student.contact // Only students with contact info
  );
}

// Usage in dashboard component:
// const overdueStudents = getOverdueStudentsForDashboard(allStudentsFromDatabase);

console.log('\n=== Dashboard Integration Example ===');
const dashboardOverdue = getOverdueStudentsForDashboard(allStudents);
console.log(`Dashboard would show ${dashboardOverdue.length} students needing reminders`);

/**
 * Expected Output Format:
 * Hello Mr. Rajesh Kumar 👋
 * Rahul Kumar ki fees ₹2500 pending hai.
 * Due date: February 15, 2024
 * 
 * Kindly fees clear karein.
 * – Test Institute
 */

export {
  monthlyStudent,
  quarterlyStudent,
  customStudent,
  allStudents,
  getOverdueStudentsForDashboard
};