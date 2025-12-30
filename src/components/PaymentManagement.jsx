import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import dataManager from '../utils/dataManager';
import { setPaymentsList } from '../utils/dataStore';
import { getBrandingSettings } from '../services/firebaseService';
import SkeletonLoader from './common/SkeletonLoader';
import '../styles/PaymentManagement.css';

const PaymentManagement = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]); // Add students state
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [brandingData, setBrandingData] = useState(null);
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0
  });
  const [errorMessage, setErrorMessage] = useState(''); // Add error message state
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this state for anti-double-submit

  // Helper function to format dates for display
  const formatDisplayDate = (date) => {
    if (!date) return 'N/A';
    
    // Handle Firebase Timestamps
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      // Check if it's in YYYY-MM-DD format
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-');
        return new Date(year, month - 1, day).toLocaleDateString();
      }
      // Try to parse other date formats
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString();
      }
    }
    
    // Handle Date objects
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    
    return String(date);
  };

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    dueDate: '',
    paymentMethod: ''
  });
  
  const [amountExceedsFees, setAmountExceedsFees] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Listen for storage changes to update data across components
  useEffect(() => {
    const handleStorageChange = () => {
      refreshData();
    };
    
    // Listen for studentsUpdated event to refresh UI instantly after payment updates
    const handleStudentsUpdated = () => {
      refreshData();
    };
    
    // Listen for feesManagementSync event
    const handleFeesManagementSync = () => {
      refreshData();
    };
    
    // Listen for paymentAdded event to refresh UI when new payments are added
    const handlePaymentAdded = () => {
      refreshData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    window.addEventListener('feesManagementSync', handleFeesManagementSync);
    window.addEventListener('paymentAdded', handlePaymentAdded);
    
    // Cleanup listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
      window.removeEventListener('feesManagementSync', handleFeesManagementSync);
      window.removeEventListener('paymentAdded', handlePaymentAdded);
    };
  }, []);

  const refreshData = async () => {
    try {
      // Load data from data manager
      const [loadedPayments, loadedStudents] = await Promise.all([
        dataManager.getPayments(),
        dataManager.getStudents()
      ]);
      
      // Store in global data store
      setPaymentsList(loadedPayments);
      
      // Store in component state
      setPayments(loadedPayments);
      setStudents(loadedStudents); // Set students state
      setFilteredPayments(loadedPayments);
      
      // Get real statistics from the improved function
      const statistics = await dataManager.getPaymentStatistics();
      
      // Map the correct property names for the component
      const paymentStats = {
        ...statistics,
        feesCollected: statistics.totalCollected,
        pendingFees: statistics.totalPending,
        overdueFees: statistics.totalOverdue,
        totalFees: statistics.totalStudentFees,
        paymentProgress: statistics.totalStudentFees > 0 
          ? Math.round((statistics.totalCollected / statistics.totalStudentFees) * 100) 
          : 0
      };
      
      setStats(paymentStats);
    } catch (error) {
      console.error('Error loading payment data:', error);
      setPayments([]);
      setStudents([]); // Clear students on error
      setFilteredPayments([]);
      setStats({
        totalStudents: 0,
        totalFees: 0,
        feesCollected: 0,
        pendingFees: 0,
        paymentProgress: 0,
        
        totalStudentsWithPayments: 0,
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalStudentPending: 0,
        totalStudentPaid: 0,
        totalStudentFees: 0,
        paymentBasedTotal: 0,
        studentBasedTotal: 0,
        consistencyCheck: {
          paymentTotal: 0,
          studentTotal: 0,
          difference: 0
        }
      });
    }
  };

  useEffect(() => {
    // Filter payments based on search term and status
    let filtered = payments;
    
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.receipt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(payment => payment.status === filterStatus);
    }
    
    // Sort by createdAt descending (newest first) - enhanced sorting for reliability
    filtered.sort((a, b) => {
      // Handle cases where createdAt might be missing or invalid
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      
      // If both dates are valid, sort by date (newest first)
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateB - dateA;
      }
      
      // If one date is invalid, put the valid one first
      if (!isNaN(dateA.getTime())) return -1;
      if (!isNaN(dateB.getTime())) return 1;
      
      // If both dates are invalid, maintain original order
      return 0;
    });
    
    setFilteredPayments(filtered);
  }, [searchTerm, filterStatus, payments]);

  const handleLogout = () => {
    // Remove authentication data from sessionStorage instead of localStorage
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.studentId || !formData.amount || !formData.dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate amount doesn't exceed student's total fees
    const student = students.find(s => s.studentId === formData.studentId);
    if (!student) {
      alert('Selected student not found');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    const totalFees = parseFloat(student.totalFees) || 0;
    const feesPaid = parseFloat(student.feesPaid) || 0;
    const maxAllowedAmount = totalFees - feesPaid;
    
    if (amount > maxAllowedAmount) {
      alert(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
      return;
    }
    
    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    
    try {
      // Ensure dueDate is properly formatted
      let dueDate = formData.dueDate;
      if (dueDate instanceof Date) {
        // Format Date object to YYYY-MM-DD string
        dueDate = dueDate.toISOString().split('T')[0];
      }
      
      // Create payment object with Firebase Timestamps
      const paymentData = {
        studentId: formData.studentId,
        studentName: student.name,
        studentClass: student.class,
        studentContact: student.contact,
        amount: amount,
        dueDate: dueDate,
        description: formData.description || '',
        status: 'pending',
        method: null,
        receipt: null,
        paidDate: null,
        createdAt: Timestamp.now() // Use Firebase Timestamp instead of string
      };
      
      // Add payment to Firebase
      const result = await dataManager.addPayment(paymentData);
      
      if (result) {
        // Reset form
        setFormData({
          studentId: '',
          amount: '',
          dueDate: '',
          description: ''
        });
        
        // Close modal
        setShowAddForm(false);
        
        // Refresh data
        refreshData();
        
        // Show success message
        alert('Payment added successfully!');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error adding payment. Please try again.');
    }
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setIsEditing(true);
    setFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      dueDate: payment.dueDate,
      paymentMethod: payment.method || ''
    });
    setShowPaymentForm(true);
  };

  const handleRecordPayment = async (paymentId, paymentMethod) => {
    try {
      // Record payment with Firebase Timestamp
      const result = await dataManager.recordPayment(paymentId, paymentMethod);
      
      if (result) {
        // Refresh data
        refreshData();
        
        // Show success message
        alert('Payment recorded successfully!');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    }
  };

  const handleViewReceipt = async (payment) => {
    setReceiptData(payment);
    
    // Fetch branding settings
    try {
      const branding = await getBrandingSettings();
      setBrandingData(branding);
    } catch (error) {
      console.error('Error fetching branding settings:', error);
      setBrandingData({});
    }
    
    setShowReceipt(true);
  };

  const handleGenerateReport = () => {
    alert('Generating payment report...');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Clear any previous error messages
    setErrorMessage('');
    
    try {
      // Validate student exists when adding a new payment
      if (!selectedPayment && !isEditing) {
        const student = await dataManager.getStudentById(formData.studentId);
        if (!student) {
          setErrorMessage(`Student with ID "${formData.studentId}" not found. Please add the student first in the Student Management section.`);
          setIsSubmitting(false);
          return;
        }
        
        // Validate that payment amount doesn't exceed total fees
        const amount = parseFloat(formData.amount) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        const maxAllowedAmount = totalFees - feesPaid;
        
        if (amount > maxAllowedAmount) {
          setErrorMessage(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
          setIsSubmitting(false);
          return;
        }
        
        // Also check that amount is positive
        if (amount <= 0) {
          setErrorMessage('Payment amount must be greater than zero.');
          setIsSubmitting(false);
          return;
        }
        
        // Validate that due date is today (prevent past or future dates)
        const today = new Date();
        const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (formData.dueDate && formData.dueDate !== todayFormatted) {
          setErrorMessage('Payments can only be added for today\'s date. Past or future dates are not allowed.');
          setIsSubmitting(false);
          return;
        }
      }
      
      if (isEditing) {
        // Edit existing payment (for pending/overdue payments)
        // Validate that payment amount doesn't exceed total fees
        const student = await dataManager.getStudentById(formData.studentId);
        if (!student) {
          setErrorMessage(`Student with ID "${formData.studentId}" not found.`);
          setIsSubmitting(false);
          return;
        }
        
        const amount = parseFloat(formData.amount) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        // When editing, we need to account for the existing payment amount
        const existingPaymentAmount = parseFloat(selectedPayment.amount) || 0;
        const maxAllowedAmount = totalFees - feesPaid + existingPaymentAmount;
        
        if (amount > maxAllowedAmount) {
          setErrorMessage(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
          setIsSubmitting(false);
          return;
        }
        
        // Also check that amount is positive
        if (amount <= 0) {
          setErrorMessage('Payment amount must be greater than zero.');
          setIsSubmitting(false);
          return;
        }
        
        const updatedPayment = {
          ...selectedPayment,
          studentId: formData.studentId,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate
        };
        
        const result = await dataManager.updatePayment(updatedPayment);
        if (result) {
          refreshData();
        }
      } else if (selectedPayment) {
        // Record payment
        // Validate that payment amount doesn't exceed total fees
        const student = await dataManager.getStudentById(selectedPayment.studentId);
        if (!student) {
          setErrorMessage(`Student with ID "${selectedPayment.studentId}" not found.`);
          setIsSubmitting(false);
          return;
        }
        
        const amount = parseFloat(selectedPayment.amount) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        const maxAllowedAmount = totalFees - feesPaid;
        
        if (amount > maxAllowedAmount) {
          setErrorMessage(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
          setIsSubmitting(false);
          return;
        }
        
        // Record the payment with the selected payment method
        const result = await dataManager.recordPayment(selectedPayment.id, formData.paymentMethod);
        if (result) {
          refreshData();
        }
      } else {
        // Add new payment
        const student = await dataManager.getStudentById(formData.studentId);
        if (!student) {
          setErrorMessage(`Student with ID "${formData.studentId}" not found.`);
          setIsSubmitting(false);
          return;
        }
        
        // Validate that payment amount doesn't exceed total fees
        const amount = parseFloat(formData.amount) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        const maxAllowedAmount = totalFees - feesPaid;
        
        if (amount > maxAllowedAmount) {
          setErrorMessage(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
          setIsSubmitting(false);
          return;
        }
        
        // Also check that amount is positive
        if (amount <= 0) {
          setErrorMessage('Payment amount must be greater than zero.');
          setIsSubmitting(false);
          return;
        }
        
        // Validate that due date is today (prevent past or future dates)
        const today = new Date();
        const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (formData.dueDate && formData.dueDate !== todayFormatted) {
          setErrorMessage('Payments can only be added for today\'s date. Past or future dates are not allowed.');
          setIsSubmitting(false);
          return;
        }
        
        // Create new payment
        // Ensure dueDate is properly formatted
        let dueDate = formData.dueDate;
        if (dueDate instanceof Date) {
          // Format Date object to YYYY-MM-DD string
          dueDate = dueDate.toISOString().split('T')[0];
        }
        
        const newPayment = {
          studentId: formData.studentId,
          amount: parseFloat(formData.amount),
          dueDate: dueDate,
          description: formData.description || '',
          studentName: student.name,
          studentClass: student.class,
          studentContact: student.contact,
          status: 'pending',
          paidDate: null,
          method: null,
          receipt: null
        };
        
        const result = await dataManager.addPayment(newPayment);
        if (result) {
          refreshData();
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setErrorMessage('Error processing payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = async (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Check if amount exceeds total fees when amount field changes
    if (name === 'amount' && value && formData.studentId) {
      const student = await dataManager.getStudentById(formData.studentId);
      if (student) {
        const amount = parseFloat(value) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        
        // For editing, we need to account for the existing payment amount
        let maxAllowedAmount = totalFees - feesPaid;
        if (isEditing && selectedPayment) {
          const existingPaymentAmount = parseFloat(selectedPayment.amount) || 0;
          maxAllowedAmount = totalFees - feesPaid + existingPaymentAmount;
        }
        
        setAmountExceedsFees(amount > maxAllowedAmount);
      }
    }
    
    // Also check when studentId changes
    if (name === 'studentId' && formData.amount && value) {
      const student = await dataManager.getStudentById(value);
      if (student) {
        const amount = parseFloat(formData.amount) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        
        // For editing, we need to account for the existing payment amount
        let maxAllowedAmount = totalFees - feesPaid;
        if (isEditing && selectedPayment) {
          const existingPaymentAmount = parseFloat(selectedPayment.amount) || 0;
          maxAllowedAmount = totalFees - feesPaid + existingPaymentAmount;
        }
        
        setAmountExceedsFees(amount > maxAllowedAmount);
      }
    }
  };

  const closeForm = () => {
    setShowPaymentForm(false);
    setSelectedPayment(null);
    setIsEditing(false);
    setErrorMessage(''); // Clear error message when closing form
    setFormData({
      studentId: '',
      amount: '',
      dueDate: '',
      paymentMethod: ''
    });
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      default: return status;
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.studentId || !formData.amount || !formData.dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate amount doesn't exceed student's total fees
    const student = students.find(s => s.studentId === formData.studentId);
    if (!student) {
      alert('Selected student not found');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (amount > student.totalFees) {
      alert(`Payment amount exceeds student's total fees of ₹${student.totalFees}`);
      return;
    }
    
    try {
      // Create updated payment object with Firebase Timestamps
      const paymentData = {
        ...selectedPayment,
        studentId: formData.studentId,
        studentName: student.name,
        studentClass: student.class,
        studentContact: student.contact,
        amount: amount,
        dueDate: formData.dueDate,
        description: formData.description || '',
        updatedAt: Timestamp.now() // Add update timestamp
      };
      
      // Update payment in Firebase
      const result = await dataManager.updatePayment(paymentData);
      
      if (result) {
        // Reset form
        setFormData({
          studentId: '',
          amount: '',
          dueDate: '',
          description: ''
        });
        
        // Close modal
        setShowPaymentForm(false);
        setSelectedPayment(null);
        setIsEditing(false);
        
        // Refresh data
        refreshData();
        
        // Show success message
        alert('Payment updated successfully!');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment. Please try again.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation */}
      <div className="top-nav">
        <div className="nav-brand">
          <h2>FeeManager</h2>
        </div>
        <div className="nav-buttons">
          <button 
            className="nav-button" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button 
            className="nav-button" 
            onClick={() => navigate('/students')}
          >
            Students
          </button>
          <button 
            className="nav-button" 
            onClick={() => navigate('/payments')}
          >
            Payments
          </button>
          <button 
            className="logout-button" 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content full-width">
        <div className="header">
          <h1>Payment Management</h1>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="action-buttons">
            <button 
              className="report-button" 
              onClick={handleGenerateReport}
            >
              Generate Report
            </button>
            <button 
              className="add-button" 
              onClick={handleAddPayment}
            >
              Add Payment
            </button>
          </div>
        </div>

        {/* Payment Status Overview */}
        <div className="payment-status-overview">
          <div className="overview-header">
            <h3>Payment Status Distribution</h3>
          </div>
          <div className="overview-content">
            {isLoading ? (
              <div className="kpi-skeleton-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton-card"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="status-item paid">
                  <div className="status-label">Collected Amount</div>
                  <div className="status-value">₹{stats.collectedAmount?.toLocaleString() || 0}</div>
                  <div className="status-count">{filteredPayments.filter(p => p.status === 'paid').length} payments</div>
                </div>
                <div className="status-item pending">
                  <div className="status-label">Pending Amount</div>
                  <div className="status-value">₹{stats.paymentPendingAmount?.toLocaleString() || 0}</div>
                  <div className="status-count">From student records</div>
                  <div className="status-subtext">
                    {stats.totalExpected > 0 
                      ? `${Math.round((stats.paymentPendingAmount / stats.totalExpected) * 100)}% of total`
                      : '0% of total'}
                  </div>
                </div>
                <div className="status-item overdue">
                  <div className="status-label">Overdue Amount</div>
                  <div className="status-value">₹{stats.paymentOverdueAmount?.toLocaleString() || 0}</div>
                  <div className="status-count">{filteredPayments.filter(p => p.status === 'overdue').length} payments</div>
                  <div className="status-subtext">
                    {stats.totalExpected > 0 
                      ? `${Math.round((stats.paymentOverdueAmount / stats.totalExpected) * 100)}% of total`
                      : '0% of total'}
                  </div>
                </div>
                <div className="status-item total">
                  <div className="status-label">Total Expected</div>
                  <div className="status-value">₹{stats.totalExpected?.toLocaleString() || 0}</div>
                  <div className="status-count">{filteredPayments.length} payments</div>
                  <div className="status-subtext">
                    Collection Rate: {stats.totalExpected > 0 
                      ? Math.round((stats.collectedAmount / stats.totalExpected) * 100) 
                      : 0}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Method</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <div className="table-skeleton">
                  <div className="skeleton-header"></div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton-row"></div>
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-results">
                    You haven't added any payments yet. Start by adding your first payment.
                  </td>
                </tr>
              ) : (
                // Actual payment rows
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.studentName || 'Unknown Student'}</td>
                    <td>{payment.studentId || 'N/A'}</td>
                    <td>₹{payment.amount || 0}</td>
                    <td>{formatDisplayDate(payment.dueDate)}</td>
                    <td>{formatDisplayDate(payment.paidDate)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(payment.status || 'pending')}`}>
                        {getStatusText(payment.status || 'pending')}
                      </span>
                    </td>
                    <td>{payment.method || '-'}</td>
                    <td>{payment.receipt || '-'}</td>
                    <td>
                      {payment.status === 'paid' ? (
                        <>
                          <button 
                            className="action-button view-button"
                            onClick={() => handleViewReceipt(payment)}
                          >
                            View
                          </button>
                          <button 
                            className="action-button edit-button"
                            onClick={() => handleEditPayment(payment)}
                          >
                            Edit
                          </button>
                        </>
                      ) : (
                        <button 
                          className="action-button pay-button"
                          onClick={() => handleRecordPayment(payment)}
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Form Modal */}
        {showPaymentForm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{isEditing ? 'Edit Payment' : selectedPayment ? 'Record Payment' : 'Add New Payment'}</h2>
                <button 
                  className="close-button" 
                  onClick={closeForm}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="payment-form">
                {errorMessage && (
                  <div className="error-message">
                    {errorMessage}
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="studentId">Student ID</label>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleFormChange}
                      required
                      disabled={!!selectedPayment && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="amount">Amount (₹)</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      required
                      disabled={!!selectedPayment && !isEditing}
                      className={amountExceedsFees ? 'amount-exceeds' : ''}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dueDate">Due Date</label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleFormChange}
                      required
                      disabled={!!selectedPayment && !isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="paymentMethod">Payment Method</label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleFormChange}
                      required={selectedPayment ? true : !isEditing} // Make required when recording payment
                      disabled={isEditing}
                    >
                      <option value="">Select Payment Method</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button" 
                    onClick={closeForm}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : (isEditing ? 'Update Payment' : selectedPayment ? 'Record Payment' : 'Add Payment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && receiptData && (
          <div className="modal-overlay">
            <div className="modal receipt-modal">
              <div className="modal-header">
                <h2>Payment Receipt</h2>
                <button 
                  className="close-button" 
                  onClick={closeReceipt}
                >
                  ×
                </button>
              </div>
              <div className="receipt-content">
                <div className="receipt-header">
                  <div className="receipt-header-content">
                    {brandingData?.logoUrl ? (
                      <img src={brandingData.logoUrl} alt="Academy Logo" className="receipt-preview-logo" />
                    ) : (
                      <div className="receipt-placeholder-logo">🏫</div>
                    )}
                    <div className="receipt-academy-info">
                      <h4 className="receipt-academy-name">{brandingData?.firmName || 'Academy Name'}</h4>
                      <p className="receipt-academy-address">{brandingData?.firmAddress || 'Academy Address'}</p>
                    </div>
                  </div>
                  <div className="receipt-title-preview">Fee Receipt</div>
                </div>
                
                <div className="receipt-details">
                  <div className="receipt-row">
                    <span className="receipt-label">Receipt No:</span>
                    <span className="receipt-value">{receiptData.receipt || 'N/A'}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Date:</span>
                    <span className="receipt-value">{formatDisplayDate(receiptData.paidDate)}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Student Name:</span>
                    <span className="receipt-value">{receiptData.studentName}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Student ID:</span>
                    <span className="receipt-value">{receiptData.studentId}</span>
                  </div>
                  
                  {/* Additional student details */}
                  {receiptData.studentClass && (
                    <div className="receipt-row">
                      <span className="receipt-label">Class:</span>
                      <span className="receipt-value">{receiptData.studentClass}</span>
                    </div>
                  )}
                  
                  {receiptData.studentContact && (
                    <div className="receipt-row">
                      <span className="receipt-label">Contact:</span>
                      <span className="receipt-value">{receiptData.studentContact}</span>
                    </div>
                  )}
                  
                  <div className="receipt-divider"></div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Amount Paid:</span>
                    <span className="receipt-value receipt-amount">₹{receiptData.amount}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Payment Method:</span>
                    <span className="receipt-value">{receiptData.method}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span className="receipt-label">Due Date:</span>
                    <span className="receipt-value">{receiptData.dueDate}</span>
                  </div>
                  
                  {/* Additional payment details */}
                  <div className="receipt-row">
                    <span className="receipt-label">Status:</span>
                    <span className="receipt-value">{receiptData.status}</span>
                  </div>
                  
                  {receiptData.description && (
                    <div className="receipt-row">
                      <span className="receipt-label">Description:</span>
                      <span className="receipt-value">{receiptData.description}</span>
                    </div>
                  )}
                </div>
                
                <div className="receipt-signatures">
                  <div className="signature-section">
                    <p>Cashier</p>
                    <div className="signature-line"></div>
                  </div>
                  
                  {brandingData?.signatureUrl && (
                    <div className="authorized-signature-section">
                      <img src={brandingData.signatureUrl} alt="Authorized Signature" className="receipt-signature" />
                      <p>Authorized Signature</p>
                    </div>
                  )}
                  
                  {brandingData?.stampUrl && (
                    <div className="stamp-section">
                      <img src={brandingData.stampUrl} alt="Official Stamp" className="receipt-stamp" />
                      <p>Official Stamp</p>
                    </div>
                  )}
                </div>
                
                <div className="receipt-footer">
                  <p>Thank you for your payment!</p>
                  <p className="receipt-note">This is an auto-generated receipt. No signature required.</p>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="print-button"
                  onClick={() => {
                    // Create a print-friendly version of the receipt
                    const printWindow = window.open('', '_blank');
                    const receiptContent = document.querySelector('.receipt-content');
                    
                    if (receiptContent) {
                      const receiptHTML = receiptContent.innerHTML;
                      
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Payment Receipt</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .receipt-content { max-width: 600px; margin: 0 auto; }
                            .receipt-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; }
                            .receipt-preview-logo { max-width: 200px; max-height: 100px; }
                            .receipt-header-content { display: flex; align-items: center; justify-content: center; }
                            .receipt-academy-info { text-align: center; margin-left: 15px; }
                            .receipt-academy-name { margin: 0; font-size: 1.2em; }
                            .receipt-academy-address { margin: 5px 0 0 0; }
                            .receipt-title-preview { text-align: center; font-size: 1.4em; font-weight: bold; margin: 15px 0; }
                            .receipt-details { margin: 20px 0; }
                            .receipt-row { display: flex; justify-content: space-between; margin: 8px 0; }
                            .receipt-label { font-weight: bold; }
                            .receipt-amount { color: #27ae60; font-weight: bold; }
                            .receipt-divider { height: 1px; background: #ccc; margin: 15px 0; }
                            .receipt-signatures { display: flex; justify-content: space-between; margin: 30px 0; padding: 15px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }
                            .signature-section, .stamp-section, .authorized-signature-section { text-align: center; }
                            .receipt-signature, .receipt-stamp { max-width: 150px; max-height: 80px; }
                            .signature-line { width: 100px; height: 1px; background: #000; margin: 20px auto; }
                            .receipt-footer { text-align: center; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 15px; }
                          </style>
                        </head>
                        <body>
                          <div class="receipt-content">
                            ${receiptHTML}
                          </div>
                        </body>
                        </html>
                      `);
                      
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                      printWindow.close();
                    }
                  }}
                >
                  Print Receipt
                </button>
                <button 
                  className="close-receipt-button"
                  onClick={closeReceipt}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagement;