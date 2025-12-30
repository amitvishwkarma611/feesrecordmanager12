import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import dataManager from '../../utils/dataManager';
import { getStudents, getPayments, addPayment, updatePayment, deletePayment } from '../../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';
import RootLayout from '../common/RootLayout';
import './Fees.css';

const Fees = () => {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    dueDate: '',
    description: '',
    method: 'Cash' // Add default payment method
  });
  
  // Branding state
  const [firmName, setFirmName] = useState('Your Academy');
  const [logoUrl, setLogoUrl] = useState('');
  const [firmAddress, setFirmAddress] = useState('Chinchpada, Airoli, Navi Mumbai - 400708');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');

  const [amountExceedsFees, setAmountExceedsFees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this state to prevent double submissions
  
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

  useEffect(() => {
    fetchData();
    
    // Load branding data from Firestore
    loadBrandingDataFromFirestore();
    
    // Listen for success notifications
    const handleSuccess = (event) => {
      const { message } = event.detail;
      // In a real app, this would show a toast notification
      console.log('Success:', message);
      alert(message);
    };
    
    // Listen for navigate back event
    const handleNavigateBack = () => {
      setShowForm(false);
      setEditingPayment(null);
    };
    
    // Listen for student updates
    const handleStudentsUpdated = () => {
      fetchData();
    };
    
    // Listen for paymentAdded event to refresh UI when new payments are added
    const handlePaymentAdded = () => {
      fetchData();
    };
    
    window.addEventListener('showSuccess', handleSuccess);
    window.addEventListener('navigateBack', handleNavigateBack);
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    window.addEventListener('paymentAdded', handlePaymentAdded);
    
    return () => {
      window.removeEventListener('showSuccess', handleSuccess);
      window.removeEventListener('navigateBack', handleNavigateBack);
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
      window.removeEventListener('paymentAdded', handlePaymentAdded);
    };
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, filterStudent, filterMonth]);

  const fetchData = async () => {
    try {
      const [studentsData, paymentsData] = await Promise.all([
        getStudents(),
        getPayments()
      ]);
      
      setStudents(studentsData);
      setPayments(paymentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply student filter
    if (filterStudent !== 'all') {
      filtered = filtered.filter(payment => payment.studentId === filterStudent);
    }
    
    // Apply month filter
    if (filterMonth !== 'all') {
      filtered = filtered.filter(payment => {
        const paymentMonth = new Date(payment.dueDate).toLocaleString('default', { month: 'long', year: 'numeric' });
        return paymentMonth === filterMonth;
      });
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
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    
    // Standardize date formatting
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    };
    
    if (name === 'dueDate' && value) {
      const finalDate = formatDate(value);
      
      setFormData(prev => ({
        ...prev,
        [name]: finalDate
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check if amount exceeds total fees when amount field changes
    if (name === 'amount' && value && formData.studentId) {
      const student = await dataManager.getStudentById(formData.studentId);
      if (student) {
        const amount = parseFloat(value) || 0;
        const totalFees = parseFloat(student.totalFees) || 0;
        const feesPaid = parseFloat(student.feesPaid) || 0;
        
        // For editing, we need to account for the existing payment amount
        let maxAllowedAmount = totalFees - feesPaid;
        if (editingPayment) {
          const existingPaymentAmount = parseFloat(editingPayment.amount) || 0;
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
        if (editingPayment) {
          const existingPaymentAmount = parseFloat(editingPayment.amount) || 0;
          maxAllowedAmount = totalFees - feesPaid + existingPaymentAmount;
        }
        
        setAmountExceedsFees(amount > maxAllowedAmount);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use the robust payment handler
      const result = await handleAddPayment_QODERR_FIX(
        formData.studentId,
        formData.amount,
        formData.dueDate,
        formData.description,
        editingPayment ? editingPayment.id : null
      );
      
      if (result) {
        // Reset form
        setFormData({
          studentId: '',
          amount: '',
          dueDate: '',
          description: ''
        });
        
        setEditingPayment(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Error saving payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ======= Robust Add/Edit Payment Handler with Enhanced Debugging =======
  async function handleAddPayment_QODERR_FIX(selectedStudentId, paymentAmountRaw, dueDateRaw, descriptionRaw, editingPaymentId = null) {
    // Helper
    const toNumber = v => {
      if (v === null || v === undefined) return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const fmtDate = d => {
      if (!d) return "";
      const D = (d instanceof Date) ? d : new Date(d);
      if (isNaN(D.getTime())) return "";
      return D.getFullYear() + "-" + String(D.getMonth()+1).padStart(2,"0") + "-" + String(D.getDate()).padStart(2,"0");
    };

    try {
      console.log("[FIX] start add/edit payment");
      console.log("[FIX] Parameters:", { selectedStudentId, paymentAmountRaw, dueDateRaw, descriptionRaw, editingPaymentId });

      // 1) validate
      if (!selectedStudentId) { 
        console.log("[FIX] Validation failed: No student selected");
        alert("Select a student"); 
        return false; 
      }
      const amount = toNumber(paymentAmountRaw);
      if (amount <= 0) { 
        console.log("[FIX] Validation failed: Invalid amount", paymentAmountRaw);
        alert("Enter valid amount"); 
        return false; 
      }

      // TEMPORARILY DISABLE date validation to allow payments to be added
      // Validate that due date is today (prevent past or future dates)
      /*
      const today = new Date();
      const todayFormatted = fmtDate(today);
      
      if (dueDateRaw && dueDateRaw !== todayFormatted) {
        console.log("[FIX] Validation failed: Date is not today", dueDateRaw, todayFormatted);
        alert("Payments can only be added for today's date. Past or future dates are not allowed.");
        return false;
      }
      */

      // 2) fetch student (replace getStudentById if your function name diff)
      console.log("[FIX] Fetching student with ID:", selectedStudentId);
      const student = await dataManager.getStudentById(selectedStudentId);
      console.log("[FIX] Student fetched:", student);
      if (!student) { 
        console.error("[FIX] student not found", selectedStudentId); 
        alert("Student not found"); 
        return false; 
      }

      // 3) ensure numeric fields
      const totalFees = toNumber(student.totalFees);
      const feesPaid = toNumber(student.feesPaid);
      const feesDue = toNumber(student.feesDue);
      
      console.log("[FIX] Student numeric fields:", {
        totalFees,
        feesPaid,
        feesDue
      });

      // 4) Validate that payment amount doesn't exceed remaining fees
      const maxAllowedAmount = totalFees - feesPaid;
      if (amount > maxAllowedAmount) {
        console.log("[FIX] Validation failed: Amount exceeds remaining fees", {
          amount,
          totalFees,
          feesPaid,
          maxAllowedAmount
        });
        alert(`Payment amount (₹${amount}) exceeds the remaining fees balance (₹${maxAllowedAmount}). Maximum allowed amount is ₹${maxAllowedAmount}.`);
        return false;
      }

      // 5) update fees on student
      const oldFeesPaid = feesPaid;
      const newFeesPaid = feesPaid + amount;
      const finalFeesPaid = Math.max(0, newFeesPaid); // Ensure it's not negative
      const finalFeesDue = Math.max(0, totalFees - finalFeesPaid); // Ensure it's not negative
      
      console.log("[FIX] Student fees calculations:", {
        oldFeesPaid,
        newFeesPaid,
        finalFeesPaid,
        finalFeesDue,
        amountAdded: amount,
        totalFees,
        feesPaid
      });

      // 6) status logic
      let status = "Pending";
      console.log("[FIX] Determining student status with:", {
        finalFeesPaid,
        totalFees,
        finalFeesDue
      });
      
      if (finalFeesPaid === 0) {
        status = "Not Started";
      } else if (totalFees > 0 && finalFeesPaid >= totalFees) {
        status = "Paid";
      } else if (finalFeesDue > 0) {
        status = "Pending"; // Explicitly set to Pending if there are pending fees
      }
      
      console.log("[FIX] Student status set to:", status);

      // 7) Create updated student object
      const updatedStudent = {
        ...student,
        totalFees: totalFees,
        feesPaid: finalFeesPaid,
        feesDue: finalFeesDue,
        status: status,
        updatedAt: Timestamp.now()
      };
      
      console.log("[FIX] Updated student object:", updatedStudent);
      console.log("[FIX] Student ID for update:", updatedStudent.id || updatedStudent.studentId);

      // 8) SAVE student FIRST (this is CRUCIAL)
      console.log("[FIX] Saving student:", updatedStudent);
      const savedStudent = await dataManager.updateStudent(updatedStudent); // must persist and return truthy
      console.log("[FIX] Student saved result:", savedStudent);
      if (!savedStudent) {
        console.error("[FIX] saveStudent failed", updatedStudent);
        alert("Failed to save student. Check console.");
        return false;
      }
      console.log("[FIX] student saved");

      // 9) build payment object & format dates
      const createdAt = fmtDate(new Date());
      const dueDate = dueDateRaw ? fmtDate(dueDateRaw) : "";
      
      let paymentObj = {
        studentId: selectedStudentId,
        amount: amount,
        dueDate: dueDate,
        description: descriptionRaw || "",
        createdAt: Timestamp.now(),
        status: "paid", // Changed back to "paid" for new payments to be recorded as paid immediately
        studentName: student.name,
        studentClass: student.class,
        paidDate: Timestamp.now(), // Set paidDate to now for paid payments
        method: formData.method || "Cash", // Use selected method from form data
        receipt: `RCT-${Date.now()}` // Generate receipt number
      };
      
      // Validate required fields before sending to Firebase
      if (!paymentObj.studentId || !paymentObj.studentName || !paymentObj.studentClass) {
        console.error("[FIX] Missing required student information:", paymentObj);
        alert("Missing required student information. Please try again.");
        return false;
      }
      
      if (!paymentObj.amount || paymentObj.amount <= 0) {
        console.error("[FIX] Invalid payment amount:", paymentObj.amount);
        alert("Invalid payment amount. Please enter a valid amount.");
        return false;
      }
      
      console.log("[FIX] Payment object created:", paymentObj);

      // 10) SAVE or UPDATE payment
      let savedPayment;
      if (editingPaymentId) {
        // Editing existing payment
        console.log("[FIX] Updating existing payment:", editingPaymentId);
        paymentObj = {
          ...editingPayment, // Keep original fields
          studentId: selectedStudentId,
          amount: amount,
          dueDate: dueDate,
          description: descriptionRaw || "",
          studentName: student.name,
          studentClass: student.class,
          updatedAt: Timestamp.now(), // Add updatedAt timestamp for edits
          status: editingPayment?.status || "paid", // Preserve existing status or default to paid
          paidDate: editingPayment?.paidDate || Timestamp.now(), // Preserve existing paidDate or set to now
          method: formData.method || editingPayment?.method || "Cash", // Use selected method or preserve existing
          receipt: editingPayment?.receipt || `RCT-${Date.now()}` // Preserve existing receipt or generate new
        };
        
        // Validate required fields before sending to Firebase
        if (!paymentObj.studentId || !paymentObj.studentName || !paymentObj.studentClass) {
          console.error("[FIX] Missing required student information:", paymentObj);
          alert("Missing required student information. Please try again.");
          return false;
        }
        
        if (!paymentObj.amount || paymentObj.amount <= 0) {
          console.error("[FIX] Invalid payment amount:", paymentObj.amount);
          alert("Invalid payment amount. Please enter a valid amount.");
          return false;
        }
        
        try {
          savedPayment = await updatePayment(editingPaymentId, paymentObj);
          
          // Update student fees after editing payment
          console.log("[FIX] Updating student fees for edited payment:", selectedStudentId);
          try {
            await dataManager.updateStudentFees(selectedStudentId, amount);
            console.log("[FIX] Student fees updated successfully after edit");
          } catch (feeUpdateError) {
            console.error("[FIX] Failed to update student fees after edit:", feeUpdateError);
            alert("Payment updated but failed to update student fees. Please refresh the page.");
          }
        } catch (updateError) {
          console.error("[FIX] Failed to update payment:", updateError);
          alert("Failed to update payment. Please check the console for details.");
          return false;
        }
      } else {
        // Adding new payment
        console.log("[FIX] Adding new payment");
        try {
          savedPayment = await addPayment(paymentObj);
        } catch (addError) {
          console.error("[FIX] Failed to add payment:", addError);
          alert("Failed to add payment. Please check the console for details.");
          return false;
        }
      }
      
      console.log("[FIX] Payment saved result:", savedPayment);
      if (!savedPayment) {
        console.error("[FIX] savePayment failed", paymentObj);
        alert("Failed to save payment. Check console.");
        return false;
      }
      console.log("[FIX] payment saved", paymentObj);

      // Update student fees based on the new payment
      console.log("[FIX] Updating student fees for student:", selectedStudentId);
      try {
        await dataManager.updateStudentFees(selectedStudentId, amount);
        console.log("[FIX] Student fees updated successfully");
      } catch (feeUpdateError) {
        console.error("[FIX] Failed to update student fees:", feeUpdateError);
        alert("Payment saved but failed to update student fees. Please refresh the page.");
      }

      // Add a small delay to ensure Firebase has processed both updates
      await new Promise(resolve => setTimeout(resolve, 150));

      // 11) refresh UI (replace with your actual refresh functions)
      console.log("[FIX] Refreshing UI");
      await fetchData(); // Wait for data to be fetched
      
      // Add another small delay to ensure UI has updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      window.dispatchEvent(new Event('studentsUpdated'));
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      window.dispatchEvent(new CustomEvent('paymentsRefresh'));
      window.dispatchEvent(new Event('paymentAdded'));

      // 12) done
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: editingPaymentId ? "Payment updated and student updated successfully" : "Payment added and student updated successfully" }
      }));
      console.log("[FIX] done");
      return true;

    } catch (err) {
      console.error("[FIX] exception:", err);
      alert("Unexpected error. See console.");
      return false;
    }
  }
  // ======= End handler =======

  const handleAddPayment = () => {
    setEditingPayment(null);
    setFormData({
      studentId: '',
      amount: '',
      dueDate: '',
      description: '',
      method: 'Cash' // Add default payment method
    });
    setShowForm(true);
  };

  const handlePrintPayment = async (payment) => {
    // Get current date for receipt generation
    const receiptDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Get student information for fee details
    let studentInfo = null;
    try {
      studentInfo = await dataManager.getStudentById(payment.studentId);
    } catch (error) {
      console.error('Error fetching student info for receipt:', error);
    }
    
    // Format amount in words
    const formatAmountInWords = (amount) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                   'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                   'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (amount === 0) return 'Zero Rupees Only';
      
      let words = '';
      let num = Math.floor(amount);
      
      if (num >= 100000) {
        words += ones[Math.floor(num/100000)] + ' Lakh ';
        num %= 100000;
      }
      
      if (num >= 1000) {
        words += ones[Math.floor(num/1000)] + ' Thousand ';
        num %= 1000;
      }
      
      if (num >= 100) {
        words += ones[Math.floor(num/100)] + ' Hundred ';
        num %= 100;
      }
      
      if (num >= 20) {
        words += tens[Math.floor(num/10)] + ' ';
        num %= 10;
      }
      
      if (num > 0) {
        words += ones[num];
      }
      
      return words.trim() + ' Rupees Only';
    };
    
    const amountInWords = formatAmountInWords(parseFloat(payment.amount || 0));
    
    // Enhanced print functionality with professional receipt design
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Receipt - ${payment.studentName}</title>
          <style>
            @media print {
              @page { margin: 0; size: A4; }
              body { margin: 0.5cm; }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 10px;
              color: var(--text-primary);
              line-height: 1.3;
              font-size: 13px;
              position: relative;
            }
            
            .receipt-container {
              border: 1px solid var(--info-color); /* Blue for neutral info */
              border-radius: 8px;
              padding: 15px;
              background: white;
              position: relative;
              overflow: hidden;
              box-shadow: none;
            }
            
            .receipt-container::before {
              content: "ORIGINAL COPY";
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 36px;
              font-weight: bold;
              color: rgba(78, 115, 223, 0.05);
              pointer-events: none;
              z-index: 0;
            }
            
            .receipt-header {
              text-align: center;
              border-bottom: 2px double var(--info-color); /* Blue for neutral info */
              padding-bottom: 10px;
              margin-bottom: 15px;
              position: relative;
              background: linear-gradient(135deg, #e3f2fd, #bbdefb);
              border-radius: 6px;
              margin: -15px -15px 15px -15px;
              padding: 15px;
              border-bottom: 2px solid var(--info-color);
            }
            
            .receipt-logo {
              max-width: 80px;
              height: auto;
              margin-bottom: 10px;
            }
            
            .school-logo {
              font-size: 20px;
              margin-bottom: 8px;
              color: var(--info-color); /* Blue for neutral info */
}

.school-name {
  font-size: 20px;
  font-weight: bold;
  color: var(--info-color-darker);
  margin: 2px 0;
}

.school-address {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.receipt-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--danger-color); /* Red for alert/drop */
  margin: 10px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(90deg, var(--info-color), var(--info-color-darker));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.receipt-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.detail-item {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 3px;
  font-weight: 600;
}

.detail-value {
  font-weight: 700;
  color: var(--info-color-darker); /* Blue for neutral info */
  font-size: 14px;
  background: white;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.amount-section {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  border: 1px solid #dee2e6;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.amount-row.total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 16px;
  padding-top: 8px;
  border-top: 2px solid var(--info-color);
  margin-top: 8px;
  color: var(--info-color-darker);
}

.amount-in-words {
  margin: 15px 0;
  padding: 10px;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-radius: 6px;
  font-style: italic;
  font-weight: 500;
  border: 1px solid #90caf9;
  text-align: center;
  color: #1976d2;
  font-size: 12px;
}

.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px dashed var(--info-color);
}

.signature-box {
  text-align: center;
  width: 45%;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.signature-line {
  margin-top: 25px;
  border-top: 1px solid var(--text-primary);
  padding-top: 5px;
  color: var(--text-secondary);
  font-size: 12px;
}

/* Official Section for Signature and Stamp */
.official-section {
  margin: 20px 0 15px;
  padding: 15px 0;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.official-content {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
}

.official-item {
  text-align: center;
  flex: 1;
  min-width: 100px;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.official-label {
  font-size: 11px;
  color: var(--info-color-darker);
  margin-bottom: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.official-image {
  max-width: 80px;
  max-height: 80px;
  object-fit: contain;
}

.signature-preview {
  /* Signature-specific styling if needed */
}

.stamp-preview {
  /* Stamp-specific styling if needed */
}

.footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 15px;
  font-size: 12px;
  color: var(--text-secondary);
  border-top: 1px solid #e9ecef;
}

.note {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border: 1px solid #ffd54f;
  border-radius: 6px;
  padding: 10px;
  margin: 15px 0;
  font-size: 12px;
  text-align: center;
  font-weight: 500;
  color: #e65100;
}

@media (max-width: 500px) {
  .receipt-details {
    grid-template-columns: 1fr;
  }
  
  .signature-section {
    flex-direction: column;
    gap: 30px;
  }
  
  .signature-box {
    width: 100%;
  }
  
  .official-content {
    flex-direction: column;
    align-items: center;
    gap: 25px;
  }
  
  .official-item {
    width: 100%;
  }
}

          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="school-logo">🏫</div>
              <div class="school-name">${firmName}</div>
              <div class="school-address">${firmAddress}</div>
              <div class="receipt-title">Fee Receipt</div>
            </div>
            
            <div class="receipt-details">
              <div class="detail-item">
                <span class="detail-label">Receipt No.</span>
                <span class="detail-value">${payment.id || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date</span>
                <span class="detail-value">${receiptDate}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Student Name</span>
                <span class="detail-value">${payment.studentName || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Student ID</span>
                <span class="detail-value">${payment.studentId || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Class</span>
                <span class="detail-value">${payment.studentClass || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Description</span>
                <span class="detail-value">${payment.description || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${payment.method || 'Cash'}</span>
              </div>

              ${studentInfo ? `
              <div class="detail-item">
                <span class="detail-label">Total Fees</span>
                <span class="detail-value">₹${parseFloat(studentInfo.totalFees || 0).toFixed(2)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fees Paid (This Payment)</span>
                <span class="detail-value">₹${parseFloat(payment.amount || 0).toFixed(2)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Fees Paid (Cumulative)</span>
                <span class="detail-value">₹${parseFloat(studentInfo.feesPaid || 0).toFixed(2)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pending Fees</span>
                <span class="detail-value">₹${parseFloat((studentInfo.totalFees - studentInfo.feesPaid) || 0).toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="amount-section">
              <div class="amount-row">
                <span>Amount Paid (This Receipt):</span>
                <span>₹${parseFloat(payment.amount || 0).toFixed(2)}</span>
              </div>
              ${studentInfo ? `
              <div class="amount-row">
                <span>Total Fees Paid (Cumulative):</span>
                <span>₹${parseFloat(studentInfo.feesPaid || 0).toFixed(2)}</span>
              </div>
              <div class="amount-row">
                <span>Total Fees:</span>
                <span>₹${parseFloat(studentInfo.totalFees || 0).toFixed(2)}</span>
              </div>
              <div class="amount-row">
                <span>Pending Fees:</span>
                <span>₹${parseFloat((studentInfo.totalFees - studentInfo.feesPaid) || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="amount-row total">
                <span>Balance Due:</span>
                <span>₹${studentInfo ? parseFloat((studentInfo.totalFees - studentInfo.feesPaid) || 0).toFixed(2) : '0.00'}</span>
              </div>
            </div>
            
            <div class="amount-in-words">
              Amount in Words: ${amountInWords}
            </div>
            
            <div class="note">
              <strong>Note:</strong> This is a computer-generated receipt and does not require a signature.
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div>Cashier Signature</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <div>Parent/Guardian</div>
                <div class="signature-line"></div>
              </div>
            </div>
            
            <!-- Academy Signature and Stamp Section -->
            <div class="official-section">
              ${signatureUrl || stampUrl ? `
              <div class="official-content">
                ${signatureUrl ? `
                <div class="official-item">
                  <div class="official-label">Authorized Signature:</div>
                  <img src="${signatureUrl}" alt="Authorized Signature" class="official-image signature-preview" />
                </div>
                ` : ''}
                ${stampUrl ? `
                <div class="official-item">
                  <div class="official-label">Official Seal:</div>
                  <img src="${stampUrl}" alt="Official Stamp" class="official-image stamp-preview" />
                </div>
                ` : ''}
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              Thank you for your payment! For any queries, contact us at info@victorypointacademy.edu
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              // Close window after print dialog is closed
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Load branding data from Firestore with real-time listener
  const loadBrandingDataFromFirestore = () => {
    if (!isAuthenticated()) return;
    
    try {
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(settingsDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.firmName && data.firmName.trim() !== '') {
            setFirmName(data.firmName);
          } else {
            setFirmName('Your Academy');
          }
          
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
          }
          
          if (data.firmAddress) {
            setFirmAddress(data.firmAddress);
          } else {
            setFirmAddress('Chinchpada, Airoli, Navi Mumbai - 400708');
          }
          
          if (data.signatureUrl) {
            setSignatureUrl(data.signatureUrl);
          }
          
          if (data.stampUrl) {
            setStampUrl(data.stampUrl);
          }
        } else {
          setFirmName('Your Academy');
          setFirmAddress('Chinchpada, Airoli, Navi Mumbai - 400708');
        }
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading branding data:', error);
    }
  };

  // Helper function to get unique months from payments
  const getUniqueMonths = () => {
    const months = payments.map(payment => {
      if (!payment.dueDate) return null;
      const date = new Date(payment.dueDate);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }).filter(Boolean);
    
    return [...new Set(months)].sort((a, b) => {
      const dateA = new Date(`01 ${a}`);
      const dateB = new Date(`01 ${b}`);
      return dateB - dateA; // Sort descending
    });
  };

  // Helper function to get status info for display
  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { text: 'Paid', color: 'var(--success-color)' }; // Green for success/collected
      case 'pending':
        return { text: 'Pending', color: 'var(--warning-color)' }; // Orange for pending
      case 'overdue':
        return { text: 'Overdue', color: 'var(--danger-color)' }; // Red for alert/drop
      case 'not started':
        return { text: 'Not Started', color: 'var(--info-color)' };
      default:
        return { text: 'Unknown', color: 'var(--info-color)' };
    }
  };

  // Calculate totals for summary cards
  const calculateTotals = () => {
    // Update total collected based on total paid fees from students
    const totalCollected = students.reduce((sum, student) => {
      return sum + (parseFloat(student.feesPaid) || 0);
    }, 0);
    
    // Calculate total fees from all students
    const totalFees = students.reduce((sum, student) => {
      return sum + (parseFloat(student.totalFees) || 0);
    }, 0);
    
    // Update pending fees = total Fees - Total Collected
    const pendingFees = totalFees - totalCollected;
    
    const totalStudents = students.length;
    
    // Calculate paid students (students with status 'Paid')
    const paidStudents = students.filter(student => student.status?.toLowerCase() === 'paid').length;
    
    // Calculate pending payments using the formula: total fees - total collected
    const pendingPayments = totalFees - totalCollected;
    
    // Calculate overdue amount (payments with status 'overdue')
    const overdueAmount = payments.reduce((sum, payment) => {
      return sum + (payment.status?.toLowerCase() === 'overdue' ? parseFloat(payment.amount || 0) : 0);
    }, 0);
    
    return {
      totalCollected,
      pendingFees,
      totalStudents,
      totalFees,
      paidStudents,
      pendingPayments,
      overdueAmount
    };
  };
  const totals = calculateTotals();

  if (loading) {
    return (
      <RootLayout>
        <div className="fees-container">
          <div className="fees-header">
            <div className="header-content">
              <div className="header-left">
                <div className="skeleton-header" style={{ width: '200px', height: '40px', marginBottom: '10px' }}></div>
                <div className="skeleton-bar" style={{ width: '300px', height: '24px', marginTop: '10px' }}></div>
              </div>
              <div className="header-right">
                <div className="header-actions">
                  <div className="skeleton-bar" style={{ width: '120px', height: '40px', marginRight: '10px' }}></div>
                  <div className="skeleton-bar" style={{ width: '120px', height: '40px' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="search-filters">
            <div className="search-container">
              <div className="skeleton-header" style={{ width: '100%', height: '44px', borderRadius: '12px' }}></div>
            </div>
            
            <div className="filter-container">
              <div className="skeleton-bar" style={{ width: '100px', height: '40px', borderRadius: '8px' }}></div>
            </div>
          </div>
          
          <div className="kpi-skeleton-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
          
          <div className="table-skeleton">
            <div className="skeleton-header"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-row"></div>
            ))}
          </div>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout>
      <div className="fees-container">
        <div className="fees-header">
          <div className="header-left">
            <h1>Fee Management</h1>
          </div>
          <div className="header-right">
            <button className="add-btn" onClick={handleAddPayment}>
              Add Payment
            </button>
          </div>
        </div>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: 'var(--info-color)', color: 'var(--info-color)' }}>
            💰
          </div>
          <div className="card-content">
            <div className="card-title">Total Collected</div>
            <div className="card-value">₹{totals.totalCollected.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: 'var(--warning-color)', color: 'var(--warning-color)' }}>
            ⏳
          </div>
          <div className="card-content">
            <div className="card-title">Pending Payments</div>
            <div className="card-value">₹{Math.max(totals.pendingPayments, 0).toLocaleString()}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: 'var(--success-color)', color: 'var(--success-color)' }}>
            📊
          </div>
          <div className="card-content">
            <div className="card-title">Total Fees</div>
            <div className="card-value">₹{totals.totalFees.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search payments..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="filters">
          <select 
            className="filter-select"
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
          >
            <option value="all">All Students</option>
            {students.map(student => (
              <option key={student.id} value={student.studentId}>
                {student.name} ({student.studentId})
              </option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {getUniqueMonths().map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h2>{editingPayment ? 'Edit Payment' : 'Add New Payment'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Student</label>
                <select
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                  disabled={editingPayment}
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.studentId}>
                      {student.name} ({student.studentId}) - Class {student.class}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Amount (₹)</label>
                <div className="amount-method-container">
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className={amountExceedsFees ? 'amount-exceeds' : ''}
                    style={{ flex: 1, marginRight: '10px' }}
                  />
                  <select
                    name="method"
                    value={formData.method}
                    onChange={handleInputChange}
                    className="method-select"
                    style={{ flex: 1, maxWidth: '150px' }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter payment description (optional)"
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : (editingPayment ? 'Update Payment' : 'Add Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No payments found. Add a new payment to get started.
                </td>
              </tr>
            ) : (
              filteredPayments.map(payment => {
                const statusInfo = getStatusInfo(payment.status);
                
                return (
                  <tr key={payment.id} className="payment-row">
                    <td>
                      <div className="student-name">{payment.studentName}</div>
                      <div className="student-id">{payment.studentId} • {payment.studentClass}</div>
                    </td>
                    <td>₹{parseFloat(payment.amount || 0).toLocaleString()}</td>
                    <td>{formatDisplayDate(payment.dueDate)}</td>
                    <td>{payment.description || '-'}</td>
                    <td>
                      <span 
                        className="status-chip" 
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>{formatDisplayDate(payment.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="print-btn"
                          onClick={async () => {
                            try {
                              await handlePrintPayment(payment);
                            } catch (error) {
                              console.error('Error printing receipt:', error);
                              alert('Error generating receipt. Please try again.');
                            }
                          }}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    </RootLayout>
  );
};

export default Fees;
