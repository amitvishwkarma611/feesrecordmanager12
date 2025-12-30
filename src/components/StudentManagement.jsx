import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../utils/dataManager';
import { setStudentsList } from '../utils/dataStore';
import SkeletonLoader from './common/SkeletonLoader';
import '../styles/StudentManagement.css';

const StudentManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    class: '',
    contact: '',
    totalFees: ''
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [stats, setStats] = useState({
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this state for anti-double-submit

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

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('studentsUpdated', handleStudentsUpdated);
    
    // Cleanup listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('studentsUpdated', handleStudentsUpdated);
    };
  }, []);

  const refreshData = async () => {
    try {
      console.log('Refreshing student data...');
      // Load students from data manager
      const loadedStudents = await dataManager.getStudents();
      console.log('Loaded students:', loadedStudents);
      
      // Store in global data store
      setStudentsList(loadedStudents);
      
      // Store in component state
      setStudents(loadedStudents);
      setFilteredStudents(loadedStudents);
      
      // Get real statistics from the improved function
      const statistics = await dataManager.getPaymentStatistics();
      console.log('Payment statistics:', statistics);
      
      // Map the correct property names for the component
      const studentStats = {
        ...statistics,
        feesCollected: statistics.totalCollected,
        pendingFees: statistics.totalPending,
        overdueFees: statistics.totalOverdue,
        totalFees: statistics.totalStudentFees,
        paymentProgress: statistics.totalStudentFees > 0 
          ? Math.round((statistics.totalCollected / statistics.totalStudentFees) * 100) 
          : 0
      };
      
      setStats(studentStats);
    } catch (error) {
      console.error('Error loading student data:', error);
      setStudents([]);
      setFilteredStudents([]);
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

  // 3. Logic Update (So UI Changes Automatically)
  const calculateStudentStatus = (student) => {
    const totalFees = (student.feesPaid || 0) + (student.feesDue || 0);
    if (student.feesPaid === 0) {
      return "Not Started";
    } else if (student.feesPaid >= totalFees) {
      return "Paid";
    } else {
      return "Pending";
    }
  };

  // Filter and sort students
  useEffect(() => {
    let filtered = [...students];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.contact.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
        case 'feesPaid':
          aValue = a.feesPaid || 0;
          bValue = b.feesPaid || 0;
          break;
        case 'feesDue':
          aValue = a.feesDue || 0;
          bValue = b.feesDue || 0;
          break;
        case 'totalFees':
          aValue = (a.feesPaid || 0) + (a.feesDue || 0);
          bValue = (b.feesPaid || 0) + (b.feesDue || 0);
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
  }, [students, searchTerm, sortBy, sortOrder]);

  const handleLogout = () => {
    // Remove authentication data from sessionStorage instead of localStorage
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const handleViewProfile = (student) => {
    // Pass the complete student object to ensure all data is available
    const studentId = student.studentId || student.id;
    navigate(`/student/${studentId}`);
  };

  const handleAddStudent = async () => {
    setEditingStudent(null);
    // Generate automatic student ID
    const newStudentId = await generateStudentId();
    setFormData({
      name: '',
      studentId: newStudentId,
      class: '',
      contact: '',
      totalFees: ''
    });
    setShowAddForm(true);
  };

  // Generate automatic student ID
  const generateStudentId = async () => {
    const students = await dataManager.getStudents();
    const maxId = students.reduce((max, student) => {
      // Extract numeric part from student ID (e.g., STD001 -> 1)
      const numericPart = student.studentId.replace(/\D/g, '');
      return numericPart ? Math.max(max, parseInt(numericPart)) : max;
    }, 0);
    
    // Generate new ID with STD prefix and 3-digit number
    return `STD${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      studentId: student.studentId,
      class: student.class,
      contact: student.contact || '',
      email: student.email || '',
      address: student.address || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      totalFees: student.totalFees || (student.feesPaid || 0) + (student.feesDue || 0)
    });
    setShowAddForm(true);
  };

  // Handle single student selection
  const handleSelectStudent = (studentId) => {
    const updatedSelection = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId];
    setSelectedStudents(updatedSelection);
  };

  // Handle select all students
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      // Deselect all
      setSelectedStudents([]);
    } else {
      // Select all currently filtered students
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const handleDeleteStudent = (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name} (ID: ${student.studentId})?`)) {
      const updatedStudents = dataManager.deleteStudent(student.id);
      setStudents(updatedStudents);
      setFilteredStudents(updatedStudents);
      // Remove from selection if selected
      setSelectedStudents(selectedStudents.filter(id => id !== student.id));
      // Recalculate total fees
      calculateTotalFees(updatedStudents);
      
      // Update stats
      const statistics = dataManager.getPaymentStatistics();
      
      // Map the correct property names for the component
      const studentStats = {
        ...statistics,
        feesCollected: statistics.totalCollected,
        pendingFees: statistics.totalPending,
        overdueFees: statistics.totalOverdue,
        totalFees: statistics.totalStudentFees,
        paymentProgress: statistics.totalStudentFees > 0 
          ? Math.round((statistics.totalCollected / statistics.totalStudentFees) * 100) 
          : 0
      };
      
      setStats({
        ...studentStats,
        totalStudents: updatedStudents.length
      });
    }
  };

  // Bulk delete selected students
  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected student(s)?`)) {
      let updatedStudents = [...students];
      selectedStudents.forEach(studentId => {
        updatedStudents = dataManager.deleteStudent(studentId);
      });
      setStudents(updatedStudents);
      setFilteredStudents(updatedStudents);
      setSelectedStudents([]);
      // Recalculate total fees
      calculateTotalFees(updatedStudents);
      
      // Update stats
      const statistics = dataManager.getPaymentStatistics();
      
      // Map the correct property names for the component
      const studentStats = {
        ...statistics,
        feesCollected: statistics.totalCollected,
        pendingFees: statistics.totalPending,
        overdueFees: statistics.totalOverdue,
        totalFees: statistics.totalStudentFees,
        paymentProgress: statistics.totalStudentFees > 0 
          ? Math.round((statistics.totalCollected / statistics.totalStudentFees) * 100) 
          : 0
      };
      
      setStats({
        ...studentStats,
        totalStudents: updatedStudents.length
      });
    }
  };

  // Remove all students
  const handleRemoveAllStudents = () => {
    if (window.confirm('Are you sure you want to remove ALL students and payments?')) {
      dataManager.removeAllStudents();
      setStudents([]);
      setFilteredStudents([]);
      setSelectedStudents([]);
      
      // Update stats
      setStats({
        totalStudents: 0,
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validate form data
      if (!formData.name || !formData.studentId || !formData.class || !formData.contact) {
        alert('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Validate contact number (10 digits)
      if (!/^\d{10}$/.test(formData.contact)) {
        alert('Please enter a valid 10-digit mobile number');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare student data
      const totalFeesValue = parseFloat(formData.totalFees) || 0;
      const studentData = {
        ...formData,
        totalFees: totalFeesValue,
        feesPaid: editingStudent ? (editingStudent.feesPaid || 0) : 0,
        feesDue: editingStudent ? (editingStudent.feesDue || 0) : totalFeesValue,
        createdAt: editingStudent ? editingStudent.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      // If editing, calculate fees due based on any changes to total fees
      if (editingStudent) {
        const currentPaid = editingStudent.feesPaid || 0;
        const currentDue = editingStudent.feesDue || 0;
        const currentTotal = currentPaid + currentDue;
        
        // If total fees changed, adjust due amount while keeping paid the same
        if (totalFeesValue !== currentTotal) {
          studentData.feesDue = Math.max(0, totalFeesValue - currentPaid);
        }
      }
      
      try {
        if (editingStudent) {
          // Update existing student - preserve all original fields
          const updatedStudent = {
            ...editingStudent,
            ...studentData,
            studentId: editingStudent.studentId, // Ensure studentId is preserved
            id: editingStudent.id // Ensure id is preserved
          };
          
          console.log('Updating student with data:', updatedStudent);
          const result = await dataManager.updateStudent(updatedStudent);
          console.log('Student update result:', result);
          
          // Reset form and close modal regardless of result since function should throw on error
          setShowAddForm(false);
          setEditingStudent(null);
          setFormData({
            name: '',
            studentId: '',
            class: '',
            contact: '',
            email: '',
            address: '',
            fatherName: '',
            motherName: '',
            totalFees: ''
          });
          
          // Refresh data immediately
          setTimeout(() => {
            refreshData();
            // Dispatch studentsUpdated event to ensure UI refresh
            window.dispatchEvent(new Event('studentsUpdated'));
          }, 100);
        } else {
          // Add new student
          const newStudent = await dataManager.addStudent(studentData);
          console.log('New student added:', newStudent);
          
          if (newStudent) {
            // Reset form and close modal
            setShowAddForm(false);
            setEditingStudent(null);
            setFormData({
              name: '',
              studentId: '',
              class: '',
              contact: '',
              email: '',
              address: '',
              fatherName: '',
              motherName: '',
              totalFees: ''
            });
            
            // Refresh data immediately
            setTimeout(() => {
              refreshData();
              // Dispatch studentsUpdated event to ensure UI refresh
              window.dispatchEvent(new Event('studentsUpdated'));
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error saving student:', error);
        alert(`Error saving student: ${error.message || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error preparing student data:', error);
      alert(`Error preparing student data: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingStudent(null);
    setFormData({
      name: '',
      studentId: '',
      class: '',
      contact: '',
      totalFees: ''
    });
  };

  // Calculate total fees for all students
  const calculateTotalFees = (studentList) => {
    const total = studentList.reduce((sum, student) => {
      return sum + (student.feesPaid || 0) + (student.feesDue || 0);
    }, 0);
    return total;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (column) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const prepareColumnChartData = () => {
    return filteredStudents.slice(0, 10).map(student => ({
      name: student.name,
      feesPaid: student.feesPaid || 0,
      feesDue: student.feesDue || 0,
      totalFees: (student.feesPaid || 0) + (student.feesDue || 0),
      paymentPercentage: student.feesDue > 0 
        ? Math.round(((student.feesPaid || 0) / ((student.feesPaid || 0) + (student.feesDue || 0))) * 100)
        : 100
    }));
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
          <h1>Student Management</h1>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search students by name, ID, class, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="action-buttons">
            <button 
              className="remove-all-button" 
              onClick={handleRemoveAllStudents}
            >
              Remove All
            </button>
            <button 
              className="bulk-delete-button" 
              onClick={handleBulkDelete}
              disabled={selectedStudents.length === 0}
            >
              Delete Selected ({selectedStudents.length})
            </button>
            <button 
              className="add-button" 
              onClick={handleAddStudent}
            >
              Add Student
            </button>
          </div>
        </div>

        {/* Student Status Overview */}
        <div className="payment-status-overview">
          <div className="overview-header">
            <h3>Student Overview</h3>
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
                <div className="status-item total">
                  <div className="status-label">Total Students</div>
                  <div className="status-value">{stats.studentTotalStudents}</div>
                </div>
                <div className="status-item paid">
                  <div className="status-label">Fees Collected</div>
                  <div className="status-value">₹{stats.studentFeesCollected?.toLocaleString() || 0}</div>
                </div>
                <div className="status-item pending">
                  <div className="status-label">Pending Fees</div>
                  <div className="status-value">₹{stats.studentPendingFees?.toLocaleString() || 0}</div>
                </div>
                <div className="status-item overdue">
                  <div className="status-label">Overdue Fees</div>
                  <div className="status-value">₹{stats.overdueFees?.toLocaleString() || 0}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('studentId')} className="sortable">
                  ID{getSortIndicator('studentId')}
                </th>
                <th onClick={() => handleSort('name')} className="sortable">
                  Name{getSortIndicator('name')}
                </th>
                <th onClick={() => handleSort('class')} className="sortable">
                  Class{getSortIndicator('class')}
                </th>
                <th onClick={() => handleSort('contact')} className="sortable">
                  Contact{getSortIndicator('contact')}
                </th>
                <th onClick={() => handleSort('feesPaid')} className="sortable numeric">
                  Fees Paid{getSortIndicator('feesPaid')}
                </th>
                <th onClick={() => handleSort('feesDue')} className="sortable numeric">
                  Fees Due{getSortIndicator('feesDue')}
                </th>
                <th>Status</th>
                <th>Payment Progress</th>
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
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-results">
                    You haven't added any students yet. Start by adding your first student.
                  </td>
                </tr>
              ) : (
                // Actual student rows
                filteredStudents.map((student) => {
                  const totalFees = (student.feesPaid || 0) + (student.feesDue || 0);
                  const paymentPercentage = totalFees > 0 ? Math.round((student.feesPaid || 0) / totalFees * 100) : 0;
                  const paymentStatus = paymentPercentage === 100 ? 'paid' : paymentPercentage > 0 ? 'partial' : 'pending';
                              
                  return (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                        />
                      </td>
                      <td>{student.studentId}</td>
                      <td>{student.name}</td>
                      <td>{student.class}</td>
                      <td>{student.contact}</td>
                      <td className="numeric">₹{student.feesPaid?.toLocaleString() || '0'}</td>
                      <td className="numeric">₹{student.feesDue?.toLocaleString() || '0'}</td>
                      <td>
                        <span className={`status-badge status-${calculateStudentStatus(student).toLowerCase().replace(' ', '-')}`}>
                          {
                            calculateStudentStatus(student) === "Pending" 
                              ? "⏳ Pending" 
                              : calculateStudentStatus(student) === "Paid"
                              ? "✔️ Paid"
                              : "🆕 Not Started"
                          }
                        </span>
                      </td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className={`progress-fill ${paymentStatus}`}
                              style={{ width: `${paymentPercentage}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">{paymentPercentage}%</div>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="action-button view-button"
                          onClick={() => handleViewProfile(student)}
                        >
                          View
                        </button>
                        <button 
                          className="action-button edit-button"
                          onClick={() => handleEditStudent(student)}
                        >
                          Edit
                        </button>
                        <button 
                          className="action-button delete-button"
                          onClick={() => handleDeleteStudent(student)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Student Form Modal */}
        {showAddForm && (
          <div className="modal-overlay animated-modal">
            <div className="modal">
              <div className="modal-header">
                <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
                <button 
                  className="close-button" 
                  onClick={closeForm}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="student-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter student's full name"
                      minLength="2"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="studentId">Student ID *</label>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter unique student ID"
                      readOnly={!!editingStudent}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="class">Class *</label>
                    <input
                      type="text"
                      id="class"
                      name="class"
                      value={formData.class}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter class (e.g., 10A, 12B)"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact">Mobile Number *</label>
                    <input
                      type="tel"
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter 10-digit mobile number"
                      pattern="[0-9]{10}"
                      title="Please enter a 10-digit mobile number"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="totalFees">Total Fees (₹) *</label>
                    <input
                      type="number"
                      id="totalFees"
                      name="totalFees"
                      value={formData.totalFees}
                      onChange={handleFormChange}
                      required={!editingStudent}
                      min="0"
                      step="1"
                      placeholder="Enter total fees amount"
                    />
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
                    {isSubmitting ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;