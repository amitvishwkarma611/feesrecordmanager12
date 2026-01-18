/**
 * Standalone WhatsApp Reminder Helper
 * Enables sending WhatsApp fee reminder messages to students using WhatsApp Web/App
 * with prefilled message, triggered from existing buttons or actions.
 */

class WhatsAppReminderHelper {
  constructor() {
    // Minimum delay between bulk messages (1500ms as specified)
    this.BULK_MESSAGE_DELAY = 1500;
    this.brandingInfo = null;
    // Rate limiting: track when messages were sent to each student
    this.MESSAGE_TRACKING_KEY = 'whatsapp_message_tracking';
  }

  /**
   * Initialize the helper with branding information
   */
  async initializeBranding() {
    try {
      // Try to get branding info from the application
      if (window.getBrandingSettings && typeof window.getBrandingSettings === 'function') {
        this.brandingInfo = await window.getBrandingSettings();
      } else {
        // Look for branding info in other common places
        if (window.appState && window.appState.firmName) {
          this.brandingInfo = { firmName: window.appState.firmName };
        } else if (document.querySelector('[data-firm-name]')) {
          this.brandingInfo = { firmName: document.querySelector('[data-firm-name]').getAttribute('data-firm-name') };
        } else {
          // Default fallback
          this.brandingInfo = { firmName: 'Our Institute' };
        }
      }
    } catch (error) {
      console.warn('Could not load branding info for WhatsApp reminders:', error);
      this.brandingInfo = { firmName: 'Our Institute' };
    }
  }

  /**
   * Get cycle months mapping for fee collection frequency
   * @param {string} frequency - Fee collection frequency (Monthly, Every 2 Month, etc.)
   * @returns {number} Number of months for the cycle
   */
  getFrequencyGap(frequency) {
    const cycleMap = {
      'Monthly': 1,
      'Every 2 Month': 2,
      'Every 3 Month': 3,
      'Every 4 Month': 4,
      'Custom Date': 0 // Special case for custom dates
    };
    
    return cycleMap[frequency] || 1; // Default to monthly if unknown
  }

  /**
   * Calculate total installments based on fee collection frequency
   * @param {string} frequency - Fee collection frequency
   * @returns {number} Total number of installments for the academic year
   */
  getTotalInstallments(frequency) {
    const installmentMap = {
      'Monthly': 10, // 10 months academic year
      'Every 2 Month': 5, // 10/2 = 5 installments
      'Every 3 Month': 4, // 10/3 ≈ 3.33, rounded down to 4 (covers 12 months)
      'Every 4 Month': 3, // 10/4 = 2.5, rounded down to 3 (covers 12 months)
      'Custom Date': 1  // Single installment
    };
    
    return installmentMap[frequency] || 10; // Default to 10 monthly installments
  }

  /**
   * Calculate installment amount for a student
   * @param {Object} student - Student object with fee information
   * @returns {number} Amount per installment
   */
  installmentAmount(student) {
    const totalFees = parseFloat(student.totalFees || 0);
    const frequency = student.feesCollectionFrequency || student.feesCollectionDate || 'Monthly';
    const totalInstallments = this.getTotalInstallments(frequency);
    
    if (totalInstallments <= 0) return 0;
    
    return totalFees / totalInstallments;
  }

  /**
   * Calculate how many installments should be paid till today based on admission date
   * @param {Object} student - Student object with fee information
   * @returns {number} Number of expected installments till today
   */
  expectedInstallmentsTillNow(student) {
    if (!student.admissionDate) {
      // If no admission date, default to 0 expected installments
      return 0;
    }
    
    const admissionDate = new Date(student.admissionDate);
    const today = new Date();
    
    // Calculate months passed since admission
    let monthsPassed = (today.getFullYear() - admissionDate.getFullYear()) * 12;
    monthsPassed += today.getMonth() - admissionDate.getMonth();
    
    // If the day of the month hasn't reached yet, subtract a month
    if (today.getDate() < admissionDate.getDate()) {
      monthsPassed--;
    }
    
    const frequency = student.feesCollectionFrequency || student.feesCollectionDate || 'Monthly';
    const frequencyGap = this.getFrequencyGap(frequency);
    
    if (frequency === 'Custom Date') {
      // For custom date, check if today is after the custom due date
      if (student.customDueDate) {
        const customDueDate = new Date(student.customDueDate);
        return today > customDueDate ? 1 : 0;
      }
      return 0;
    }
    
    if (frequencyGap <= 0) {
      // If somehow frequency gap is 0 or negative, return 0
      return 0;
    }
    
    // Calculate expected installments: floor(monthsPassed / frequencyGap)
    // DO NOT add +1, the admission month is not counted as a due installment
    const expectedInstallments = Math.floor(monthsPassed / frequencyGap);
    
    // Make sure it doesn't exceed the total installments for the academic year
    const maxInstallments = this.getTotalInstallments(frequency);
    return Math.min(expectedInstallments, maxInstallments);
  }

