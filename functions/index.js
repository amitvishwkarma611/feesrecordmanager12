const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import cloud functions
const { sendWhatsAppFeeReminders } = require('./src/whatsappReminder');

// Export functions
exports.sendWhatsAppFeeReminders = sendWhatsAppFeeReminders;