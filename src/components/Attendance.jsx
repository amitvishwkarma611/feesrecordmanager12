import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManager from '../utils/dataManager';
import SharedTabWrapper from './common/SharedTabWrapper';
import SharedPageWrapper from './common/SharedPageWrapper';
import RootLayout from './common/RootLayout';
import './Attendance.css';

const Attendance = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState([]); // For salary calculation
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filters, setFilters] = useState({
    staffName: ''
  });
  const [salaryData, setSalaryData] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance'); // attendance or salary
  
  // State for adding new staff
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    perDaySalary: '',
    contact: '',
    email: ''
  });

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [selectedDate, selectedMonth]);

  // Listen for data updates
  useEffect(() => {
    const handleDataUpdate = () => {
      refreshData();
    };

    window.addEventListener('attendanceUpdated', handleDataUpdate);
    window.addEventListener('staffUpdated', handleDataUpdate);
    window.addEventListener('staffDeleted', handleDataUpdate);
    window.addEventListener('attendanceDeleted', handleDataUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleDataUpdate);
      window.removeEventListener('staffUpdated', handleDataUpdate);
      window.removeEventListener('staffDeleted', handleDataUpdate);
      window.removeEventListener('attendanceDeleted', handleDataUpdate);
    };
  }, []);

  const refreshData = async () => {
    try {
      // Load staff data
      const staffData = await dataManager.getStaff();
      setStaff(staffData);
      
      // Load staff attendance data for selected date
      const staffAttendanceData = await dataManager.getStaffAttendance();
      const selectedDateAttendance = staffAttendanceData.filter(record => record.date === selectedDate);
      setAttendance(selectedDateAttendance);
      setStaffAttendance(staffAttendanceData);
      
      // Calculate salary data
      calculateSalaryData(staffData, staffAttendanceData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  // Refresh data for salary calculations only (without affecting attendance list)
  const refreshSalaryData = async () => {
    try {
      // Only recalculate salary data without refreshing staff list
      const staffData = staff; // Use current staff data
      const staffAttendanceData = staffAttendance; // Use current attendance data
      calculateSalaryData(staffData, staffAttendanceData);
    } catch (error) {
      console.error('Error recalculating salary data:', error);
    }
  };

  const calculateSalaryData = (staffData, staffAttendanceData) => {
    const salaryResults = staffData.map(staffMember => {
      // Filter attendance for selected month and this staff member
      const staffAttendance = staffAttendanceData.filter(record => 
        record.staffId === staffMember.staffId && 
        record.date.startsWith(selectedMonth)
      );
      
      // Count only present days
      const presentDays = staffAttendance.filter(a => a.status === "present").length;
      const salary = staffMember.perDaySalary * presentDays;
      
      return {
        staffId: staffMember.staffId,
        staffName: staffMember.name,
        role: staffMember.role,
        perDaySalary: staffMember.perDaySalary,
        presentDays,
        salary
      };
    });
    
    setSalaryData(salaryResults);
  };

  // Get attendance status for a specific staff member
  const getAttendanceStatus = (staffId) => {
    const record = attendance.find(a => a.staffId === staffId);
    return record ? record.status : null;
  };

  // Toggle attendance status
  const toggleAttendance = async (staffId) => {
    // Check if attendance record already exists for this staff and date
    const existingRecord = attendance.find(a => a.staffId === staffId);
    
    // If there's an existing record, toggle between present and absent directly
    if (existingRecord) {
      // Toggle status: present <-> absent
      const newStatus = existingRecord.status === 'present' ? 'absent' : 'present';
      
      // Create attendance data with the new status
      const attendanceData = {
        staffId: staffId,
        date: selectedDate,
        status: newStatus,
        class: existingRecord.class || 'General', // Use existing class or default
        createdAt: existingRecord.createdAt || new Date().toISOString(),
        markedAt: new Date().toISOString() // Automatic timestamp
      };
      
      try {
        // Update the existing record directly
        if (existingRecord.id && !existingRecord.id.startsWith('temp_')) {
          // Update existing record in Firebase
          await dataManager.updateStaffAttendance({ ...attendanceData, id: existingRecord.id });
        } else {
          // If it's a temporary record, create a new one
          await dataManager.addStaffAttendance(attendanceData);
        }
        
        // Update local state immediately for UI feedback
        setAttendance(prev => 
          prev.map(a => 
            a.staffId === staffId 
              ? { ...a, status: newStatus, markedAt: new Date().toISOString() } 
              : a
          )
        );
        
        // Show success message
        window.dispatchEvent(new CustomEvent('showSuccess', {
          detail: { message: `Attendance updated to ${newStatus}!` }
        }));
        
        // Refresh data to sync with Firebase
        setTimeout(() => {
          refreshData();
        }, 100);
      } catch (error) {
        console.error('Error updating attendance:', error);
        alert(`Error updating attendance: ${error.message}`);
      }
    } else {
      // No existing record, show class selection modal for new attendance
      setCurrentStaffId(staffId);
      setSelectedClass('');
      setShowClassModal(true);
    }
  };
  
  // Update attendance with selected class
  const updateAttendanceWithClass = async (e) => {
    // Prevent double clicks
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!currentStaffId || isSavingAttendance) return; // Prevent if already saving
    
    setIsSavingAttendance(true); // Set loading state
    
    try {
      // Check if attendance record already exists for this staff and date
      const existingRecord = attendance.find(a => a.staffId === currentStaffId);
      
      let newStatus;
      if (!existingRecord) {
        // No existing record, create new one as present
        newStatus = 'present';
      } else {
        // Normal toggle logic for backward compatibility
        if (existingRecord.status === 'present') {
          newStatus = 'absent';
        } else if (existingRecord.status === 'absent') {
          newStatus = null; // Remove the record
        } else {
          newStatus = 'present';
        }
      }
      
      if (newStatus === null) {
        // Remove attendance record
        if (existingRecord && existingRecord.id) {
          await dataManager.deleteStaffAttendance(existingRecord.id);
        }
        // Update local state
        setAttendance(prev => prev.filter(a => a.staffId !== currentStaffId));
      } else {
        // Create or update attendance record
        const attendanceData = {
          staffId: currentStaffId,
          date: selectedDate,
          status: newStatus,
          class: selectedClass || 'General', // Use selected class or default to 'General'
          createdAt: new Date().toISOString(),
          markedAt: new Date().toISOString() // Automatic timestamp as per specification
        };
        
        if (existingRecord && existingRecord.id && !existingRecord.id.startsWith('temp_')) {
          // Update existing record only if it has a real Firebase ID (not a temporary one)
          // Validate that we have a valid ID before attempting update
          if (existingRecord.id) {
            await dataManager.updateStaffAttendance({ ...attendanceData, id: existingRecord.id });
          } else {
            // If ID is invalid, treat as new record
            await dataManager.addStaffAttendance(attendanceData);
          }
        } else {
          // Create new record
          await dataManager.addStaffAttendance(attendanceData);
        }
        
        // Update local state
        if (existingRecord) {
          setAttendance(prev => 
            prev.map(a => 
              a.staffId === currentStaffId 
                ? { ...a, status: newStatus, class: selectedClass || a.class, markedAt: new Date().toISOString() } 
                : a
            )
          );
        } else {
          // For new records, update local state immediately with temporary ID
          // This will be replaced with the correct Firebase ID when refreshData() completes
          setAttendance(prev => [...prev, { 
            staffId: currentStaffId,
            date: selectedDate,
            status: newStatus,
            class: selectedClass || 'General',
            createdAt: new Date().toISOString(),
            markedAt: new Date().toISOString(),
            id: `temp_${Date.now()}` // Temporary ID until Firebase ID is available
          }]);
        }
      }
      
      // Show success message
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: 'Attendance updated successfully!' }
      }));
      
      // Close modal and reset state
      setShowClassModal(false);
      setCurrentStaffId(null);
      setSelectedClass('');
      
      // Refresh data to update salary calculations and get the correct Firebase IDs
      setTimeout(() => {
        refreshData();
      }, 100);
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert(`Error updating attendance: ${error.message}`);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Delete staff member and associated attendance records
  const deleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member and all their attendance records? This action cannot be undone.')) {
      try {
        // First get all attendance records for this staff member
        const staffAttendanceRecords = staffAttendance.filter(record => record.staffId === staffId);
        
        // Find the staff member's Firebase document ID
        const staffMember = staff.find(member => member.staffId === staffId);
        const firebaseDocId = staffMember ? staffMember.id : null; // Use 'id' instead of 'firebaseDocId'
        
        if (!firebaseDocId) {
          throw new Error('Could not find staff member in database');
        }
        
        // Delete each attendance record
        for (const record of staffAttendanceRecords) {
          // Ensure the record has a valid ID before attempting to delete
          if (record.id && !record.id.startsWith('temp_')) {  // Skip temporary IDs
            await dataManager.deleteStaffAttendance(record.id);
          }
        }
        
        // Then delete the staff member using the Firebase document ID
        await dataManager.deleteStaff(firebaseDocId);
        
        // Immediately update local state to reflect changes
        setStaff(prevStaff => prevStaff.filter(member => member.staffId !== staffId));
        setStaffAttendance(prevAttendance => prevAttendance.filter(record => record.staffId !== staffId));
        
        // Also update the attendance state (for the current selected date)
        setAttendance(prevAttendance => prevAttendance.filter(record => record.staffId !== staffId));
        
        // Update salary data to remove deleted staff
        setSalaryData(prevSalaryData => prevSalaryData.filter(data => data.staffId !== staffId));
        
        // Show success message
        window.dispatchEvent(new CustomEvent('showSuccess', {
          detail: { message: 'Staff member and associated attendance records deleted successfully!' }
        }));
        
        // Force a refresh of the data to ensure statistics are updated
        setTimeout(() => {
          refreshData();
        }, 100);
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert(`Error deleting staff: ${error.message}. Some data may not have been deleted. Refreshing data to ensure consistency.`);
        
        // Refresh data to ensure consistency in case of partial deletion
        setTimeout(() => {
          refreshData();
        }, 2000);
      }
    }
  };


  // Handle date change
  const handleDateChange = (event) => {
    const newDate = event.target.value;
    // If new date is provided, update it
    if (newDate) {
      setSelectedDate(newDate);
    } else {
      // If cleared, reset to today's date
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  };

  // Handle month change
  const handleMonthChange = (event) => {
    const newMonth = event.target.value;
    // If new month is provided, update it
    if (newMonth) {
      setSelectedMonth(newMonth);
    } else {
      // If cleared, reset to current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      setSelectedMonth(currentMonth);
    }
  };

  // Filter staff based on search criteria
  const filteredStaff = staff.filter(member => {
    return (
      filters.staffName === '' || member.name.toLowerCase().includes(filters.staffName.toLowerCase())
    );
  });

  // Filter salary data based on filters
  const filteredSalaryData = salaryData.filter(data => {
    return (
      filters.staffName === '' || data.staffName.toLowerCase().includes(filters.staffName.toLowerCase())
    );
  });
  
  // Show attendance history for a staff member
  const showAttendanceHistory = async (staffId) => {
    try {
      // Find the staff member
      const staffMember = staff.find(member => member.staffId === staffId);
      if (!staffMember) {
        console.error('Staff member not found');
        return;
      }
      
      // Filter attendance records for this staff member
      const staffAttendanceHistory = staffAttendance
        .filter(record => record.staffId === staffId)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
      
      setSelectedStaffForHistory({
        ...staffMember,
        attendanceHistory: staffAttendanceHistory
      });
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      alert('Error fetching attendance history: ' + error.message);
    }
  };
  
  // Close attendance history modal
  const closeAttendanceHistory = () => {
    setSelectedStaffForHistory(null);
  };

  // Calculate total salary for all staff
  const totalSalary = salaryData.reduce((sum, data) => sum + data.salary, 0);
  
  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const totalCount = presentCount + absentCount;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    return { presentCount, absentCount, totalCount, percentage };
  };
  
  const attendanceStats = calculateAttendanceStats();
  
  // Handle new staff input changes
  const handleNewStaffChange = (e) => {
    const { name, value } = e.target;
    setNewStaff(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle adding new staff
  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSavingAttendance) return;
    
    // Set loading state to prevent double clicks
    setIsSavingAttendance(true);
    
    // Validate required fields
    if (!newStaff.name || !newStaff.role || !newStaff.perDaySalary) {
      alert('Please fill in all required fields (Name, Role, and Per Day Salary)');
      setIsSavingAttendance(false);
      return;
    }
    
    try {
      // Generate staff ID with STF prefix and zero-padded number
      // For now, we'll use a timestamp-based approach similar to students
      // In a production environment, you might want to use a counter stored in the database
      const staffId = `STF${String(Date.now()).slice(-4)}`;
      
      // Create staff object
      const staffData = {
        staffId, // Add the generated staff ID
        name: newStaff.name,
        role: newStaff.role,
        perDaySalary: parseFloat(newStaff.perDaySalary),
        contact: newStaff.contact || '',
        email: newStaff.email || '',
        createdAt: new Date().toISOString()
      };
      
      // Add staff using dataManager
      await dataManager.addStaff(staffData);
      
      // Reset form
      setNewStaff({
        name: '',
        role: '',
        perDaySalary: '',
        contact: '',
        email: ''
      });
      
      setShowAddStaffForm(false);
      
      // Show success message
      window.dispatchEvent(new CustomEvent('showSuccess', {
        detail: { message: 'Staff member added successfully!' }
      }));
    } catch (error) {
      console.error('Error adding staff:', error);
      alert(`Error adding staff: ${error.message}`);
    } finally {
      // Reset loading state
      setIsSavingAttendance(false);
    }
  };

  // Close class selection modal
  const closeClassModal = (e) => {
    // Only close if clicking on the overlay (not the content)
    if (e && e.target === e.currentTarget) {
      setShowClassModal(false);
      setCurrentStaffId(null);
      setSelectedClass('');
    }
    // If called programmatically (no event), close the modal
    if (!e) {
      setShowClassModal(false);
      setCurrentStaffId(null);
      setSelectedClass('');
    }
  };
  
  return (
    <RootLayout>
      <div className="attendance-container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <h1>Staff Attendance & Salary</h1>
          </div>
          <div className="header-tabs">
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button 
                className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                Daily Attendance
              </button>
              <button 
                className={`tab-button ${activeTab === 'salary' ? 'active' : ''}`}
                onClick={() => setActiveTab('salary')}
              >
                Salary Summary
              </button>
            </div>
          </div>
        </div>
      
      {/* Add Staff Button - Only show in attendance tab */}
      {activeTab === 'attendance' && (
        <div className="add-staff-section">
          <button 
            className="add-staff-button"
            onClick={() => setShowAddStaffForm(!showAddStaffForm)}
          >
            {showAddStaffForm ? 'Cancel' : 'Add New Staff Member'}
          </button>
        </div>
      )}
      
      {/* Add Staff Form - Only show in attendance tab */}
      {activeTab === 'attendance' && showAddStaffForm && (
        <div className="add-staff-form">
          <h2>Add New Staff Member</h2>
          <form onSubmit={handleAddStaff}>
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newStaff.name}
                onChange={handleNewStaffChange}
                placeholder="Enter staff name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <input
                type="text"
                id="role"
                name="role"
                value={newStaff.role}
                onChange={handleNewStaffChange}
                placeholder="Enter staff role"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="perDaySalary">Per Day Salary *</label>
              <input
                type="number"
                id="perDaySalary"
                name="perDaySalary"
                value={newStaff.perDaySalary}
                onChange={handleNewStaffChange}
                placeholder="Enter per day salary"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="contact">Contact</label>
              <input
                type="text"
                id="contact"
                name="contact"
                value={newStaff.contact}
                onChange={handleNewStaffChange}
                placeholder="Enter contact number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={newStaff.email}
                onChange={handleNewStaffChange}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSavingAttendance}
              >
                {isSavingAttendance ? 'Adding Staff...' : 'Add Staff Member'}
              </button>
              <button 
                type="button" 
                className="cancel-button" 
                onClick={() => setShowAddStaffForm(false)}
                disabled={isSavingAttendance}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}
      
      {/* Attendance Section */}
      {activeTab === 'attendance' && (
        <SharedPageWrapper>
          {/* Date Selection */}
          <div className="date-selection">
            <div className="date-picker-container">
              <label htmlFor="attendance-date">Select Date: </label>
              <input 
                type="date" 
                id="attendance-date"
                value={selectedDate} 
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>
          
          <div className="attendance-section">
            <h2>Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            
            {/* Attendance Statistics */}
            <div className="attendance-stats">
              <div className="stat-card" style={{ animationDelay: '0.1s' }}>
                <div className="stat-value">{attendanceStats.presentCount}</div>
                <div className="stat-label">Present</div>
                {attendanceStats.presentCount === 0 && (
                  <div className="stat-helper">No staff marked present yet</div>
                )}
              </div>
              <div className="stat-card" style={{ animationDelay: '0.2s' }}>
                <div className="stat-value">{attendanceStats.absentCount}</div>
                <div className="stat-label">Absent</div>
                {attendanceStats.absentCount === 0 && (
                  <div className="stat-helper">No staff marked absent yet</div>
                )}
              </div>
              <div className="stat-card" style={{ animationDelay: '0.3s' }}>
                <div className="stat-value">{attendanceStats.percentage}%</div>
                <div className="stat-label">Attendance Rate</div>
                {attendanceStats.totalCount === 0 && (
                  <div className="stat-helper">Awaiting attendance marks</div>
                )}
              </div>
              <div className="stat-card" style={{ animationDelay: '0.4s' }}>
                <div className="stat-value">{attendanceStats.totalCount}/{staff.length}</div>
                <div className="stat-label">Marked</div>
                {attendanceStats.totalCount === 0 && staff.length > 0 && (
                  <div className="stat-helper">No staff marked yet</div>
                )}
                {staff.length === 0 && (
                  <div className="stat-helper">No staff added yet</div>
                )}
              </div>
            </div>
            
            {staff.length === 0 ? (
              <div className="no-staff">
                <div className="empty-state-icon">👥</div>
                <p>No staff members added yet. Start by adding your first staff member to begin attendance tracking.</p>
                <button 
                  className="add-staff-button"
                  onClick={() => setShowAddStaffForm(true)}
                >
                  Add New Staff Member
                </button>
              </div>
            ) : (
              <div className="attendance-list">
                {filteredStaff.map((member, index) => {
                  const currentStatus = getAttendanceStatus(member.staffId);
                  return (
                    <div 
                      key={member.staffId} 
                      className="staff-item"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="staff-info">
                        <h3>{member.name}</h3>
                        <p>ID: {member.staffId || member.id}</p>
                        <p>Role: {member.role}</p>
                      </div>
                      <div className="staff-actions">
                        <button
                          className={`attendance-toggle ${currentStatus || 'not-marked'}`}
                          onClick={() => toggleAttendance(member.staffId)}
                        >
                          {currentStatus === 'present' ? '✅ Present' : 
                           currentStatus === 'absent' ? '❌ Absent' : 'Mark Attendance'}
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => deleteStaff(member.staffId)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SharedPageWrapper>
      )}
      
      {/* Salary Section */}
      {activeTab === 'salary' && (
        <SharedPageWrapper>
          {/* Filters */}
          <div className="filters">
            <div className="filter-group">
              <label htmlFor="staffNameFilter">Staff Name:</label>
              <input
                type="text"
                id="staffNameFilter"
                placeholder="Filter by staff name..."
                value={filters.staffName}
                onChange={(e) => setFilters({...filters, staffName: e.target.value})}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="salary-month">Select Month:</label>
              <input
                type="month"
                id="salary-month"
                value={selectedMonth}
                onChange={handleMonthChange}
                required
              />
            </div>
          </div>
          
          <div className="salary-section">
            <h2>Salary Summary for {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            
            {/* Summary Card */}
            <div className="summary-card">
              <div className="summary-content">
                <div className="summary-item" style={{ animationDelay: '0.1s' }}>
                  <span>Total Staff:</span>
                  <span className="summary-value">{filteredSalaryData.length}</span>
                </div>
                <div className="summary-item" style={{ animationDelay: '0.2s' }}>
                  <span>Total Salary:</span>
                  <span className="summary-value salary-amount">₹{totalSalary.toFixed(2)}</span>
                </div>
                <div className="summary-item" style={{ animationDelay: '0.3s' }}>
                  <span>Average Salary:</span>
                  <span className="summary-value salary-amount">₹{filteredSalaryData.length > 0 ? (totalSalary / filteredSalaryData.length).toFixed(2) : '0.00'}</span>
                </div>
                <div className="summary-item" style={{ animationDelay: '0.4s' }}>
                  <span>Month:</span>
                  <span className="summary-value">{new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
            
            {/* Individual Salary Cards */}
            <div className="salary-cards">
              {filteredSalaryData.map((data, index) => (
                <div 
                  key={data.staffId} 
                  className="salary-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => showAttendanceHistory(data.staffId)}
                >
                  <div className="card-header">
                    <h3>{data.staffName}</h3>
                    <span className="role-badge">{data.role}</span>
                  </div>
                  
                  <div className="salary-details">
                    <div className="detail-row">
                      <span>Present Days:</span>
                      <span className="present-count">{data.presentDays}</span>
                    </div>
                    <div className="detail-row">
                      <span>Daily Salary:</span>
                      <span>₹{data.perDaySalary.toFixed(2)}</span>
                    </div>
                    <div className="salary-total">
                      <span>Total Salary:</span>
                      <span className="salary-amount">₹{data.salary.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SharedPageWrapper>
      )}
      
      {/* Attendance History Modal */}
      {selectedStaffForHistory && (
        <div className="modal-overlay" onClick={closeAttendanceHistory}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attendance History for {selectedStaffForHistory.name}</h2>
              <button className="close-button" onClick={closeAttendanceHistory}>×</button>
            </div>
            <div className="modal-body">
              <div className="staff-info">
                <p><strong>ID:</strong> {selectedStaffForHistory.staffId}</p>
                <p><strong>Role:</strong> {selectedStaffForHistory.role}</p>
                <p><strong>Daily Salary:</strong> ₹{selectedStaffForHistory.perDaySalary}</p>
              </div>
              
              <div className="attendance-history-list">
                <h3>Attendance Records</h3>
                {selectedStaffForHistory.attendanceHistory.length > 0 ? (
                  <div className="history-records">
                    {selectedStaffForHistory.attendanceHistory.map((record, index) => (
                      <div key={record.id || index} className="history-record">
                        <div className="record-date">
                          <strong>{new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</strong>
                        </div>
                        <div className="record-status">
                          <span className={`status-badge ${record.status}`}>{record.status}</span>
                        </div>
                        {record.class && (
                          <div className="record-class">
                            <span className="class-badge">{record.class}</span>
                          </div>
                        )}
                        {record.markedAt && (
                          <div className="record-time">
                            Marked at: {new Date(record.markedAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-records">No attendance records found for this staff member.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Class Selection Modal */}
      {showClassModal && (
        <div className="modal-overlay" onClick={closeClassModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Class</h2>
              <button className="close-button" onClick={closeClassModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="class-select">Choose a class:</label>
                <select
                  id="class-select"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="class-select"
                >
                  <option value="">-- Select Class --</option>
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
              
              <div className="form-actions">
                <button 
                  className="submit-button" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateAttendanceWithClass(e);
                  }}
                  disabled={!selectedClass || isSavingAttendance}
                  type="button"
                >
                  {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={closeClassModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </RootLayout>
  );
};

export default Attendance;