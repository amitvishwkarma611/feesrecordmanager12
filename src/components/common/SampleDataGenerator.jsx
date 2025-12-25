import React, { useState } from 'react';
import { addStudent, addPayment, addExpenditure } from '../../services/firebaseService';

const SampleDataGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Sample data to populate the dashboard
  const sampleStudents = [
    {
      name: "Rahul Sharma",
      class: "10th Grade",
      totalFees: 15000,
      feesPaid: 12000,
      feesPending: 3000,
      phone: "+91 98765 43210",
      email: "rahul.sharma@example.com"
    },
    {
      name: "Priya Patel",
      class: "9th Grade",
      totalFees: 12000,
      feesPaid: 12000,
      feesPending: 0,
      phone: "+91 98765 43211",
      email: "priya.patel@example.com"
    },
    {
      name: "Amit Kumar",
      class: "11th Grade",
      totalFees: 18000,
      feesPaid: 8000,
      feesPending: 10000,
      phone: "+91 98765 43212",
      email: "amit.kumar@example.com"
    },
    {
      name: "Sneha Gupta",
      class: "12th Grade",
      totalFees: 20000,
      feesPaid: 15000,
      feesPending: 5000,
      phone: "+91 98765 43213",
      email: "sneha.gupta@example.com"
    },
    {
      name: "Vikram Singh",
      class: "8th Grade",
      totalFees: 10000,
      feesPaid: 7000,
      feesPending: 3000,
      phone: "+91 98765 43214",
      email: "vikram.singh@example.com"
    }
  ];

  const samplePayments = [
    {
      studentId: "student1",
      studentName: "Rahul Sharma",
      amount: 5000,
      date: new Date().toISOString().split('T')[0],
      dueDate: "2025-12-31",
      status: "paid",
      mode: "Cash"
    },
    {
      studentId: "student1",
      studentName: "Rahul Sharma",
      amount: 7000,
      date: "2025-11-15",
      dueDate: "2025-11-30",
      status: "paid",
      mode: "Online"
    },
    {
      studentId: "student2",
      studentName: "Priya Patel",
      amount: 12000,
      date: "2025-10-10",
      dueDate: "2025-10-31",
      status: "paid",
      mode: "Cheque"
    },
    {
      studentId: "student3",
      studentName: "Amit Kumar",
      amount: 8000,
      date: "2025-12-01",
      dueDate: "2025-12-31",
      status: "paid",
      mode: "Online"
    },
    {
      studentId: "student4",
      studentName: "Sneha Gupta",
      amount: 5000,
      date: "2025-11-20",
      dueDate: "2025-11-30",
      status: "paid",
      mode: "Cash"
    },
    {
      studentId: "student4",
      studentName: "Sneha Gupta",
      amount: 10000,
      date: "2025-12-10",
      dueDate: "2025-12-31",
      status: "paid",
      mode: "Online"
    },
    {
      studentId: "student5",
      studentName: "Vikram Singh",
      amount: 7000,
      date: "2025-11-05",
      dueDate: "2025-11-30",
      status: "paid",
      mode: "Cheque"
    }
  ];

  const sampleExpenditures = [
    {
      title: "Electricity Bill",
      description: "November electricity bill payment",
      total: 8500,
      date: "2025-11-25",
      category: "Utilities"
    },
    {
      title: "Internet Connection",
      description: "Monthly internet charges",
      total: 2500,
      date: "2025-11-10",
      category: "Utilities"
    },
    {
      title: "Staff Salaries",
      description: "October salaries for teaching staff",
      total: 45000,
      date: "2025-10-31",
      category: "Salaries"
    },
    {
      title: "Library Books",
      description: "Purchase of new books for library",
      total: 12000,
      date: "2025-11-15",
      category: "Supplies"
    },
    {
      title: "Maintenance",
      description: "General maintenance and repairs",
      total: 6500,
      date: "2025-11-20",
      category: "Maintenance"
    }
  ];

  const generateSampleData = async () => {
    setLoading(true);
    setMessage('Generating sample data...');
    
    try {
      // Add sample students
      setMessage('Adding sample students...');
      for (const student of sampleStudents) {
        await addStudent(student);
      }
      
      // Add sample payments
      setMessage('Adding sample payments...');
      for (const payment of samplePayments) {
        await addPayment(payment);
      }
      
      // Add sample expenditures
      setMessage('Adding sample expenditures...');
      for (const expenditure of sampleExpenditures) {
        await addExpenditure(expenditure);
      }
      
      setMessage('Sample data generated successfully! Refresh the dashboard to see the data.');
    } catch (error) {
      console.error('Error generating sample data:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <h3>Sample Data Generator</h3>
      <p>Click the button below to populate the dashboard with sample data:</p>
      <button 
        onClick={generateSampleData}
        disabled={loading}
        style={{
          background: '#4e73df',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Generating...' : 'Generate Sample Data'}
      </button>
      {message && (
        <p style={{ marginTop: '10px', fontSize: '14px' }}>{message}</p>
      )}
    </div>
  );
};

export default SampleDataGenerator;