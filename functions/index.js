const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import cloud functions
//const { sendWhatsAppFeeReminders } = require('./src/whatsappReminder');
const { sendMonthlyEmailReport } = require('./src/monthlyEmailReport');
const { deleteUnverifiedUsers } = require('./src/deleteUnverifiedUsers');

// Export functions
//exports.sendWhatsAppFeeReminders = sendWhatsAppFeeReminders;
exports.sendMonthlyEmailReport = sendMonthlyEmailReport;
exports.deleteUnverifiedUsers = deleteUnverifiedUsers;