  /**
   * Calculate expected fees till today based on admission date
   * @param {Object} student - Student object with fee information
   * @returns {number} Expected fees till today
   */
  expectedFeesTillNow(student) {
    const expectedInstallments = this.expectedInstallmentsTillNow(student);
    const installmentAmount = this.installmentAmount(student);
    
    return expectedInstallments * installmentAmount;
  }

  /**
   * Calculate next due date for a student based on fee collection frequency
   * @param {Object} student - Student object with fee information
   * @returns {Date|null} Next due date or null if cannot calculate
   */
  getNextDueDate(student) {
    try {
      // Determine base date for calculation
      let baseDate = null;
      
      // If feesPaid > 0, use lastPaymentDate (derived from feesPaid date or similar)
      // If feesPaid == 0, use admissionDate
      if ((student.feesPaid && parseFloat(student.feesPaid) > 0) || (student.totalFees && parseFloat(student.totalFees) > parseFloat(student.feesPaid || 0))) {
        // If student has made payments, try to get the last payment date
        // In the current system, we'll derive it from when fees were last updated
        // For now, we'll use a heuristic: if feesPaid > 0, assume last payment date
        if (student.lastPaymentDate) {
          baseDate = new Date(student.lastPaymentDate);
        } else {
          // If no explicit last payment date, we'll use a heuristic
          // For now, just use current date as a fallback
          baseDate = new Date();
        }
      } else {
        // If no payments made, use admission date
        if (student.admissionDate) {
          baseDate = new Date(student.admissionDate);
        } else {
          // Default to current date if no admission date available
          baseDate = new Date();
        }
      }
      
      // If base date is invalid, use current date
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
      
      // Handle custom due date frequency
      if (student.feesCollectionFrequency === 'Custom Date' && student.customDueDate) {
        if (student.customDueDate instanceof Date) {
          return student.customDueDate;
        } else if (typeof student.customDueDate === 'string') {
          return new Date(student.customDueDate);
        } else if (typeof student.customDueDate === 'number') {
          return new Date(student.customDueDate);
        }
      }
      
      // Handle regular cycles
      if (student.feesCollectionFrequency) {
        const cycleMonths = this.getFrequencyGap(student.feesCollectionFrequency);
        
        // For custom date frequency, return the custom date
        if (cycleMonths === 0 && student.customDueDate) {
          if (student.customDueDate instanceof Date) {
            return student.customDueDate;
          } else if (typeof student.customDueDate === 'string') {
            return new Date(student.customDueDate);
          } else if (typeof student.customDueDate === 'number') {
            return new Date(student.customDueDate);
          }
        }
        
        // For regular cycles, add the cycle months to the base date
        const nextDue = new Date(baseDate);
        nextDue.setMonth(nextDue.getMonth() + cycleMonths);
        
        return nextDue;
      }
      
      // Fallback: return current date if unable to calculate
      console.warn('Cannot calculate next due date for student:', student.id || student.name);
      return new Date();
    } catch (error) {
      console.error('Error calculating next due date:', error);
      return new Date(); // Return current date as fallback
    }
  }

  /**
   * Check if a student is overdue based on expected fees till today
   * A student is overdue ONLY IF: pendingFees > 0 AND expectedFees > 0 AND feesPaid < expectedFees
   * @param {Object} student - Student object with fee information
   * @returns {boolean} True if student is overdue, false otherwise
   */
  isOverdue(student) {
    try {
      // Calculate pending amount: totalFees - feesPaid
      const totalFees = parseFloat(student.totalFees || 0);
      const feesPaid = parseFloat(student.feesPaid || 0);
      const pendingAmount = totalFees - feesPaid;
      
      // Must have pending amount > 0
      if (pendingAmount <= 0) {
        return false;
      }
      
      // Calculate expected fees till today based on admission date and payment schedule
      const expectedFees = this.expectedFeesTillNow(student);
      
      // Student is overdue only if:
      // 1. Pending fees > 0 (already checked above)
      // 2. Expected fees > 0 (student has passed at least one payment cycle)
      // 3. Fees paid < expected fees
      return expectedFees > 0 && feesPaid < expectedFees;
    } catch (error) {
      console.error('Error checking if student is overdue:', error);
      return false;
    }
  }

