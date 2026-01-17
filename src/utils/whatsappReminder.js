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
   * Generate the WhatsApp message template
   * @param {string} parentName - Parent's name
   * @param {string} studentName - Student's name
   * @param {string} pendingAmount - Pending amount
   * @returns {string} Formatted message
   */
  generateMessage(parentName, studentName, pendingAmount) {
    const instituteName = this.brandingInfo?.firmName || 'Our Institute';
    
    return `Hello ${parentName} 👋
${studentName} ki ${new Date().toLocaleString('default', { month: 'long' })} ki fees ₹${pendingAmount} pending hai.

Kindly fees clear karein.
– ${instituteName}`;
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
   * Send single WhatsApp reminder
   * @param {Object} studentData - Student information
   */
  async sendSingleReminder(studentData) {
    await this.initializeBranding();

    const parentName = studentData.fatherName || studentData.motherName || 'Parent';
    const studentName = studentData.name || 'Student';
    const pendingAmount = studentData.feesDue || studentData.pendingFees || '0';
    const mobileNumber = studentData.contact || studentData.mobile || studentData.phoneNumber;

    const message = this.generateMessage(parentName, studentName, pendingAmount);
    this.openWhatsApp(mobileNumber, message);
  }

  /**
   * Send bulk WhatsApp reminders with delays
   * @param {Array} studentsData - Array of student information
   */
  async sendBulkReminders(studentsData) {
    await this.initializeBranding();

    for (let i = 0; i < studentsData.length; i++) {
      const student = studentsData[i];
      
      const parentName = student.fatherName || student.motherName || 'Parent';
      const studentName = student.name || 'Student';
      const pendingAmount = student.feesDue || student.pendingFees || '0';
      const mobileNumber = student.contact || student.mobile || student.phoneNumber;

      if (mobileNumber) {
        const message = this.generateMessage(parentName, studentName, pendingAmount);
        this.openWhatsApp(mobileNumber, message);
        
        // Add delay between messages to avoid spam detection
        if (i < studentsData.length - 1) {
          await this.delay(this.BULK_MESSAGE_DELAY);
        }
      } else {
        console.warn(`Skipping student ${student.name} due to missing mobile number`);
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
            element.querySelector('td:nth-child(3)')?.textContent || // Assuming name is in 3rd column
            'Student',
      contact: element.getAttribute('data-student-contact') || 
               element.querySelector('[data-student-contact]')?.getAttribute('data-student-contact') ||
               element.querySelector('.student-contact')?.textContent ||
               element.querySelector('td:nth-child(4)')?.textContent || // Assuming contact is in 4th column
               '',
      feesDue: element.getAttribute('data-student-fees-due') || 
               element.querySelector('[data-student-fees-due]')?.getAttribute('data-student-fees-due') ||
               element.querySelector('.fees-due')?.textContent ||
               element.querySelector('.pending-amount')?.textContent || // Assuming pending amount
               '0',
      fatherName: element.getAttribute('data-father-name') || 
                  element.querySelector('[data-father-name]')?.getAttribute('data-father-name') ||
                  element.querySelector('.father-name')?.textContent ||
                  '',
      motherName: element.getAttribute('data-mother-name') || 
                  element.querySelector('[data-mother-name]')?.getAttribute('data-mother-name') ||
                  element.querySelector('.mother-name')?.textContent ||
                  ''
    };

    // Clean up the contact number
    studentData.contact = studentData.contact.replace(/\D/g, '');

    // Clean up the fees due amount
    studentData.feesDue = studentData.feesDue.replace(/[^\d.]/g, '');

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
   * Get students with overdue payments
   * @returns {Array} Array of overdue student data
   */
  getOverdueStudents() {
    // Look for elements that indicate overdue payments
    const overdueElements = document.querySelectorAll(
      '[data-payment-status="overdue"], .overdue-payment, .status-overdue, [data-status="overdue"]'
    );
    
    const overdueStudents = [];

    overdueElements.forEach(element => {
      const studentRow = element.closest('tr, .student-row, [data-student-id]');
      if (studentRow) {
        const studentData = this.extractStudentData(studentRow);
        if (studentData.contact) { // Only add if contact exists
          overdueStudents.push(studentData);
        }
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
}

// Initialize the WhatsApp reminder helper when the module loads
const whatsappReminder = new WhatsAppReminderHelper();

// Auto-attach to existing buttons when DOM is ready
if (typeof window !== 'undefined') {
  whatsappReminder.attachToExistingButtons();
}

// Export for use in other modules if needed
export default whatsappReminder;