import { 
  getStudents, 
  addStudent, 
  updateStudent, 
  deleteStudent,
  getPayments,
  addPayment,
  updatePayment,
  deletePayment,
  getAttendance,
  addAttendance,
  updateAttendance,
  deleteAttendance,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getStaffAttendance,
  addStaffAttendance,
  updateStaffAttendance,
  deleteStaffAttendance,
  getExpenditures,
  addExpenditure,
  updateExpenditure,
  deleteExpenditure,
  getFeedback,
  getSupportQueries
} from '../services/firebaseService';
import { getCurrentUserUID, isAuthenticated } from '../utils/auth';
import { Timestamp } from 'firebase/firestore';

class DataManager {
  constructor() {
    this.studentsKey = 'feesManagementStudents';
    this.paymentsKey = 'feesManagementPayments';
    // Firebase is always enabled now for multi-tenancy
    this.useFirebase = true;
    // No need to initialize localStorage data
  }

  // Method to enable Firebase (kept for backward compatibility)
  enableFirebase() {
    this.useFirebase = true;
  }

  // Method to disable Firebase (fallback to localStorage)
  disableFirebase() {
    this.useFirebase = false;
  }

  // Method to check if Firebase is enabled
  isFirebaseEnabled() {
    return this.useFirebase;
  }

