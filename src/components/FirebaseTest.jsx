import React, { useState, useEffect } from 'react';
import dataManager from '../utils/dataManager';

const FirebaseTest = () => {
  const [testResult, setTestResult] = useState('');
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const testAddStudent = async () => {
    setLoading(true);
    setTestResult('Testing student addition...');
    
    try {
      const testStudent = {
        name: 'Test Student',
        class: '10A',
        contact: '1234567890',
        totalFees: 1000,
        feesPaid: 0,
        feesDue: 1000
      };
      
      console.log('Attempting to add test student:', testStudent);
      const result = await dataManager.addStudent(testStudent);
      console.log('Add student result:', result);
      
      setTestResult(`Success! Added student with ID: ${result.id}`);
      
      // Refresh the lists
      loadStudents();
      loadPayments();
    } catch (error) {
      console.error('Error adding student:', error);
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAddPayment = async () => {
    setLoading(true);
    setTestResult('Testing payment addition...');
    
    try {
      // First, make sure we have at least one student
      if (students.length === 0) {
        setTestResult('Error: No students available. Add a student first.');
        setLoading(false);
        return;
      }
      
      // Use the first student for the test payment
      const student = students[0];
      
      const testPayment = {
        studentId: student.studentId || student.id,
        studentName: student.name,
        studentClass: student.class,
        studentContact: student.contact,
        amount: 500,
        dueDate: new Date(),
        status: 'pending',
        method: 'cash'
      };
      
      console.log('Attempting to add test payment:', testPayment);
      const result = await dataManager.addPayment(testPayment);
      console.log('Add payment result:', result);
      
      setTestResult(`Success! Added payment with ID: ${result.id}`);
      
      // Refresh the lists
      loadStudents();
      loadPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const studentList = await dataManager.getStudents();
      setStudents(studentList);
    } catch (error) {
      console.error('Error loading students:', error);
      setTestResult(`Error loading students: ${error.message}`);
    }
  };

  const loadPayments = async () => {
    try {
      const paymentList = await dataManager.getPayments();
      setPayments(paymentList);
    } catch (error) {
      console.error('Error loading payments:', error);
      setTestResult(`Error loading payments: ${error.message}`);
    }
  };

  useEffect(() => {
    loadStudents();
    loadPayments();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Firebase Connection Test</h2>
      <div>
        <button onClick={testAddStudent} disabled={loading}>
          {loading ? 'Adding Student...' : 'Test Add Student'}
        </button>
        <button onClick={testAddPayment} disabled={loading} style={{ marginLeft: '10px' }}>
          {loading ? 'Adding Payment...' : 'Test Add Payment'}
        </button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <strong>Test Result:</strong> {testResult}
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Current Students ({students.length})</h3>
        <ul>
          {students.map(student => (
            <li key={student.id}>
              {student.name} - {student.class} - ₹{student.totalFees} (Paid: ₹{student.feesPaid})
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Current Payments ({payments.length})</h3>
        <ul>
          {payments.map(payment => (
            <li key={payment.id}>
              {payment.studentName} - ₹{payment.amount} - {payment.status} ({payment.method})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FirebaseTest;