  /**
   * Build WhatsApp message with due date information
   * @param {Object} student - Student object with fee information
   * @returns {string} Formatted WhatsApp message
   */
  buildWhatsAppMessage(student) {
    try {
      const parentName = student.fatherName || 'Parent';
      const studentName = student.name || 'Student';
      const className = student.class || 'N/A';
      const pendingAmount = (parseFloat(student.totalFees || 0) - parseFloat(student.feesPaid || 0)).toString();
      const instituteName = this.brandingInfo?.firmName || 'Our Institute';
      
      return `Dear ${parentName},

We hope this message finds you well. We would like to inform you that fees amounting to ₹${pendingAmount} for ${studentName} (${className}) are currently pending.

We kindly request you to arrange the payment at your earliest convenience.

Best regards,
${instituteName}`;
    } catch (error) {
      console.error('Error building WhatsApp message:', error);
      // Fallback to exact required format
      const parentName = student.fatherName || 'Parent';
      const studentName = student.name || 'Student';
      const className = student.class || 'N/A';
      const pendingAmount = (parseFloat(student.totalFees || 0) - parseFloat(student.feesPaid || 0)).toString();
      const instituteName = this.brandingInfo?.firmName || 'Our Institute';
      
      return `Dear ${parentName},

We hope this message finds you well. We would like to inform you that fees amounting to ₹${pendingAmount} for ${studentName} (${className}) are currently pending.

We kindly request you to arrange the payment at your earliest convenience.

Best regards,
${instituteName}`;
    }
  }

  /**
   * Generate the WhatsApp message template (legacy method - now uses buildWhatsAppMessage)
   * @param {string} parentName - Parent's name
   * @param {string} studentName - Student's name
   * @param {string} pendingAmount - Pending amount
   * @returns {string} Formatted message
   */
  generateMessage(parentName, studentName, pendingAmount) {
    const instituteName = this.brandingInfo?.firmName || 'Our Institute';
    
    return `Dear ${parentName},

We hope this message finds you well. We would like to inform you that fees amounting to ₹${pendingAmount} for ${studentName} are currently pending.

We kindly request you to arrange the payment at your earliest convenience.

Best regards,
${instituteName}`;
  }

  /**
   * Encode message for URL
   * @param {string} message - Message to encode
   * @returns {string} Encoded message
   */
  encodeMessage(message) {
    return encodeURIComponent(message);
  }

  /**
   * Open WhatsApp with prefilled message
   * @param {string} mobileNumber - Mobile number (without country code)
   * @param {string} message - Message to send
   */
  openWhatsApp(mobileNumber, message) {
    if (!mobileNumber) {
      console.warn('Mobile number is missing, cannot send WhatsApp reminder');
      return;
    }

    // Ensure mobile number is 10 digits and add country code
    const cleanNumber = mobileNumber.toString().replace(/\D/g, '');
    let fullNumber;
    
    if (cleanNumber.length === 10) {
      // Indian number, add country code
      fullNumber = `91${cleanNumber}`;
    } else if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
      // Already has country code
      fullNumber = cleanNumber;
    } else {
      console.warn('Invalid mobile number format:', mobileNumber);
      return;
    }