  // Student methods
  async getStudents() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Try to get data from Firebase
        const students = await getStudents();
        return students;
      } catch (error) {
        console.warn('Failed to get students from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async saveStudents(students) {
    // This method should update students in Firebase
    console.warn('saveStudents is deprecated - Firebase handles persistence automatically');
    // But we still need to update the students in Firebase
    try {
      // Update each student in Firebase
      for (const student of students) {
        // Check if this is a new student (no id) or existing student
        if (student.id) {
          // Update existing student
          try {
            await updateStudent(student.id, student);
          } catch (error) {
            console.error('Error updating student in Firebase:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error saving students to Firebase:', error);
    }
  }

  async getStudentById(id) {
    try {
      const students = await this.getStudents();
      // Fix the comparison to handle both string and number IDs
      // First try to find by studentId field (string ID like "STD001")
      let student = students.find(student => student.studentId == id);
      if (!student) {
        // If not found, try to find by id field (numeric ID)
        student = students.find(student => student.id == id);
      }
      
      // If still not found and id is numeric, try to find by converting id to number
      if (!student && typeof id === 'string' && /^\d+$/.test(id)) {
        student = students.find(student => student.id == parseInt(id) || student.studentId == parseInt(id));
      }
      
      return student || null;
    } catch (error) {
      console.error('Error getting student by ID:', error);
      return null;
    }
  }

  async addStudent(student) {
    try {
      if (this.useFirebase && isAuthenticated()) {
        try {
          // Calculate feesPaid and feesDue if not provided
          const totalFees = parseFloat(student.totalFees) || 0;
          const feesPaid = parseFloat(student.feesPaid) || 0;
          const feesDue = parseFloat(student.feesDue) !== undefined ? 
            parseFloat(student.feesDue) : 
            (totalFees - feesPaid);
          
          // Prepare student data for Firebase - don't include custom id field
          // The id will be set by Firebase when we fetch the data
          const newStudent = {
            ...student,
            studentId: student.studentId || `STD${String(Date.now()).slice(-4)}`, // Ensure studentId is set
            totalFees: totalFees,
            feesPaid: feesPaid,
            feesDue: feesDue,
            // If feesStructure is not provided but feesDue is, set a default feesStructure
            feesStructure: student.feesStructure || this.getDefaultFeeStructure(feesDue),
            // WhatsApp reminder fields
            reminderEnabled: student.reminderEnabled !== undefined ? student.reminderEnabled : true, // Default to true
            lastReminderSent: student.lastReminderSent || null,
            // Universal reminder logic fields
            feesCollectionFrequency: student.feesCollectionFrequency || student.feesCollectionDate || '',
            customDueDate: student.customDueDate || student.customCollectionDate || '',
            // Admission date field
            admissionDate: student.admissionDate || null,
            createdAt: Timestamp.now(), // Add creation timestamp
            updatedAt: Timestamp.now(), // Add update timestamp
            ownerId: getCurrentUserUID() // Add owner ID for security rules
          };
          
          // Remove the custom id field if it exists to avoid confusion
          delete newStudent.id;
          
          const result = await addStudent(newStudent);
          
          // Dispatch studentsUpdated event to notify all components
          window.dispatchEvent(new Event('studentsUpdated'));
          
          return result;
        } catch (error) {
          console.warn('Failed to add student to Firebase:', error);
          throw new Error(`Failed to add student to Firebase: ${error.message || 'Unknown error occurred'}`);
        }
      } else {
        throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  }

  getDefaultFeeStructure(feesDue) {
    if (feesDue >= 1500) {
      return 'Annual';
    } else if (feesDue >= 500) {
      return 'Quarterly';
    } else if (feesDue > 0) {
      return 'Monthly';
    }
    return 'Not Set';
  }

  async updateStudent(updatedStudent) {
    try {
      console.log('=== UPDATE STUDENT FUNCTION START ===');
      console.log('Received student data:', JSON.parse(JSON.stringify(updatedStudent)));
      
      if (this.useFirebase && isAuthenticated()) {
        try {
          // Log the incoming student data for debugging
          console.log('Using Firebase for update');
          
          // Ensure all numeric values are properly formatted
          // Safely parse numeric values
          const totalFees = !isNaN(parseFloat(updatedStudent.totalFees)) ? parseFloat(updatedStudent.totalFees) : 0;
          const feesPaid = !isNaN(parseFloat(updatedStudent.feesPaid)) ? parseFloat(updatedStudent.feesPaid) : 0;
          const feesDue = !isNaN(parseFloat(updatedStudent.feesDue)) ? parseFloat(updatedStudent.feesDue) : (totalFees - feesPaid);
          
          console.log('Parsed numeric values:', { totalFees, feesPaid, feesDue });
          
          // Safely determine feesStructure
          let feesStructure = updatedStudent.feesStructure;
          if (!feesStructure) {
            feesStructure = this.getDefaultFeeStructure(feesDue);
          }
          
          console.log('Determined feesStructure:', feesStructure);
          
          // Create a clean student object with only the fields we want to update
          const studentWithNumericValues = {
            name: updatedStudent.name || '',
            class: updatedStudent.class || '',
            totalFees: totalFees,
            feesPaid: feesPaid,
            feesDue: feesDue,
            feesStructure: feesStructure,
            contact: updatedStudent.contact || '',
            email: updatedStudent.email || '',
            address: updatedStudent.address || '',
            fatherName: updatedStudent.fatherName || '',
            motherName: updatedStudent.motherName || '',
            status: updatedStudent.status || 'Not Started',
            studentId: updatedStudent.studentId || updatedStudent.id,
            // WhatsApp reminder fields
            reminderEnabled: updatedStudent.reminderEnabled !== undefined ? updatedStudent.reminderEnabled : true,
            lastReminderSent: updatedStudent.lastReminderSent || null,
            // Admission date field
            admissionDate: updatedStudent.admissionDate || null,
            updatedAt: Timestamp.now(), // Always update the timestamp
            ownerId: getCurrentUserUID() // Add owner ID for security rules
          };
          
          // Preserve additional fields like photoURL if they exist
          if (updatedStudent.photoURL) {
            studentWithNumericValues.photoURL = updatedStudent.photoURL;
          }
          
          // Preserve WhatsApp reminder fields if they exist
          if (updatedStudent.reminderEnabled !== undefined) {
            studentWithNumericValues.reminderEnabled = updatedStudent.reminderEnabled;
          }
          if (updatedStudent.lastReminderSent) {
            studentWithNumericValues.lastReminderSent = updatedStudent.lastReminderSent;
          }
          
          // Preserve WhatsApp reminder fields if they exist
          if (updatedStudent.feesCollectionFrequency !== undefined) {
            studentWithNumericValues.feesCollectionFrequency = updatedStudent.feesCollectionFrequency;
          }
          if (updatedStudent.customDueDate !== undefined) {
            studentWithNumericValues.customDueDate = updatedStudent.customDueDate;
          }
          
          // Preserve createdAt if it exists
          if (updatedStudent.createdAt) {
            studentWithNumericValues.createdAt = updatedStudent.createdAt;
          }
          
          console.log('Prepared student data for Firebase:', studentWithNumericValues);
          
          // Make sure we have a valid ID for the update
          // Use the id field from the student object, which should be the Firebase document ID
          let studentId = updatedStudent.id;
          console.log('Student ID for update:', studentId, 'Type:', typeof studentId);
          
          // Handle potential ID mismatch for existing students
          // If the ID looks like a timestamp (13 digits) but doesn't work, try to find the correct document
          if (studentId && typeof studentId === 'number' && studentId > 1000000000000) {
            console.log('Potential ID mismatch detected - ID looks like timestamp');
            // Try to get all students to find the correct document ID
            try {
              const allStudents = await this.getStudents();
              console.log('All students for ID matching:', allStudents);
              
              // Try to find a student with matching studentId or other fields
              const matchingStudent = allStudents.find(s => 
                s.studentId === updatedStudent.studentId || 
                (s.name === updatedStudent.name && s.class === updatedStudent.class)
              );
              
              if (matchingStudent) {
                console.log('Found matching student with correct ID:', matchingStudent.id);
                studentId = matchingStudent.id;
              } else {
                console.log('No matching student found, using original ID');
              }
            } catch (fetchError) {
              console.error('Error fetching students for ID matching:', fetchError);
            }
          }
          
          if (!studentId) {
            const error = new Error('Student ID is required for update');
            console.error('Validation error:', error.message);
            throw error;
          }
          
          console.log('Updating student with ID:', studentId, 'and data:', studentWithNumericValues);
          
          const result = await updateStudent(studentId, studentWithNumericValues);
          console.log('Firebase update result:', result);
          
          // Dispatch studentsUpdated event to notify all components
          console.log('Dispatching studentsUpdated event');
          window.dispatchEvent(new Event('studentsUpdated'));
          
          // Also dispatch a custom event with the updated student data
          console.log('Dispatching studentUpdated event');
          window.dispatchEvent(new CustomEvent('studentUpdated', {
            detail: { student: result }
          }));
          
          console.log('=== UPDATE STUDENT FUNCTION END SUCCESS ===');
          return result;
        } catch (error) {
          console.error('Failed to update student in Firebase:', error);
          console.error('Error stack:', error.stack);
          throw new Error(`Failed to update student: ${error.message}`);
        }
      } else {
        // This should never be reached since Firebase is always enabled
        const error = new Error('Firebase is required - localStorage fallback removed');
        console.error('Firebase not enabled:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Error updating student:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Error updating student: ${error.message}`);
    }
  }

  async deleteStudent(studentId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // First, get all payments for this student
        const payments = await this.getPayments();
        const studentPayments = payments.filter(payment => payment.studentId == studentId);
        
        // Delete all associated payments first
        for (const payment of studentPayments) {
          try {
            await deletePayment(payment.id);
          } catch (error) {
            console.warn(`Failed to delete payment ${payment.id} for student ${studentId}:`, error);
            // Continue with other payments even if one fails
          }
        }
        
        // Then delete the student
        await deleteStudent(studentId);
        
        // Dispatch studentsUpdated event to notify all components
        window.dispatchEvent(new Event('studentsUpdated'));
        
        return studentId;
      } catch (error) {
        console.warn('Failed to delete student from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  removeAllStudents() {
    // This method should not be used anymore as it was tied to localStorage
    throw new Error('removeAllStudents is deprecated - use Firebase console to clear data');
  }

  // Payment methods
  async getPayments() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Get data from Firebase
        const payments = await getPayments();
        
        // Automatically update payment statuses based on due dates
        const today = new Date();
        let updated = false;
        
        const updatedPayments = payments.map(payment => {
          // Only check pending payments (not already paid or overdue)
          if (payment.status === 'pending' && payment.dueDate) {
            // Handle different date formats
            let dueDate;
            // Handle Firebase Timestamps
            if (payment.dueDate instanceof Timestamp) {
              dueDate = payment.dueDate.toDate();
            }
            // Handle string dates
            else if (typeof payment.dueDate === 'string') {
              if (payment.dueDate.includes('/')) {
                // DD/MM/YYYY format
                dueDate = new Date(payment.dueDate.split('/').reverse().join('-'));
              } else {
                // YYYY-MM-DD format
                dueDate = new Date(payment.dueDate);
              }
            }
            // Handle Date objects
            else if (payment.dueDate instanceof Date) {
              dueDate = payment.dueDate;
            }
            
            // Check if date is valid
            if (dueDate instanceof Date && !isNaN(dueDate)) {
              // Only mark as overdue if:
              // 1. Due date has passed
              // 2. Payment was created at least 1 minute ago (to prevent newly created payments from being marked as overdue immediately)
              if (dueDate < today) {
                const createdAt = payment.createdAt ? 
                  (payment.createdAt instanceof Timestamp ? payment.createdAt.toDate() : new Date(payment.createdAt)) : 
                  new Date();
                const oneMinuteAgo = new Date(today.getTime() - 60000); // 1 minute ago
                
                if (createdAt <= oneMinuteAgo) {
                  // Payment is overdue
                  updated = true;
                  return {
                    ...payment,
                    status: 'overdue'
                  };
                }
              }
            }
          }
          return payment;
        });
        
        return updatedPayments;
      } catch (error) {
        console.warn('Failed to get payments from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  savePayments(payments) {
    // This method is no longer needed since Firebase handles persistence
    // But kept for backward compatibility with existing code
    console.warn('savePayments is deprecated - Firebase handles persistence automatically');
  }

  async addPayment(payment) {
    try {
      // First validate that the student exists
      const student = await this.getStudentById(payment.studentId);
      if (!student) {
        throw new Error(`Student with ID "${payment.studentId}" not found. Please add the student first.`);
      }

      const newPayment = {
        ...payment,
        id: `PAY${Date.now()}`,
        studentId: payment.studentId, // Explicitly store the studentId
        studentName: student.name,
        studentClass: student.class,
        studentContact: student.contact,
        status: 'pending',
        paidDate: null,
        method: null,
        receipt: null,
        amount: parseFloat(payment.amount) || 0,
        createdAt: Timestamp.now(), // Use Firebase Timestamp instead of string
        ownerId: getCurrentUserUID() // Add owner ID for security rules
      };
      
      console.log('Adding new payment:', newPayment);
      
      // Add to Firebase
      const result = await addPayment(newPayment);
      console.log('Payment added result:', result);
      
      // Update student fees to reflect the new pending payment
      await this.updateStudentFees(newPayment.studentId, 0);
      
      // Dispatch a specific event for payment addition
      window.dispatchEvent(new CustomEvent('paymentAdded', {
        detail: { payment: result }
      }));
      
      return result;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  }

  async recordPayment(paymentId, paymentMethod) {
    try {
      // First, get the current payment data
      const payments = await this.getPayments();
      const index = payments.findIndex(p => p.id == paymentId);
      if (index !== -1) {
        const originalPayment = payments[index];
        console.log('Recording payment:', originalPayment);
        
        const updatedPayment = {
          ...originalPayment,
          status: 'paid',
          paidDate: Timestamp.now(), // Use Firebase Timestamp for consistency
          method: paymentMethod,
          receipt: `RCT-${Date.now()}`,
          amount: parseFloat(originalPayment.amount) || 0
        };
        
        console.log('Updated payment:', updatedPayment);
        
        // Update in Firebase
        const result = await updatePayment(paymentId, updatedPayment);
        console.log('Payment update result:', result);
        
        // Instead of immediately recalculating, let's ensure the data is synced
        // Wait a short moment to ensure Firebase has processed the update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update student fees based on all payments for that student
        await this.updateStudentFees(updatedPayment.studentId, updatedPayment.amount);
        
        // Dispatch a specific event for payment recording
        window.dispatchEvent(new CustomEvent('paymentRecorded', {
          detail: { payment: result }
        }));
        
        // Also dispatch the studentsUpdated event to ensure dashboard refreshes
        window.dispatchEvent(new Event('studentsUpdated'));
        
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  async updatePayment(updatedPayment) {
    try {
      const paymentWithAmount = {
        ...updatedPayment,
        amount: parseFloat(updatedPayment.amount) || 0
      };
      
      // Update in Firebase
      const result = await updatePayment(updatedPayment.id, paymentWithAmount);
      
      // Update student fees to reflect the payment changes
      await this.updateStudentFees(updatedPayment.studentId, 0);
      
      // Trigger bidirectional sync
      await this.bidirectionalSync('payment', updatedPayment.id);
      
      // Dispatch a specific event for payment update
      window.dispatchEvent(new CustomEvent('paymentUpdated', {
        detail: { payment: result }
      }));
      
      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  async deletePayment(paymentId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Delete from Firebase
        await deletePayment(paymentId);
        return paymentId;
      } catch (error) {
        console.error('Failed to delete payment from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async updateStudentFees(studentId, paidAmount) {
    try {
      // Add a small delay to ensure Firebase data consistency
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get all students and payments
      const students = await this.getStudents();
      const payments = await this.getPayments();
      
      // Use getStudentById to properly find the student by either studentId or id
      const student = await this.getStudentById(studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found for fee update`);
        return null;
      }
      
      // Find the index using the correct ID field
      const index = students.findIndex(s => s.id == student.id || s.studentId == student.studentId);
      if (index === -1) {
        console.warn(`Student index not found for ID ${studentId}`);
        return null;
      }
      
      // Get all payments for this specific student
      const studentPayments = payments.filter(p => p.studentId == studentId);
      
      // Calculate fees based on payment statuses with proper validation
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      
      studentPayments.forEach(payment => {
        // Validate payment amount
        const amount = parseFloat(payment.amount) || 0;
        
        // Only count valid amounts
        if (amount > 0) {
          switch (payment.status) {
            case 'paid':
              totalPaid += amount;
              break;
            case 'pending':
              totalPending += amount;
              break;
            case 'overdue':
              totalOverdue += amount;
              break;
            default:
              // For any other status, treat as pending
              totalPending += amount;
          }
        }
      });
      
      // Calculate total fees based on student details, not just sum of payments
      // This ensures pending fees are calculated correctly based on what the student owes
      const studentTotalFees = parseFloat(student.totalFees) || 0;
      const calculatedTotalFees = totalPaid + totalPending + totalOverdue;
      
      // Create updated student object with proper pending fees calculation
      // Pending fees should be based on student's total fees minus paid fees
      const updatedStudent = {
        ...student,
        feesPaid: totalPaid,
        feesDue: Math.max(0, studentTotalFees - totalPaid), // Pending fees based on student details
        totalFees: studentTotalFees // Use student's defined total fees
      };
      
      // Only update if values have actually changed
      const hasChanged = 
        student.feesPaid !== updatedStudent.feesPaid || 
        student.feesDue !== updatedStudent.feesDue ||
        student.totalFees !== updatedStudent.totalFees;
      
      if (hasChanged) {
        // Update the student in Firebase directly
        console.log(`Updating student fees for ${studentId}:`, updatedStudent);
        const result = await updateStudent(student.id, updatedStudent);
        console.log(`Student fees update result for ${studentId}:`, result);
        
        // Update the local students array to ensure consistency
        students[index] = updatedStudent;
        
        console.log(`Student fees updated for ${studentId}: Paid=${totalPaid}, Due=${updatedStudent.feesDue}`);
        
        // Dispatch storage event to notify all components with updated data
        window.dispatchEvent(new StorageEvent('storage', {
          key: this.studentsKey,
          newValue: JSON.stringify(students)
        }));
        
        // Dispatch studentsUpdated event to notify dashboards
        window.dispatchEvent(new Event('studentsUpdated'));
        
        return result;
      }
      
      console.log(`No fee changes for student ${studentId}`);
      return student; // No changes needed
    } catch (error) {
      console.error('Error updating student fees:', error);
      throw error;
    }
  }

  async getPaymentStatistics() {
    try {
      // Get fresh data directly from source
      const payments = await this.getPayments();
      const students = await this.getStudents();
      
      // Validate and filter payments
      const validPayments = payments.filter(payment => 
        payment && 
        payment.amount !== undefined && 
        payment.amount !== null &&
        !isNaN(parseFloat(payment.amount))
      );
      
      // Initialize counters
      let totalCollected = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      let totalStudentsWithPayments = 0;
      
      // Process payments by status with proper validation
      validPayments.forEach(payment => {
        const amount = parseFloat(payment.amount) || 0;
        
        if (amount > 0) {
          switch (payment.status) {
            case 'paid':
              totalCollected += amount;
              break;
            case 'pending':
              totalPending += amount;
              break;
            case 'overdue':
              totalOverdue += amount;
              break;
            default:
              // Treat unknown statuses as pending for safety
              totalPending += amount;
          }
        }
      });
      
      // Calculate student-based statistics
      let totalStudentPending = 0;
      let totalStudentPaid = 0;
      let totalStudentFees = 0;
      
      students.forEach(student => {
        const feesPaid = parseFloat(student.feesPaid) || 0;
        const feesDue = parseFloat(student.feesDue) || 0;
        const totalFees = feesPaid + feesDue;
        
        totalStudentPaid += feesPaid;
        totalStudentPending += feesDue;
        totalStudentFees += totalFees;
        
        // Count students with payments
        if (totalFees > 0) {
          totalStudentsWithPayments++;
        }
      });
      
      // Calculate consistency check - ensure payment-based and student-based totals match
      const paymentBasedTotal = totalCollected + totalPending + totalOverdue;
      const studentBasedTotal = totalStudentPaid + totalStudentPending;
      
      return {
        totalStudents: students.length,
        totalStudentsWithPayments,
        totalCollected,
        totalPending,
        totalOverdue,
        totalStudentPending,
        totalStudentPaid,
        totalStudentFees,
        paymentBasedTotal,
        studentBasedTotal,
        // Provide both for comparison and debugging
        consistencyCheck: {
          paymentTotal: paymentBasedTotal,
          studentTotal: studentBasedTotal,
          difference: Math.abs(paymentBasedTotal - studentBasedTotal)
        }
      };
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      // Return safe fallback values
      return {
        totalStudents: 0,
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
      };
    }
  }

  // Recalculate all student fees based on current payment data
  async recalculateAllStudentFees() {
    try {
      console.log('Recalculating all student fees...');
      
      // Get all students and payments
      const students = await this.getStudents();
      const payments = await this.getPayments();
      
      // Create a map of payments by student ID for efficient lookup
      const paymentsByStudent = {};
      payments.forEach(payment => {
        if (payment.studentId) {
          if (!paymentsByStudent[payment.studentId]) {
            paymentsByStudent[payment.studentId] = [];
          }
          paymentsByStudent[payment.studentId].push(payment);
        }
      });
      
      // Update each student's fees
      let updatedStudentsCount = 0;
      
      // Process each student individually to update in Firebase
      for (const student of students) {
        const studentId = student.studentId || student.id;
        const studentPayments = paymentsByStudent[studentId] || [];
        
        // Calculate fees based on payment statuses
        let totalPaid = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        
        studentPayments.forEach(payment => {
          const amount = parseFloat(payment.amount) || 0;
          
          // Only count valid positive amounts
          if (amount > 0) {
            switch (payment.status) {
              case 'paid':
                totalPaid += amount;
                break;
              case 'pending':
                totalPending += amount;
                break;
              case 'overdue':
                totalOverdue += amount;
                break;
              default:
                // For any other status, treat as pending
                totalPending += amount;
            }
          }
        });
        
        // Calculate total fees based on student details, not just sum of payments
        // This ensures pending fees are calculated correctly based on what the student owes
        const studentTotalFees = parseFloat(student.totalFees) || 0;
        const calculatedTotalFees = totalPaid + totalPending + totalOverdue;
        
        // Create updated student object with proper pending fees calculation
        // Pending fees should be based on student's total fees minus paid fees
        const updatedStudent = {
          ...student,
          feesPaid: totalPaid,
          feesDue: Math.max(0, studentTotalFees - totalPaid), // Pending fees based on student details
          totalFees: studentTotalFees // Use student's defined total fees
        };
        
        // Check if student was actually updated
        const hasChanged = 
          student.feesPaid !== updatedStudent.feesPaid || 
          student.feesDue !== updatedStudent.feesDue ||
          student.totalFees !== updatedStudent.totalFees;
        
        if (hasChanged) {
          // Update the student in Firebase directly
          try {
            await updateStudent(student.id, updatedStudent);
            updatedStudentsCount++;
            console.log(`Updated fees for student ${studentId}: Paid=${totalPaid}, Due=${updatedStudent.feesDue}`);
          } catch (error) {
            console.error(`Error updating fees for student ${studentId}:`, error);
          }
        }
      }
      
      if (updatedStudentsCount > 0) {
        console.log(`Recalculated fees for ${updatedStudentsCount} students`);
        
        // Dispatch storage event to notify all components
        window.dispatchEvent(new StorageEvent('storage', {
          key: this.studentsKey,
          newValue: Date.now().toString()
        }));
        
        // Dispatch studentsUpdated event to notify dashboards
        window.dispatchEvent(new Event('studentsUpdated'));
        
        return {
          success: true,
          studentsUpdated: updatedStudentsCount,
          totalStudents: students.length
        };
      }
      
      console.log('No fee changes needed for any students');
      return {
        success: true,
        studentsUpdated: 0,
        totalStudents: students.length
      };
    } catch (error) {
      console.error('Error recalculating all student fees:', error);
      throw error;
    }
  }

  // Bidirectional sync: Update student information in payments when student data changes
  async syncStudentDataToPayments(studentId) {
    try {
      console.log(`Syncing student data to payments for student ID: ${studentId}`);
      
      // Get the updated student information
      const student = await this.getStudentById(studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found for sync`);
        return;
      }
      
      // Get all payments
      const payments = await this.getPayments();
      
      // Update payments with current student information
      let updatedPaymentsCount = 0;
      const updatedPayments = payments.map(payment => {
        if (payment.studentId === studentId) {
          const updatedPayment = {
            ...payment,
            studentName: student.name,
            studentClass: student.class,
            studentContact: student.contact
          };
          
          // Check if payment was actually updated
          if (JSON.stringify(payment) !== JSON.stringify(updatedPayment)) {
            updatedPaymentsCount++;
          }
          
          return updatedPayment;
        }
        return payment;
      });
      
      // Save updated payments if any changes were made
      if (updatedPaymentsCount > 0) {
        this.savePayments(updatedPayments);
        console.log(`Updated ${updatedPaymentsCount} payments with student information`);
        
        // Dispatch storage event to notify all components
        window.dispatchEvent(new StorageEvent('storage', {
          key: this.paymentsKey,
          newValue: JSON.stringify(updatedPayments)
        }));
      }
      
      return updatedPaymentsCount;
    } catch (error) {
      console.error('Error syncing student data to payments:', error);
      throw error;
    }
  }

  // Bidirectional sync: Update student fees based on payment changes
  async syncPaymentDataToStudents(paymentId) {
    try {
      console.log(`Syncing payment data to students for payment ID: ${paymentId}`);
      
      // Get the updated payment
      const payments = await this.getPayments();
      const payment = payments.find(p => p.id === paymentId);
      
      if (!payment) {
        console.warn(`Payment with ID ${paymentId} not found for sync`);
        return;
      }
      
      // Update student fees based on all payments for that student
      const result = await this.updateStudentFees(payment.studentId, 0);
      
      return result;
    } catch (error) {
      console.error('Error syncing payment data to students:', error);
      throw error;
    }
  }

  // Additional function to update student fees after a specific payment update
  async updateStudentFeesAfterPaymentUpdate(studentId, updatedPayment) {
    try {
      // Get all students
      const students = await this.getStudents();
      
      // Use getStudentById to properly find the student by either studentId or id
      const student = await this.getStudentById(studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found for fee update`);
        return null;
      }
      
      // Find the index using the correct ID field
      const index = students.findIndex(s => s.id == student.id || s.studentId == student.studentId);
      if (index === -1) {
        console.warn(`Student index not found for ID ${studentId}`);
        return null;
      }
      
      // Get all payments for this specific student
      const allPayments = await this.getPayments();
      const studentPayments = allPayments.filter(p => p.studentId == studentId);
      
      // Calculate fees based on payment statuses with proper validation
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      
      studentPayments.forEach(payment => {
        // Validate payment amount
        const amount = parseFloat(payment.amount) || 0;
        
        // Only count valid amounts
        if (amount > 0) {
          switch (payment.status) {
            case 'paid':
              totalPaid += amount;
              break;
            case 'pending':
              totalPending += amount;
              break;
            case 'overdue':
              totalOverdue += amount;
              break;
            default:
              // For any other status, treat as pending
              totalPending += amount;
          }
        }
      });
      
      // Calculate total fees
      const totalFees = totalPaid + totalPending + totalOverdue;
      
      // Create updated student object
      const updatedStudent = {
        ...student,
        feesPaid: totalPaid,
        feesDue: totalPending + totalOverdue,
        totalFees: totalFees
      };
      
      // Only update if values have actually changed
      const hasChanged = 
        student.feesPaid !== updatedStudent.feesPaid || 
        student.feesDue !== updatedStudent.feesDue ||
        student.totalFees !== updatedStudent.totalFees;
      
      if (hasChanged) {
        // Update the student in Firebase directly
        const result = await updateStudent(student.id, updatedStudent);
        
        console.log(`Student fees updated for ${studentId}: Paid=${totalPaid}, Due=${totalPending + totalOverdue}`);
        
        // Dispatch storage event to notify all components
        window.dispatchEvent(new StorageEvent('storage', {
          key: this.studentsKey,
          newValue: JSON.stringify(students)
        }));
        
        // Dispatch studentsUpdated event to notify dashboards
        window.dispatchEvent(new Event('studentsUpdated'));
        
        return result;
      }
      
      console.log(`No fee changes for student ${studentId}`);
      return student; // No changes needed
    } catch (error) {
      console.error('Error updating student fees after payment update:', error);
      return null;
    }
  }

  // Comprehensive bidirectional sync function
  async bidirectionalSync(changedEntity, entityId) {
    try {
      console.log(`Performing bidirectional sync for ${changedEntity} with ID: ${entityId}`);
      
      switch (changedEntity) {
        case 'student':
          // When a student is updated, update all their payments
          await this.syncStudentDataToPayments(entityId);
          break;
          
        case 'payment':
          // When a payment is updated, recalculate student fees
          await this.syncPaymentDataToStudents(entityId);
          break;
          
        default:
          console.warn(`Unknown entity type for bidirectional sync: ${changedEntity}`);
      }
    } catch (error) {
      console.error('Error in bidirectional sync:', error);
      throw error;
    }
  }

  async syncAllData() {
    try {
      console.log('Starting comprehensive data synchronization...');
      
      // Get all students and payments
      const students = await this.getStudents();
      const payments = await this.getPayments();
      
      console.log(`Found ${students.length} students and ${payments.length} payments`);
      
      // Create a map of student data for quick lookup
      const studentMap = {};
      students.forEach(student => {
        studentMap[student.studentId || student.id] = student;
      });
      
      // Track changes
      let updatedPaymentsCount = 0;
      let updatedStudentsCount = 0;
      
      // Update all payments with current student information
      const updatedPayments = payments.map(payment => {
        const student = studentMap[payment.studentId];
        if (student) {
          const updatedPayment = {
            ...payment,
            studentName: student.name,
            studentClass: student.class,
            studentContact: student.contact
          };
          
          // Check if payment was actually updated
          if (JSON.stringify(payment) !== JSON.stringify(updatedPayment)) {
            updatedPaymentsCount++;
            return updatedPayment;
          }
        }
        return payment;
      });
      
      // Save updated payments if any changes were made
      if (updatedPaymentsCount > 0) {
        this.savePayments(updatedPayments);
        console.log(`Updated ${updatedPaymentsCount} payments with student information`);
      }
      
      // Recalculate all student fees based on current payment data
      const feeRecalculationResult = await this.recalculateAllStudentFees();
      updatedStudentsCount = feeRecalculationResult.studentsUpdated;
      
      // Dispatch storage events to notify all components
      if (updatedPaymentsCount > 0 || updatedStudentsCount > 0) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'feesManagementSync',
          newValue: Date.now().toString()
        }));
      }
      
      console.log('Comprehensive data synchronization completed successfully');
      
      return {
        paymentsUpdated: updatedPaymentsCount,
        studentsUpdated: updatedStudentsCount,
        totalPayments: updatedPayments.length,
        totalStudents: students.length
      };
    } catch (error) {
      console.error('Error in comprehensive data synchronization:', error);
      throw error;
    }
  }
  
  // Staff operations
  async getStaff() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        const staff = await getStaff();
        console.log('Fetched staff from Firebase:', staff);
        return staff;
      } catch (error) {
        console.error('Failed to get staff from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async addStaff(staffData) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Generate staffId if not provided
        const newStaff = {
          ...staffData,
          staffId: staffData.staffId || `STF${String(Date.now()).slice(-4)}`,
          createdAt: staffData.createdAt || new Date().toISOString(),
          ownerId: getCurrentUserUID() // Add owner ID for security rules
        };
        
        // Remove the custom id field if it exists to avoid confusion
        delete newStaff.id;
        
        // Add to Firebase
        const result = await addStaff(newStaff);
        console.log('Staff added result:', result);
        
        // Dispatch staffUpdated event to notify all components
        window.dispatchEvent(new Event('staffUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to add staff to Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async updateStaff(updatedStaff) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Update in Firebase using the Firebase document ID
        const result = await updateStaff(updatedStaff.id, updatedStaff);
        console.log('Staff update result:', result);
        
        // Dispatch staffUpdated event to notify all components
        window.dispatchEvent(new Event('staffUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to update staff in Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async deleteStaff(firebaseDocId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Delete from Firebase using the Firebase document ID
        await deleteStaff(firebaseDocId);
        
        // Dispatch staffDeleted event to notify all components
        window.dispatchEvent(new Event('staffDeleted'));
        
        return firebaseDocId;
      } catch (error) {
        console.error('Failed to delete staff from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  // Staff Attendance operations
  async getStaffAttendance() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        const attendance = await getStaffAttendance();
        console.log('Fetched staff attendance from Firebase:', attendance);
        return attendance;
      } catch (error) {
        console.error('Failed to get staff attendance from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async addStaffAttendance(attendanceData) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Add to Firebase
        const result = await addStaffAttendance(attendanceData);
        console.log('Staff attendance added result:', result);
        
        // Dispatch attendanceUpdated event to notify all components
        window.dispatchEvent(new Event('attendanceUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to add staff attendance to Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async updateStaffAttendance(updatedAttendance) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Validate that we have a valid ID before attempting update
        if (!updatedAttendance || !updatedAttendance.id) {
          throw new Error('Valid attendance record with ID is required for update operation');
        }
        
        // Update in Firebase using the Firebase document ID
        const result = await updateStaffAttendance(updatedAttendance.id, updatedAttendance);
        console.log('Staff attendance update result:', result);
        
        // Dispatch attendanceUpdated event to notify all components
        window.dispatchEvent(new Event('attendanceUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to update staff attendance in Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async deleteStaffAttendance(attendanceId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Validate that we have a valid ID before attempting delete
        if (!attendanceId) {
          throw new Error('Valid attendance ID is required for delete operation');
        }
        
        // Delete from Firebase
        await deleteStaffAttendance(attendanceId);
        
        // Dispatch attendanceDeleted event to notify all components
        window.dispatchEvent(new Event('attendanceDeleted'));
        
        return attendanceId;
      } catch (error) {
        console.error('Failed to delete staff attendance from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  // Regular Attendance operations (for student attendance)
  async getAttendance() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        const attendance = await getAttendance();
        console.log('Fetched attendance from Firebase:', attendance);
        return attendance;
      } catch (error) {
        console.error('Failed to get attendance from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async addAttendance(attendanceData) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Add to Firebase
        const result = await addAttendance(attendanceData);
        console.log('Attendance added result:', result);
        
        // Dispatch attendanceUpdated event to notify all components
        window.dispatchEvent(new Event('attendanceUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to add attendance to Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async updateAttendance(updatedAttendance) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Update in Firebase
        const result = await updateAttendance(updatedAttendance.id, updatedAttendance);
        console.log('Attendance update result:', result);
        
        // Dispatch attendanceUpdated event to notify all components
        window.dispatchEvent(new Event('attendanceUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to update attendance in Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }
  
  async deleteAttendance(attendanceId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Delete from Firebase
        await deleteAttendance(attendanceId);
        
        // Dispatch attendanceDeleted event to notify all components
        window.dispatchEvent(new Event('attendanceDeleted'));
        
        return attendanceId;
      } catch (error) {
        console.error('Failed to delete attendance from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  // Expenditure operations
  async getExpenditures() {
    if (this.useFirebase && isAuthenticated()) {
      try {
        const expenditures = await getExpenditures();
        return expenditures;
      } catch (error) {
        console.warn('Failed to get expenditures from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async addExpenditure(expenditureData) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Add to Firebase
        const result = await addExpenditure(expenditureData);
        console.log('Expenditure added result:', result);
        
        // Dispatch expenditureUpdated event to notify all components
        window.dispatchEvent(new Event('expenditureUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to add expenditure to Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async updateExpenditure(updatedExpenditure) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Update in Firebase
        const result = await updateExpenditure(updatedExpenditure.id, updatedExpenditure);
        console.log('Expenditure update result:', result);
        
        // Dispatch expenditureUpdated event to notify all components
        window.dispatchEvent(new Event('expenditureUpdated'));
        
        return result;
      } catch (error) {
        console.error('Failed to update expenditure in Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async deleteExpenditure(expenditureId) {
    if (this.useFirebase && isAuthenticated()) {
      try {
        // Delete from Firebase
        await deleteExpenditure(expenditureId);
        
        // Dispatch expenditureDeleted event to notify all components
        window.dispatchEvent(new Event('expenditureDeleted'));
        
        return expenditureId;
      } catch (error) {
        console.error('Failed to delete expenditure from Firebase:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async getFeedback() {
    if (this.useFirebase) {
      try {
        return await getFeedback();
      } catch (error) {
        console.error('DataManager: Error fetching feedback:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

  async getSupportQueries() {
    if (this.useFirebase) {
      try {
        return await getSupportQueries();
      } catch (error) {
        console.error('DataManager: Error fetching support queries:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase is required for multi-tenancy - localStorage fallback removed');
    }
  }

}

export default new DataManager();
