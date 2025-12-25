import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../../utils/dataManager';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import RootLayout from '../common/RootLayout';

import './Students.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Debugging: Log when showExportDropdown changes
  useEffect(() => {
    console.log('showExportDropdown changed:', showExportDropdown);
  }, [showExportDropdown]);
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    contact: '',
    email: '',
    address: '',
    fatherName: '',
    motherName: '',
    totalFees: '',
    feesPaid: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  
  // PIN lock state
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [tempClassFilter, setTempClassFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this state for anti-double-submit
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    
    // Listen for students updated event
    const handleStudentsUpdated = () => {
      fetchStudents();
    };
    
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    
    // Load PIN from localStorage
    const savedPin = localStorage.getItem('studentDeletePin');
    if (savedPin) {
      setStoredPin(savedPin);
    }
    
    return () => {
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
    };
  }, []);
  
  // Save PIN to localStorage when it changes
  useEffect(() => {
    if (storedPin) {
      localStorage.setItem('studentDeletePin', storedPin);
    }
  }, [storedPin]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchTerm, sortBy, sortOrder, classFilter]);

  // Handle clicks outside export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const fetchStudents = async () => {
    try {
      const studentsData = await dataManager.getStudents();
      setStudents(studentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  };

  const filterAndSortStudents = () => {
    let filtered = [...students];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.contact && student.contact.includes(searchTerm)) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply class filter
    if (classFilter) {
      filtered = filtered.filter(student => student.class.toLowerCase() === classFilter.toLowerCase());
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'class':
          aValue = a.class.toLowerCase();
          bValue = b.class.toLowerCase();
          break;
        case 'pending':
          aValue = (a.totalFees || 0) - (a.feesPaid || 0);
          bValue = (b.totalFees || 0) - (b.feesPaid || 0);
          break;
        case 'status':
          aValue = calculateStudentStatus(a);
          bValue = calculateStudentStatus(b);
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
    });
    
    setFilteredStudents(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for numeric fields
    if (name === 'totalFees' || name === 'feesPaid') {
      // For numeric fields, we want to allow empty values but validate numbers
      if (value === '' || value === null || value === undefined) {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }
      
      // Parse the value as a float
      const numValue = parseFloat(value);
      
      // If it's a valid number, use it; otherwise keep the original value
      if (!isNaN(numValue)) {
        setFormData(prev => ({
          ...prev,
          [name]: value // Keep as string to maintain input behavior
        }));
      } else {
        // If not a valid number, don't update
        return;
      }
    } else {
      // For non-numeric fields, use the value as-is
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== HANDLE SUBMIT START ===');
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Form is already submitting, ignoring duplicate submission');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Form data before processing:', formData);
      console.log('Editing student:', editingStudent);
      console.log('Is editing student:', !!editingStudent);
      console.log('Editing student ID:', editingStudent?.id);
      console.log('Editing student studentId:', editingStudent?.studentId);
      
      // Validate required fields
      if (!formData.name || !formData.class || formData.totalFees === '' || formData.totalFees === undefined) {
        const errorMsg = 'Please fill in all required fields: Name, Class, and Total Fees';
        console.log('Validation error:', errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
      
      // Validate numeric fields
      const totalFees = parseFloat(formData.totalFees);
      const feesPaid = parseFloat(formData.feesPaid) || 0;
      
      console.log('Parsed values:', { totalFees, feesPaid });
      
      if (isNaN(totalFees) || totalFees < 0) {
        const errorMsg = 'Please enter a valid total fees amount (must be a positive number)';
        console.log('Validation error:', errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
      
      if (isNaN(feesPaid) || feesPaid < 0) {
        const errorMsg = 'Please enter a valid fees paid amount (must be a positive number or zero)';
        console.log('Validation error:', errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
      
      // Ensure feesPaid doesn't exceed totalFees
      if (feesPaid > totalFees) {
        const errorMsg = 'Fees paid cannot exceed total fees';
        console.log('Validation error:', errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
      
      // Prepare student data
      const studentData = {
        ...formData,
        totalFees: totalFees,
        feesPaid: feesPaid,
        feesDue: totalFees - feesPaid
      };
      
      console.log('Student data to save:', studentData);
      
      // Save student data
      if (editingStudent) {
        console.log('Updating existing student');
        await dataManager.updateStudent(editingStudent.id, studentData);
      } else {
        console.log('Adding new student');
        
        await dataManager.addStudent(studentData);
      }
      
      // Reset form and refresh data
      setShowForm(false);
      setEditingStudent(null);
      setFormData({
        name: '',
        class: '',
        contact: '',
        email: '',
        address: '',
        fatherName: '',
        motherName: '',
        totalFees: '',
        feesPaid: ''
      });
      
      // Refresh student list
      await fetchStudents();
      
      // Show success message
      const successMessage = editingStudent 
        ? 'Student updated successfully!' 
        : 'Student added successfully!';
      
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: successMessage }
      }));
      
      console.log('=== HANDLE SUBMIT END SUCCESS ===');
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Please try again.');
      window.dispatchEvent(new CustomEvent('showError', {
        detail: { message: 'Error saving student. Please try again.' }
      }));
      console.log('=== HANDLE SUBMIT END ERROR ===');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNew = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      class: '',
      contact: '',
      email: '',
      address: '',
      fatherName: '',
      motherName: '',
      totalFees: '',
      feesPaid: ''
    });
    setShowForm(true);
  };

  const handleEdit = (student) => {
    console.log('Editing student:', student);
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      class: student.class || '',
      contact: student.contact || '',
      email: student.email || '',
      address: student.address || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      totalFees: student.totalFees !== undefined ? student.totalFees.toString() : '',
      feesPaid: student.feesPaid !== undefined ? student.feesPaid.toString() : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      // Check if PIN is set, if not, show PIN setup
      if (!storedPin) {
        setPendingDeleteId(studentId);
        setShowPinDialog(true);
        return;
      }
      
      // If PIN is set, proceed with PIN verification
      const enteredPin = prompt('Enter PIN to delete student:');
      if (enteredPin !== storedPin) {
        alert('Incorrect PIN. Delete operation cancelled.');
        return;
      }
      
      // Proceed with deletion
      await performDelete(studentId);
    }
  };
  
  // Actual delete implementation
  const performDelete = async (studentId) => {
    try {
      await dataManager.deleteStudent(studentId);
      await fetchStudents();
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: 'Student deleted successfully!' }
      }));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student. Please try again.');
      window.dispatchEvent(new CustomEvent('showError', {
        detail: { message: 'Error deleting student. Please try again.' }
      }));
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction) return;
    
    if (bulkAction === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected student(s)? This action cannot be undone.`)) {
        // Check if PIN is set, if not, show PIN setup
        if (!storedPin) {
          setPendingBulkDelete(true);
          setShowPinDialog(true);
          return;
        }
        
        // If PIN is set, proceed with PIN verification
        const enteredPin = prompt('Enter PIN to delete students:');
        if (enteredPin !== storedPin) {
          alert('Incorrect PIN. Delete operation cancelled.');
          return;
        }
        
        // Proceed with bulk deletion
        await performBulkDelete();
      }
    } else if (bulkAction === 'export') {
      exportStudents();
    } else if (bulkAction === 'export-pdf') {
      exportStudentsToPDF();
    }
  };
  
  // Actual bulk delete implementation
  const performBulkDelete = async () => {
    try {
      for (const studentId of selectedStudents) {
        await dataManager.deleteStudent(studentId);
      }
      setSelectedStudents([]);
      setBulkAction('');
      await fetchStudents();
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: `${selectedStudents.length} student(s) deleted successfully!` }
      }));
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Error deleting students. Please try again.');
      window.dispatchEvent(new CustomEvent('showError', {
        detail: { message: 'Error deleting students. Please try again.' }
      }));
    }
  };

  const exportStudents = () => {
    const csvContent = [
      ['Name', 'Class', 'Contact', 'Email', 'Address', 'Father Name', 'Mother Name', 'Total Fees', 'Fees Paid', 'Fees Due'],
      ...filteredStudents.map(student => [
        student.name,
        student.class,
        student.contact || '',
        student.email || '',
        student.address || '',
        student.fatherName || '',
        student.motherName || '',
        student.totalFees || 0,
        student.feesPaid || 0,
        (student.totalFees || 0) - (student.feesPaid || 0)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStudentsToPDF = () => {
    try {
      console.log('Starting PDF export function');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Students Report', 20, 20);
      
      // Add date
      const date = new Date().toLocaleDateString();
      doc.setFontSize(12);
      doc.text(`Generated on: ${date}`, 20, 30);
      
      // Check if we have data to export
      if (filteredStudents && filteredStudents.length > 0) {
        // Prepare table data
        const headers = [['Name', 'Class', 'Contact', 'Email', 'Total Fees', 'Fees Paid', 'Fees Due']];
        
        // Map student data to table rows
        const data = filteredStudents.map(student => [
          student.name || 'N/A',
          student.class || 'N/A',
          student.contact || 'N/A',
          student.email || 'N/A',
          student.totalFees ? `₹${Number(student.totalFees).toLocaleString()}` : '₹0',
          student.feesPaid ? `₹${Number(student.feesPaid).toLocaleString()}` : '₹0',
          student.totalFees && student.feesPaid ? 
            `₹${Number(student.totalFees - student.feesPaid).toLocaleString()}` : '₹0'
        ]);
        
        // Add table using autotable
        doc.autoTable({
          head: headers,
          body: data,
          startY: 40,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [52, 152, 219] }, // Blue header
          alternateRowStyles: { fillColor: [240, 240, 240] }, // Light gray alternate rows
          margin: { horizontal: 10 }
        });
      } else {
        doc.text('No student data available.', 20, 40);
      }
      
      // Save the PDF
      doc.save('students_export.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  const handleViewStudent = (student) => {
    navigate('/student-details', { state: { student } });
  };

  // Calculate student status
  const calculateStudentStatus = (student) => {
    const totalFees = parseFloat(student.totalFees) || 0;
    const feesPaid = parseFloat(student.feesPaid) || 0;
    const feesDue = totalFees - feesPaid;
    
    if (feesPaid === 0) {
      return "Not Started";
    } else if (feesDue <= 0) {
      return "Paid";
    } else {
      return "Pending";
    }
  };

  if (loading) {
    return <div className="loading">Loading students...</div>;
  }

  return (
    <RootLayout>
      <div className="students-container">
        <div className="students-header">
          <div className="header-left">
            <h1>Students Management</h1>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button className="add-btn" onClick={handleAddNew}>
                + Add Student
              </button>
            <div className="export-dropdown">
              <button 
                className="export-btn" 
                onClick={() => {
                  console.log('Export button clicked, current state:', showExportDropdown);
                  setShowExportDropdown(!showExportDropdown);
                }}
              >
                📤 Export ▼
              </button>
              {showExportDropdown && (
                <div className="export-dropdown-menu">
                  <button className="export-option" onClick={() => {
                    exportStudents();
                    setShowExportDropdown(false);
                  }}>
                    Export as CSV
                  </button>
                  <button className="export-option" onClick={() => {
                    console.log('PDF export button clicked');
                    exportStudentsToPDF();
                    setShowExportDropdown(false);
                  }}>
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search students by name, class, ID, contact or email..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        {/* Filter Button - Always visible */}
        <div className="filter-container">
          <button 
            className={`filter-btn ${classFilter ? 'active' : ''}`}
            onClick={() => {
              setTempClassFilter(classFilter);
              setShowFilterModal(true);
            }}
          >
            Filter {classFilter && `(${classFilter})`}
            {classFilter && (
              <span 
                className="clear-filter" 
                onClick={(e) => {
                  e.stopPropagation();
                  setClassFilter('');
                }}
              >
                ×
              </span>
            )}
          </button>
        </div>
        
        {/* Bulk Actions - Only visible when there are students */}
        {filteredStudents.length > 0 && (
          <div className="bulk-actions-container">
            <div className="bulk-actions">
              <input
                type="checkbox"
                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={handleSelectAll}
                className="select-all-checkbox"
              />
              <span className="bulk-label">
                {selectedStudents.length > 0 
                  ? `${selectedStudents.length} selected` 
                  : 'Select all'}
              </span>
              {selectedStudents.length > 0 && (
                <div className="bulk-action-controls">
                  <select 
                    value={bulkAction} 
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="bulk-action-select"
                  >
                    <option value="">Choose action...</option>
                    <option value="delete">Delete Selected</option>
                    <option value="export">Export Selected (CSV)</option>
                    <option value="export-pdf">Export Selected (PDF)</option>
                  </select>
                  <button 
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="bulk-action-btn"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Class *</label>
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Class</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Contact</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Full address"
                  className="address-input"
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Father's Name</label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Mother's Name</label>
                  <input
                    type="text"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Total Fees (₹) *</label>
                  <input
                    type="number"
                    name="totalFees"
                    value={formData.totalFees}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Fees Paid (₹) *</label>
                  <input
                    type="number"
                    name="feesPaid"
                    value={formData.feesPaid}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="form-overlay">
          <div className="form-container filter-modal">
            <div className="form-header">
              <h2>Filter by Class</h2>
              <button className="close-btn" onClick={() => setShowFilterModal(false)}>×</button>
            </div>
            <div className="filter-content">
              <div className="filter-options">
                {['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map((className) => (
                  <div 
                    key={className}
                    className={`filter-option ${tempClassFilter === className ? 'active' : ''}`}
                    onClick={() => setTempClassFilter(tempClassFilter === className ? '' : className)}
                  >
                    {className}
                  </div>
                ))}
              </div>
              <div className="filter-actions">
                <button className="clear-btn" onClick={() => {
                  setTempClassFilter('');
                  setClassFilter('');
                  setShowFilterModal(false);
                }}>
                  Clear
                </button>
                <button className="save-btn" onClick={() => {
                  setClassFilter(tempClassFilter);
                  setShowFilterModal(false);
                }}>
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Students Table */}
      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr className="students-table-grid">
              <th className="checkbox-header">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('name')}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('class')}>
                Class {sortBy === 'class' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Contact</th>
              <th>Total Fees</th>
              <th>Paid Fees</th>
              <th>Pending Fees</th>
              <th onClick={() => handleSort('status')}>
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr className="students-table-grid">
                <td colSpan="9" className="no-data-container">
                  <div className="no-data">
                    No students found. Add a new student to get started.
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => {
                const studentWithStatus = {
                  ...student,
                  status: calculateStudentStatus(student)
                };
                const pendingFees = (student.totalFees || 0) - (student.feesPaid || 0);
                
                return (
                  <tr key={student.id} className="student-row students-table-grid">
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="student-checkbox"
                      />
                    </td>
                    <td>
                      <div className="student-info">
                        <div className="student-name">{student.name}</div>
                        <div className="student-id">{student.studentId}</div>
                        {student.email && <div className="student-email">{student.email}</div>}
                      </div>
                    </td>
                    <td>{student.class}</td>
                    <td>
                      {student.contact && (
                        <div className="contact-info">
                          <div>{student.contact}</div>
                          {student.fatherName && <div className="parent-name">Father: {student.fatherName}</div>}
                        </div>
                      )}
                    </td>
                    <td>₹{parseFloat(student.totalFees || 0).toLocaleString()}</td>
                    <td>₹{parseFloat(student.feesPaid || 0).toLocaleString()}</td>
                    <td className="fee-pending">₹{pendingFees.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${studentWithStatus.status.toLowerCase().replace(' ', '-')}`}>
                        {
                          studentWithStatus.status === "Pending" 
                            ? "⏳ Pending" 
                            : studentWithStatus.status === "Paid"
                            ? "✔️ Paid"
                            : "🆕 Not Started"
                        }
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewStudent(student)}
                        >
                          View
                        </button>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(student)}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(student.id)}
                        >
                          Delete
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
      {/* PIN Setup Dialog */}
      {showPinDialog && (
        <div className="pin-dialog-overlay">
          <div className="pin-dialog">
            <h3>Set PIN for Student Deletion Protection</h3>
            <p>Enter a 4-digit PIN to protect student deletion:</p>
            <input
              type="password"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="pin-input"
            />
            <div className="pin-dialog-buttons">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                  setPendingDeleteId(null);
                  setPendingBulkDelete(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={() => {
                  if (pin.length === 4) {
                    setStoredPin(pin);
                    setShowPinDialog(false);
                    // Now proceed with the pending delete operation
                    if (pendingDeleteId) {
                      performDelete(pendingDeleteId);
                      setPendingDeleteId(null);
                    } else if (pendingBulkDelete) {
                      performBulkDelete();
                      setPendingBulkDelete(false);
                    }
                  } else {
                    alert('PIN must be 4 digits');
                  }
                }}
              >
                Set PIN & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RootLayout>
  );
};

export default Students;