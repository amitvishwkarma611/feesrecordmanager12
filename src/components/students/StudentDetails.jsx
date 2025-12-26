import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dataManager from '../../utils/dataManager';
import { uploadStudentPhoto, testStorageConnection } from '../../services/firebaseService';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';
import './StudentDetails.css';

const StudentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [firmName, setFirmName] = useState('Victory Point Academy');

  // Fetch firm name from user settings
  useEffect(() => {
    const fetchFirmName = async () => {
      if (isAuthenticated()) {
        try {
          const uid = getCurrentUserUID();
          const settingsDoc = doc(db, `users/${uid}/settings/profile`);
          const settingsSnapshot = await getDoc(settingsDoc);
          
          if (settingsSnapshot.exists()) {
            const data = settingsSnapshot.data();
            if (data.firmName) {
              setFirmName(data.firmName);
            }
          }
        } catch (error) {
          console.error('Error fetching firm name:', error);
        }
      }
    };
    
    fetchFirmName();
  }, []);
  
  // Test Firebase Storage connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Firebase Storage connection on component mount...');
        const isConnected = await testStorageConnection();
        console.log('Firebase Storage connection test result:', isConnected);
      } catch (error) {
        console.error('Error during storage connection test:', error);
      }
    };
    
    testConnection();
  }, []);

  // Helper function to format dates properly
  const formatDate = (date) => {
    try {
      // Handle Firebase Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // Handle Date objects
      if (date instanceof Date) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // Handle string dates
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // Handle numeric timestamps
      if (typeof date === 'number') {
        // Check if it's seconds or milliseconds
        if (date > 10000000000) {
          // Milliseconds
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } else {
          // Seconds
          return new Date(date * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Helper function to get student avatar initials
  const getStudentInitials = (name) => {
    if (!name) return 'ST';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // Fetch student payments
  const fetchStudentPayments = async (studentId) => {
    try {
      setLoadingPayments(true);
      const allPayments = await dataManager.getPayments();
      const studentPayments = allPayments.filter(payment => payment.studentId === studentId);
      
      // Sort payments by creation date (newest first)
      const sortedPayments = studentPayments.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?.seconds * 1000 || a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?.seconds * 1000 || b.createdAt);
        return dateB - dateA;
      });
      
      setPayments(sortedPayments);
    } catch (err) {
      console.error('Error fetching student payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);
        const studentData = location.state?.student;
        
        if (studentData) {
          setStudent(studentData);
          // Set photo preview if student already has a photo URL
          if (studentData.photoURL) {
            setPhotoPreview(studentData.photoURL);
          }
          fetchStudentPayments(studentData.studentId || studentData.id);
        } else {
          // If no student data in state, try to get from URL params
          const urlParams = new URLSearchParams(window.location.search);
          const studentId = urlParams.get('id');
          
          if (studentId) {
            const student = await dataManager.getStudentById(studentId);
            if (student) {
              setStudent(student);
              // Set photo preview if student already has a photo URL
              if (student.photoURL) {
                setPhotoPreview(student.photoURL);
              }
              fetchStudentPayments(studentId);
            } else {
              setError('Student not found');
            }
          } else {
            setError('No student data provided');
          }
        }
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError('Error loading student details');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [location.state]);

  // Separate effect for handling student updates
  useEffect(() => {
    const handleStudentsUpdated = async () => {
      // Always try to refresh student data when studentsUpdated event is fired
      try {
        // Try to get updated student data by studentId first, then by id
        const studentIdToUse = student?.studentId || student?.id;
        if (studentIdToUse) {
          const updatedStudent = await dataManager.getStudentById(studentIdToUse);
          if (updatedStudent) {
            setStudent(updatedStudent);
            // Set photo preview if student has a photo URL
            if (updatedStudent.photoURL) {
              setPhotoPreview(updatedStudent.photoURL);
            }
            fetchStudentPayments(studentIdToUse);
          }
        }
      } catch (err) {
        console.error('Error refreshing student details:', err);
      }
    };
    
    const handleStudentUpdated = (event) => {
      // Handle the custom studentUpdated event
      if (event.detail && event.detail.student) {
        const updatedStudent = event.detail.student;
        const currentStudentId = student?.studentId || student?.id;
        const updatedStudentId = updatedStudent.studentId || updatedStudent.id;
        
        // Only update if it's the same student
        if (currentStudentId === updatedStudentId) {
          setStudent(updatedStudent);
          // Set photo preview if student has a photo URL
          if (updatedStudent.photoURL) {
            setPhotoPreview(updatedStudent.photoURL);
          }
          fetchStudentPayments(updatedStudentId);
        }
      }
    };
    
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    window.addEventListener('studentUpdated', handleStudentUpdated);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
      window.removeEventListener('studentUpdated', handleStudentUpdated);
    };
  }, [student]); // Keep student in dependency array to ensure we're checking the right student

  const calculateStudentStatus = (student) => {
    const totalFees = parseFloat(student.totalFees) || 0;
    const feesPaid = parseFloat(student.feesPaid) || 0;
    
    if (feesPaid >= totalFees) {
      return "Paid";
    } else if (feesPaid > 0) {
      return "Pending";
    } else {
      return "Not Started";
    }
  };

  const handleBack = () => {
    navigate('/students');
  };

  const handleEdit = () => {
    // Navigate to edit student page
    navigate('/students', { state: { editingStudent: student } });
  };

  const handlePrint = () => {
    // Create a print-specific version of the student profile with watermark
    const printContent = document.querySelector('.student-profile-card');
    if (!printContent) {
      console.error('Print content not found');
      return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    // Create comprehensive print styles
    const printStyles = `
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 1cm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Times New Roman', serif; 
            color: black; 
          }
          .student-profile-card { 
            max-width: 90%; 
            margin: 0 auto; 
            padding: 15px; 
            box-shadow: none; 
            background: white; 
            font-size: 11px; /* Professional font size */
          }
          .photo-upload-section { 
            display: none; 
          }
          .upload-photo-btn { 
            display: none; 
          }
          .upload-success-message { 
            display: none; 
          }
          .watermark-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            pointer-events: none;
            z-index: 1000;
            opacity: 0.05;
            font-size: 5em;
            color: #cccccc;
            font-weight: bold;
            text-align: center;
          }
          .student-photo-preview {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 10px;
            display: block;
            border: 1px solid #ddd;
          }
          .photo-preview img {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
          }
          .student-header {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #4e73df; /* Professional border */
          }
          .student-basic-info {
            flex: 1;
          }
          .student-basic-info h2 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #2c3e50;
            font-weight: bold;
            text-transform: uppercase;
          }
          .student-id, .student-class {
            font-size: 12px;
            margin: 4px 0;
            font-weight: bold;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .summary-card {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 0;
            background: #f8f9fa;
          }
          .summary-card-title {
            font-size: 10px;
            margin-bottom: 5px;
            color: #495057;
            font-weight: bold;
          }
          .summary-card-value {
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
          }
          .payment-progress-section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #f8f9fa;
          }
          .payment-progress-section h3 {
            font-size: 14px;
            margin: 0 0 12px 0;
            color: #2c3e50;
            font-weight: bold;
          }
          .progress-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .progress-bar {
            height: 12px;
            background-color: #e9ecef;
            border-radius: 6px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4e73df, #224abe);
            border-radius: 6px;
          }
          .progress-text {
            font-size: 11px;
            font-weight: bold;
            color: #495057;
          }
          .personal-info-section, .system-info-section {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            page-break-inside: avoid;
          }
          .personal-info-section h3, .system-info-section h3 {
            padding: 12px 15px;
            margin: 0;
            font-size: 14px;
            background: #4e73df;
            color: white;
          }
          .personal-info-content, .system-info-content {
            padding: 15px;
          }
          .info-category {
            margin-bottom: 15px;
          }
          .info-category h4 {
            font-size: 12px;
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-weight: bold;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 5px;
          }
          .student-details-grid, .contact-info-grid, .family-info-grid, .system-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
          }
          .student-detail-item, .contact-detail-item, .family-detail-item, .system-item {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .student-detail-item label, .contact-detail-item label, .family-detail-item label, .system-item label {
            display: block;
            font-weight: bold;
            margin-bottom: 3px;
            font-size: 10px;
            color: #495057;
          }
          .student-detail-item span, .contact-detail-item span, .family-detail-item span, .system-item span {
            display: block;
            padding: 6px;
            background: #ffffff;
            border-radius: 4px;
            font-size: 11px;
            border: 1px solid #dee2e6;
            min-height: 20px;
          }
          .payments-table {
            overflow-x: auto;
            margin-top: 10px;
          }
          .payments-table table {
            width: 100%;
            border-collapse: collapse;
          }
          .payments-table th,
          .payments-table td {
            padding: 8px;
            text-align: left;
            border: 1px solid #dee2e6;
            font-size: 10px;
          }
          .payments-table th {
            background-color: #e9ecef;
            font-weight: bold;
            color: #495057;
          }
          .payments-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
          }
          .status-paid {
            background: #d4edda;
            color: #155724;
          }
          .status-pending {
            background: #fff3cd;
            color: #856404;
          }
          .status-overdue {
            background: #f8d7da;
            color: #721c24;
          }
          .status-not-started {
            background: #d1ecf1;
            color: #0c5460;
          }
          .print-only {
            display: block !important;
          }
          /* Ensure single page layout */
          .student-profile-card {
            display: block;
            width: 100%;
            overflow: hidden;
          }
          .details-section {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      </style>
    `;
    
    // Create watermark container
    const watermarkHtml = `
      <div class="watermark-container">
        ${firmName}
      </div>
    `;
    
    // Get current content
    const content = printContent.innerHTML;
    
    // Write print content with watermark and styles
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Profile - ${student.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${printStyles}
        </head>
        <body>
          ${watermarkHtml}
          <div class="student-profile-card">
            ${content}
          </div>
          <script>
            // Add delay to ensure content renders before printing
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    console.log('File selected:', file);
    
    if (file) {
      // Reset success state
      setUploadSuccess(false);
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        console.log('File type not supported:', file.type);
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('File too large:', file.size);
        alert('File size exceeds 5MB limit');
        return;
      }
      
      console.log('File validation passed');
      
      // Set the photo preview
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File read complete');
        setPhotoPreview(e.target.result);
      };
      reader.onerror = (e) => {
        console.error('Error reading file:', e);
      };
      reader.readAsDataURL(file);
      
      // Set the file for upload
      setStudentPhoto(file);
      
      // Upload the photo to Firebase Storage
      try {
        console.log('Starting upload process...');
        setUploading(true);
        
        // Ensure we have a student and student ID
        if (!student) {
          throw new Error('No student data available');
        }
        
        console.log('Student data available:', student);
        
        // Ensure student ID is a string as required by Firebase
        const studentId = String(student.studentId || student.id);
        console.log('Student ID for upload:', studentId);
        
        if (!studentId) {
          throw new Error('No valid student ID available');
        }
        
        console.log('Calling uploadStudentPhoto function...');
        const photoURL = await uploadStudentPhoto(studentId, file);
        
        // Update student data with photo URL
        console.log('Photo uploaded successfully:', photoURL);
        
        // Update the student object with the photo URL
        const updatedStudent = {
          ...student,
          photoURL: photoURL
        };
        
        // Update student in Firebase
        await dataManager.updateStudent(updatedStudent);
        
        // Update local state
        setStudent(updatedStudent);
        setPhotoPreview(photoURL);
        setUploadSuccess(true);
        setUploading(false); // Reset uploading state immediately on success
        
        // Keep success state for 3 seconds
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('Error uploading photo:', error);
        console.error('Error details:', error.message, error.name, error.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // More user-friendly error messages
        let errorMessage = 'Error uploading photo. Please try again.';
        if (error.code) {
          switch (error.code) {
            case 'storage/unauthorized':
              errorMessage = 'Unauthorized: Check your Firebase Storage permissions.';
              break;
            case 'storage/canceled':
              errorMessage = 'Upload canceled.';
              break;
            case 'storage/unknown':
              errorMessage = 'Unknown error occurred during upload.';
              break;
            default:
              errorMessage = `Error: ${error.message || error.code}`;
          }
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
        
        alert(errorMessage);
        setUploading(false); // Make sure to reset uploading state on error
      }
    } else {
      console.log('No file selected');
    }
  };

  if (loading) {
    return <div className="loading">Loading student details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={handleBack} className="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path></path>
            <path></path>
          </svg>
          Back to Students
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="error-container">
        <div className="error-message">No student data available</div>
        <button onClick={handleBack} className="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path></path>
            <path></path>
          </svg>
          Back to Students
        </button>
      </div>
    );
  }

  const status = calculateStudentStatus(student);
  const pendingFees = (parseFloat(student.totalFees) || 0) - (parseFloat(student.feesPaid) || 0);
  const totalFees = parseFloat(student.totalFees) || 0;
  const feesPaid = parseFloat(student.feesPaid) || 0;
  
  // Calculate payment progress percentage
  const paymentProgress = totalFees > 0 ? Math.round((feesPaid / totalFees) * 100) : 0;

  return (
    <div className="student-details-container">
      <div className="details-header">
        <button onClick={handleBack} className="back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path></path>
            <path></path>
          </svg>
          Back to Students
        </button>
        <h1>Student Profile</h1>
        <div className="header-buttons">
          <button onClick={handlePrint} className="print-button">Print Profile</button>
          <button onClick={handleEdit} className="edit-button">Edit Student</button>
        </div>
      </div>
      
      <div className="student-profile-card">
        {/* Student Header with Photo Section */}
        <div className="student-header">
          <div className="student-avatar-container">
            {/* Photo Upload Section */}
            <div className="photo-upload-section">
              <div className="photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="student-photo-preview" />
                ) : (
                  <>
                    <div className="photo-placeholder">📷</div>
                    <span className="photo-label">Upload Photo</span>
                  </>
                )}
              </div>
              <label className={`upload-photo-btn ${uploading ? 'uploading' : ''}`}>
                {uploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : 'Choose File'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }} 
                  disabled={uploading}
                />
              </label>
              {uploadSuccess && (
                <div className="upload-success-message">
                  Photo uploaded successfully!
                </div>
              )}
            </div>
          </div>
          <div className="student-basic-info">
            <h2>{student.name}</h2>
            <div className="student-id">ID: {student.studentId || student.id}</div>
            <div className="student-class">Class: {student.class}</div>
            <span className={`status-badge status-${status.toLowerCase().replace(' ', '-')}`}>
              {status === "Pending" ? "⏳ Pending" : status === "Paid" ? "✔️ Paid" : "🆕 Not Started"}
            </span>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-title">Total Fees</div>
            <div className="summary-card-value fee-total">{formatCurrency(totalFees)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Fees Paid</div>
            <div className="summary-card-value fee-paid">{formatCurrency(feesPaid)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">Pending Fees</div>
            <div className="summary-card-value fee-pending">{formatCurrency(pendingFees)}</div>
          </div>
          {student.feesStructure && (
            <div className="summary-card">
              <div className="summary-card-title">Fee Structure</div>
              <div className="summary-card-value fee-structure">{student.feesStructure}</div>
            </div>
          )}
        </div>
        
        {/* Payment Progress Bar */}
        <div className="payment-progress-section">
          <h3>Payment Progress</h3>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${paymentProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">{paymentProgress}% Complete</div>
          </div>
        </div>
        
        {/* Personal Information Section */}
        <div className="personal-info-section">
          <h3>Personal Information</h3>
          <div className="personal-info-content">
            {/* Student Details Subsection */}
            <div className="info-category">
              <h4>Student Details</h4>
              <div className="student-details-grid">
                <div className="student-detail-item">
                  <label>Full Name</label>
                  <span>{student.name}</span>
                </div>
                
                <div className="student-detail-item">
                  <label>Student ID</label>
                  <span>{student.studentId || student.id}</span>
                </div>
                
                <div className="student-detail-item">
                  <label>Class</label>
                  <span>{student.class}</span>
                </div>
                
                {student.feesStructure && (
                  <div className="student-detail-item">
                    <label>Fee Structure</label>
                    <span>{student.feesStructure}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Address Information Subsection */}
            {student.address && (
              <div className="info-category">
                <h4>Address Information</h4>
                <div className="address-detail-item">
                  <label>Address</label>
                  <span className="address-value">{student.address}</span>
                </div>
              </div>
            )}

            {/* Contact Information Subsection */}
            <div className="info-category">
              <h4>Contact Information</h4>
              <div className="contact-info-grid">
                <div className="contact-detail-item">
                  <label>Contact Number</label>
                  <span>{student.contact || 'N/A'}</span>
                </div>
                
                {student.email && (
                  <div className="contact-detail-item">
                    <label>Email Address</label>
                    <span>{student.email}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Family Information Subsection */}
            {(student.fatherName || student.motherName) && (
              <div className="info-category">
                <h4>Family Information</h4>
                <div className="family-info-grid">
                  {student.fatherName && (
                    <div className="family-detail-item">
                      <label>Father's Name</label>
                      <span>{student.fatherName}</span>
                    </div>
                  )}
                  
                  {student.motherName && (
                    <div className="family-detail-item">
                      <label>Mother's Name</label>
                      <span>{student.motherName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* System Information Section */}
        <div className="system-info-section">
          <h3>System Information</h3>
          <div className="system-info-content">
            <div className="system-grid">
              <div className="system-item">
                <label>Created At</label>
                <span>
                  {student.createdAt 
                    ? formatDate(student.createdAt)
                    : 'N/A'
                  }
                </span>
              </div>
              
              <div className="system-item">
                <label>Last Updated</label>
                <span>
                  {student.updatedAt 
                    ? formatDate(student.updatedAt)
                    : 'N/A'
                  }
                </span>
              </div>
              
              <div className="system-item">
                <label>Database ID</label>
                <span>{student.id}</span>
              </div>
              
              {student.studentId && student.id !== student.studentId && (
                <div className="system-item">
                  <label>Student ID (Display)</label>
                  <span>{student.studentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Payment History Section */}
        <div className="details-section">
          <h3>Payment History</h3>
          {loadingPayments ? (
            <div className="loading">Loading payment history...</div>
          ) : payments.length === 0 ? (
            <div className="no-payments">No payment history available</div>
          ) : (
            <div className="payments-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>{payment.description || 'Payment'}</td>
                      <td className="amount">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`status-badge status-${payment.status}`}>
                          {payment.status === 'paid' ? '✔️ Paid' : 
                           payment.status === 'pending' ? '⏳ Pending' : 
                           '⚠️ Overdue'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;