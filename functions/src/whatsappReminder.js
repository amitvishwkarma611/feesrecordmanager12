const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// WhatsApp Cloud API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';
const PHONE_NUMBER_ID = functions.config().whatsapp.phone_number_id;
const ACCESS_TOKEN = functions.config().whatsapp.access_token;

/**
 * Scheduled function to send WhatsApp fee reminders
 * Runs daily at 9 AM
 */
exports.sendWhatsAppFeeReminders = functions.pubsub
  .schedule('every day from 09:00 to 09:01')
  .timeZone('Asia/Kolkata') // Set to your timezone
  .onRun(async (context) => {
    try {
      console.log('Starting WhatsApp fee reminder process...');
      
      // Check if academy has WhatsApp feature enabled
      // Get the first student to determine the academy ID
      const studentsSnapshot = await db.collection('students').limit(1).get();
      
      if (studentsSnapshot.empty) {
        console.log('No students found, skipping WhatsApp reminders');
        return null;
      }
      
      // Get the first student's document to determine academy ID
      const firstStudentDoc = studentsSnapshot.docs[0];
      const firstStudent = firstStudentDoc.data();
      
      // Extract academy ID from student document path
      // Expected path format: users/{userId}/students/{studentId}
      const studentPathParts = firstStudentDoc.ref.path.split('/');
      const academyId = studentPathParts.length >= 2 ? studentPathParts[1] : null;
      
      if (!academyId) {
        console.log('Could not determine academy ID, skipping WhatsApp reminders');
        return null;
      }
      
      // All academies now have WhatsApp feature enabled by default
      console.log(`Academy ${academyId} proceeding with reminders (no subscription check)`);
      
      // Fetch all students with pending fees
      const allStudentsSnapshot = await db.collection('students').get();
      
      if (allStudentsSnapshot.empty) {
        console.log('No students found in database');
        return null;
      }
      
      const now = new Date();
      const eligibleStudents = [];
      
      // Filter students based on conditions
      allStudentsSnapshot.forEach(doc => {
        const student = doc.data();
        const pendingFees = (student.totalFees || 0) - (student.feesPaid || 0);
        
        // Check if student meets all conditions
        if (
          pendingFees > 0 && // Has pending fees
          student.reminderEnabled !== false && // Reminder is enabled (default true)
          student.contact && // Has a phone number
          isValidIndianPhoneNumber(student.contact) // Valid phone number
        ) {
          // Check if reminder should be sent based on last sent time
          const lastReminderSent = student.lastReminderSent 
            ? student.lastReminderSent.toDate 
              ? student.lastReminderSent.toDate() 
              : new Date(student.lastReminderSent)
            : null;
          
          const canSendReminder = !lastReminderSent || 
            (now - lastReminderSent) > 24 * 60 * 60 * 1000; // 24 hours
            
          if (canSendReminder) {
            eligibleStudents.push({
              id: doc.id,
              ...student,
              pendingFees
            });
          }
        }
      });
      
      console.log(`Found ${eligibleStudents.length} eligible students for reminders`);
      
      // Send reminders to eligible students
      const results = await Promise.allSettled(
        eligibleStudents.map(student => sendWhatsAppReminder(student))
      );
      
      // Log results
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`Successfully sent ${successful} reminders, ${failed} failed`);
      
      return {
        success: true,
        message: `Processed ${eligibleStudents.length} students: ${successful} successful, ${failed} failed`
      };
    } catch (error) {
      console.error('Error in WhatsApp fee reminder function:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Send WhatsApp reminder to a specific student
 * @param {Object} student - Student data
 */
async function sendWhatsAppReminder(student) {
  try {
    // Format phone number (ensure it's in international format)
    const formattedPhone = formatIndianPhoneNumber(student.contact);
    
    if (!formattedPhone) {
      throw new Error(`Invalid phone number for student ${student.name}: ${student.contact}`);
    }
    
    // Create message template
    const message = createReminderMessage(student);
    
    // Send WhatsApp message via Cloud API
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Update last reminder sent timestamp
    await db.collection('students').doc(student.id).update({
      lastReminderSent: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully sent reminder to ${student.name} (${formattedPhone})`);
    return response.data;
  } catch (error) {
    console.error(`Failed to send reminder to ${student.name}:`, error.message);
    throw error;
  }
}

/**
 * Create a polite, short, and non-spammy reminder message
 * @param {Object} student - Student data
 * @returns {string} - Formatted message
 */
function createReminderMessage(student) {
  const schoolName = 'Your Academy'; // You can customize this or fetch from settings
  const pendingAmount = student.pendingFees.toLocaleString('en-IN');
  
  return `Hello ${student.name},

This is a friendly reminder from ${schoolName} regarding your pending fees of ₹${pendingAmount}.

Please make the payment at your earliest convenience to avoid any inconvenience.

If you have already made the payment, please ignore this message.

Thank you!
${schoolName} Team`;
}

/**
 * Validate Indian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether it's a valid Indian phone number
 */
function isValidIndianPhoneNumber(phone) {
  if (!phone) return false;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number (10 digits, starting with 6-9)
  const indianMobileRegex = /^[6-9]\d{9}$/;
  
  return indianMobileRegex.test(cleaned);
}

/**
 * Format Indian phone number to international format
 * @param {string} phone - Phone number to format
 * @returns {string|null} - Formatted phone number or null if invalid
 */
function formatIndianPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's already in international format
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  
  // Check if it's a valid Indian mobile number (10 digits, starting with 6-9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `91${cleaned}`;
  }
  
  return null;
}