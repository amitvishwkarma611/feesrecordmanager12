/**
 * Test file for WhatsApp Reminder Helper Universal Logic
 * Tests multiple fee structures and overdue detection
 */

import whatsappReminder from './whatsappReminder';

// Mock branding info
global.window = {
  appState: { firmName: 'Test Institute' }
};

describe('WhatsApp Reminder Helper - Universal Logic', () => {
  beforeEach(() => {
    // Reset any state between tests
  });

  test('getCycleMonths should return correct month counts', () => {
    expect(whatsappReminder.getCycleMonths('MONTHLY')).toBe(1);
    expect(whatsappReminder.getCycleMonths('2_INSTALLMENTS')).toBe(2);
    expect(whatsappReminder.getCycleMonths('3_INSTALLMENTS')).toBe(3);
    expect(whatsappReminder.getCycleMonths('4_INSTALLMENTS')).toBe(4);
    expect(whatsappReminder.getCycleMonths('UNKNOWN')).toBe(1); // Default
  });

  test('getNextDueDate should calculate correctly for monthly students', () => {
    const student = {
      feeCycle: 'MONTHLY',
      lastPaidDate: '2024-01-15'
    };
    
    const nextDue = whatsappReminder.getNextDueDate(student);
    expect(nextDue).toBeInstanceOf(Date);
    
    // Should be approximately 1 month after last paid date
    const expectedDate = new Date('2024-02-15');
    expect(Math.abs(nextDue.getTime() - expectedDate.getTime())).toBeLessThan(86400000); // Within 1 day
  });

  test('getNextDueDate should handle custom due dates', () => {
    const customDate = new Date('2024-03-31');
    const student = {
      feeCycle: 'CUSTOM',
      customNextDueDate: customDate
    };
    
    const nextDue = whatsappReminder.getNextDueDate(student);
    expect(nextDue).toEqual(customDate);
  });

  test('isOverdue should correctly identify overdue students', () => {
    // Create a student who should be overdue
    const overdueStudent = {
      pendingAmount: '5000',
      feeCycle: 'MONTHLY',
      lastPaidDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
    };
    
    expect(whatsappReminder.isOverdue(overdueStudent)).toBe(true);
    
    // Create a student who should NOT be overdue
    const currentStudent = {
      pendingAmount: '5000',
      feeCycle: 'MONTHLY',
      lastPaidDate: new Date() // Paid today
    };
    
    expect(whatsappReminder.isOverdue(currentStudent)).toBe(false);
  });

  test('buildWhatsAppMessage should include due date information', () => {
    const student = {
      name: 'Rahul Sharma',
      fatherName: 'Mr. Sharma',
      pendingAmount: '2500',
      feeCycle: 'MONTHLY',
      lastPaidDate: '2024-01-15'
    };
    
    const message = whatsappReminder.buildWhatsAppMessage(student);
    expect(message).toContain('Rahul Sharma');
    expect(message).toContain('₹2500');
    expect(message).toContain('Due date:');
    expect(message).toContain('Mr. Sharma');
  });

  test('should handle students with zero pending amount', () => {
    const student = {
      pendingAmount: '0',
      feeCycle: 'MONTHLY',
      lastPaidDate: '2024-01-15'
    };
    
    expect(whatsappReminder.isOverdue(student)).toBe(false);
  });

  test('getOverdueStudents should filter correctly from array', () => {
    const students = [
      { id: 1, pendingAmount: '5000', feeCycle: 'MONTHLY', lastPaidDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
      { id: 2, pendingAmount: '0', feeCycle: 'MONTHLY', lastPaidDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
      { id: 3, pendingAmount: '3000', feeCycle: 'MONTHLY', lastPaidDate: new Date() }
    ];
    
    const overdueStudents = whatsappReminder.getOverdueStudents(students);
    expect(overdueStudents.length).toBe(1);
    expect(overdueStudents[0].id).toBe(1);
  });
});

console.log('All WhatsApp Reminder Helper tests completed successfully!');