    const encodedMessage = this.encodeMessage(message);
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  }

  /**
   * Send single WhatsApp reminder using universal logic
   * @param {Object} studentData - Student information
   */
  async sendSingleReminder(studentData) {
    await this.initializeBranding();

    // Validate student has pending amount using the correct formula
    const totalFees = parseFloat(studentData.totalFees || 0);
    const feesPaid = parseFloat(studentData.feesPaid || 0);
    const pendingAmount = totalFees - feesPaid;
    
    if (pendingAmount <= 0) {
      console.warn('Cannot send reminder: No pending amount for student', studentData.id || studentData.name);
      return;
    }

    // Validate mobile number
    const mobileNumber = studentData.contact || studentData.mobile || studentData.phoneNumber;
    if (!mobileNumber) {
      console.warn('Cannot send reminder: Missing mobile number for student', studentData.id || studentData.name);
      return;
    }

    // Check rate limit: only one message per student per day
    const studentId = studentData.id || studentData.name || mobileNumber;
    if (!this.canSendMessageToStudent(studentId)) {
      console.warn('Cannot send reminder: Rate limit exceeded for student', studentId);
      // Optionally show a user-friendly message
      alert(`Message already sent to ${studentData.name || 'this student'} today. Maximum one message per day allowed.`);
      return;
    }

    // Use the new universal message builder
    const message = this.buildWhatsAppMessage(studentData);
    this.openWhatsApp(mobileNumber, message);
    
    // Record that a message was sent to this student
    this.recordMessageSent(studentId);
  }

  /**
   * Send bulk WhatsApp reminders with delays using universal logic
   * @param {Array} studentsData - Array of student information
   */
  async sendBulkReminders(studentsData) {
    await this.initializeBranding();

    // Filter for students who are actually overdue
    const overdueStudents = studentsData.filter(student => this.isOverdue(student));
    
    if (overdueStudents.length === 0) {
      console.warn('No overdue students found for bulk reminders');
      return;
    }

    console.log(`Sending WhatsApp reminders to ${overdueStudents.length} overdue students`);
    
    // Filter students based on rate limit (one message per student per day)
    const studentsToSend = overdueStudents.filter(student => {
      const mobileNumber = student.contact || student.mobile || student.phoneNumber;
      const studentId = student.id || student.name || mobileNumber;
      return this.canSendMessageToStudent(studentId);
    });
    
    if (studentsToSend.length === 0) {
      console.warn('No students eligible for reminders after rate limit check');
      alert('All students have already received messages today. Maximum one message per student per day allowed.');
      return;
    }
    
    console.log(`Sending WhatsApp reminders to ${studentsToSend.length} students after rate limit check`);

    for (let i = 0; i < studentsToSend.length; i++) {
      const student = studentsToSend[i];
      
      // Validate student has pending amount using the correct formula
      const totalFees = parseFloat(student.totalFees || 0);
      const feesPaid = parseFloat(student.feesPaid || 0);
      const pendingAmount = totalFees - feesPaid;
      
      if (pendingAmount <= 0) {
        console.warn(`Skipping student ${student.name}: No pending amount`);
        continue;
      }

      // Validate mobile number
      const mobileNumber = student.contact || student.mobile || student.phoneNumber;
      if (!mobileNumber) {
        console.warn(`Skipping student ${student.name}: Missing mobile number`);
        continue;
      }

      // Use the new universal message builder
      const message = this.buildWhatsAppMessage(student);
      this.openWhatsApp(mobileNumber, message);
      
      // Record that a message was sent to this student
      const studentId = student.id || student.name || mobileNumber;
      this.recordMessageSent(studentId);
      
      // Add delay between messages to avoid spam detection
      if (i < studentsToSend.length - 1) {
        await this.delay(this.BULK_MESSAGE_DELAY);
      }
    }
  }

  /**
   * Add event listeners to existing elements for WhatsApp functionality
   * Uses event delegation to attach to dynamically created elements
   */
  attachToExistingButtons() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
      });
    } else {
      this.setupEventListeners();
    }
  }

  /**
   * Internal method to set up event listeners
   */
  setupEventListeners() {
    // Use event delegation to handle dynamically created elements
    document.addEventListener('click', async (event) => {
      // Check for single student reminder
      if (event.target.closest('[data-action="whatsapp-reminder"]')) {
        event.preventDefault();
        
        const studentElement = event.target.closest('[data-student-id]');
        if (studentElement) {
          const studentData = this.extractStudentData(studentElement);
          if (studentData) {
            await this.sendSingleReminder(studentData);
          }
        }
      }
      
      // Check for bulk reminder action
      if (event.target.closest('[data-action="bulk-whatsapp-reminders"]')) {
        event.preventDefault();
        
        // Find all selected students
        const selectedStudents = this.getSelectedStudents();
        if (selectedStudents.length > 0) {
          await this.sendBulkReminders(selectedStudents);
        } else {
          console.warn('No students selected for bulk reminder');
        }
      }
      
      // Check for overdue payments reminder (from dashboard)
      if (event.target.closest('[data-action="overdue-whatsapp"]')) {
        event.preventDefault();
        
        // Get students with overdue payments
        const overdueStudents = this.getOverdueStudents();
        if (overdueStudents.length > 0) {
          await this.sendBulkReminders(overdueStudents);
        } else {
          console.warn('No students with overdue payments found');
        }
      }
    });
  }

  /**
   * Extract student data from a DOM element
   * @param {HTMLElement} element - Element containing student data
   * @returns {Object} Student data
   */
  extractStudentData(element) {
    // Try to extract data from data attributes first
    const studentData = {
      id: element.getAttribute('data-student-id'),
      name: element.getAttribute('data-student-name') || 
            element.querySelector('[data-student-name]')?.getAttribute('data-student-name') ||
            element.querySelector('.student-name')?.textContent ||
            element.querySelector('td:nth-child(2)')?.textContent || // Assuming name is in 2nd column
            'Student',
      class: element.getAttribute('data-student-class') || 
             element.querySelector('[data-student-class]')?.getAttribute('data-student-class') ||
             element.querySelector('.student-class')?.textContent ||
             element.querySelector('td:nth-child(3)')?.textContent || // Assuming class is in 3rd column
             'N/A',
      contact: element.getAttribute('data-student-contact') || 
               element.querySelector('[data-student-contact]')?.getAttribute('data-student-contact') ||
               element.querySelector('.student-contact')?.textContent ||
               element.querySelector('td:nth-child(4)')?.textContent || // Assuming contact is in 4th column
               '',
      fatherName: element.getAttribute('data-father-name') || 
                  element.querySelector('[data-father-name]')?.getAttribute('data-father-name') ||
                  element.querySelector('.father-name')?.textContent ||
                  '',
      totalFees: element.getAttribute('data-total-fees') || 
                 element.querySelector('[data-total-fees]')?.getAttribute('data-total-fees') ||
                 element.querySelector('.total-fees')?.textContent ||
                 element.querySelector('td:nth-child(5)')?.textContent || // Assuming total fees is in 5th column
                 '0',
      feesPaid: element.getAttribute('data-fees-paid') || 
                element.querySelector('[data-fees-paid]')?.getAttribute('data-fees-paid') ||
                element.querySelector('.fees-paid')?.textContent ||
                element.querySelector('td:nth-child(6)')?.textContent || // Assuming fees paid is in 6th column
                '0',
      feesCollectionFrequency: element.getAttribute('data-fees-frequency') || 
                               element.querySelector('[data-fees-frequency]')?.getAttribute('data-fees-frequency') ||
                               element.querySelector('.fees-frequency')?.textContent ||
                               element.querySelector('td:nth-child(7)')?.textContent || // Assuming frequency is in 7th column
                               'Monthly',
      customDueDate: element.getAttribute('data-custom-due-date') || 
                     element.querySelector('[data-custom-due-date]')?.getAttribute('data-custom-due-date') ||
                     element.querySelector('.custom-due-date')?.textContent ||
                     '',
      // Additional fields that might be available
      admissionDate: element.getAttribute('data-admission-date') || 
                     element.querySelector('[data-admission-date]')?.getAttribute('data-admission-date') ||
                     element.querySelector('.admission-date')?.textContent ||
                     element.querySelector('td:nth-child(8)')?.textContent || // Assuming admission date is in 8th column
                     ''
    };

    // Clean up the contact number
    studentData.contact = studentData.contact.replace(/\D/g, '');

    // Clean up the fees amounts
    studentData.totalFees = studentData.totalFees.replace(/[^\d.]/g, '');
    studentData.feesPaid = studentData.feesPaid.replace(/[^\d.]/g, '');

    return studentData;
  }

  /**
   * Get selected students (for bulk operations)
   * @returns {Array} Array of selected student data
   */
  getSelectedStudents() {
    const selectedCheckboxes = document.querySelectorAll('input[data-student-checkbox]:checked, .student-select-checkbox:checked');
    const selectedStudents = [];

    selectedCheckboxes.forEach(checkbox => {
      const studentRow = checkbox.closest('tr, .student-row, [data-student-id]');
      if (studentRow) {
        const studentData = this.extractStudentData(studentRow);
        if (studentData.contact) { // Only add if contact exists
          selectedStudents.push(studentData);
        }
      }
    });

    return selectedStudents;
  }

  /**
   * Get students with overdue payments using universal logic
   * @param {Array} studentsData - Optional array of student data to check
   * @returns {Array} Array of overdue student data
   */
  getOverdueStudents(studentsData = null) {
    // If students data is provided, use the universal logic
    if (studentsData && Array.isArray(studentsData)) {
      return studentsData.filter(student => this.isOverdue(student));
    }
    
    // Fallback to DOM-based detection for backward compatibility
    const allStudentRows = document.querySelectorAll('tr[data-student-id], .student-row[data-student-id]');
    
    const overdueStudents = [];

    allStudentRows.forEach(element => {
      const studentData = this.extractStudentData(element);
      // Apply universal overdue logic to extracted data
      if (studentData.contact && this.isOverdue(studentData)) {
        overdueStudents.push(studentData);
      }
    });

    return overdueStudents;
  }

  /**
   * Utility method to create delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get message tracking data from localStorage
   * @returns {Object} Tracking data with student IDs as keys and last message dates as values
   */
  getMessageTracking() {
    try {
      const trackingData = localStorage.getItem(this.MESSAGE_TRACKING_KEY);
      return trackingData ? JSON.parse(trackingData) : {};
    } catch (error) {
      console.error('Error reading message tracking data:', error);
      return {};
    }
  }

  /**
   * Save message tracking data to localStorage
   * @param {Object} trackingData - Tracking data to save
   */
  setMessageTracking(trackingData) {
    try {
      localStorage.setItem(this.MESSAGE_TRACKING_KEY, JSON.stringify(trackingData));
    } catch (error) {
      console.error('Error saving message tracking data:', error);
    }
  }

  /**
   * Check if a message can be sent to a student today
   * @param {string} studentId - Unique identifier for the student
   * @returns {boolean} True if message can be sent, false if rate limit exceeded
   */
  canSendMessageToStudent(studentId) {
    if (!studentId) return true; // If no ID provided, allow sending
    
    const trackingData = this.getMessageTracking();
    const lastSentDate = trackingData[studentId];
    
    if (!lastSentDate) {
      // No previous message record, allow sending
      return true;
    }
    
    // Check if it's a different day (compare dates, not exact time)
    const today = new Date().toDateString();
    const lastSentDay = new Date(lastSentDate).toDateString();
    
    return today !== lastSentDay;
  }

  /**
   * Record that a message was sent to a student
   * @param {string} studentId - Unique identifier for the student
   */
  recordMessageSent(studentId) {
    if (!studentId) return;
    
    const trackingData = this.getMessageTracking();
    trackingData[studentId] = new Date().toISOString(); // Store ISO string for consistency
    this.setMessageTracking(trackingData);
  }

  /**
   * Check if a student has received a message today
   * @param {string} studentId - Unique identifier for the student
   * @returns {boolean} True if student received a message today, false otherwise
   */
  isStudentMessagedToday(studentId) {
    if (!studentId) return false;
    
    const trackingData = this.getMessageTracking();
    const lastSentDate = trackingData[studentId];
    
    if (!lastSentDate) {
      return false;
    }
    
    // Check if it's the same day (compare dates, not exact time)
    const today = new Date().toDateString();
    const lastSentDay = new Date(lastSentDate).toDateString();
    
    return today === lastSentDay;
  }

  /**
   * Clean up expired entries from message tracking data (older than 30 days)
   */
  cleanupExpiredEntries() {
    try {
      const trackingData = this.getMessageTracking();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep only last 30 days
      
      let hasChanges = false;
      const cleanedData = {};
      
      for (const [studentId, lastSentDate] of Object.entries(trackingData)) {
        const sentDate = new Date(lastSentDate);
        if (sentDate >= cutoffDate) {
          cleanedData[studentId] = lastSentDate;
        } else {
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        this.setMessageTracking(cleanedData);
      }
    } catch (error) {
      console.error('Error cleaning up expired message tracking entries:', error);
    }
  }

  /**
   * Initialize the helper and perform periodic maintenance
   */
  async initializeBranding() {
    try {
      // Try to get branding info from the application
      if (window.getBrandingSettings && typeof window.getBrandingSettings === 'function') {
        this.brandingInfo = await window.getBrandingSettings();
      } else {
        // Look for branding info in other common places
        if (window.appState && window.appState.firmName) {
          this.brandingInfo = { firmName: window.appState.firmName };
        } else if (document.querySelector('[data-firm-name]')) {
          this.brandingInfo = { firmName: document.querySelector('[data-firm-name]').getAttribute('data-firm-name') };
        } else {
          // Default fallback
          this.brandingInfo = { firmName: 'Our Institute' };
        }
      }
      
      // Perform periodic maintenance
      this.cleanupExpiredEntries();
    } catch (error) {
      console.warn('Could not load branding info for WhatsApp reminders:', error);
      this.brandingInfo = { firmName: 'Our Institute' };
    }
  }
}

// Initialize the WhatsApp reminder helper when the module loads
const whatsappReminder = new WhatsAppReminderHelper();

// Auto-attach to existing buttons when DOM is ready
if (typeof window !== 'undefined') {
  whatsappReminder.attachToExistingButtons();
}

// Export for use in other modules if needed
export default whatsappReminder;