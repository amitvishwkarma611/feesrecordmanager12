const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure nodemailer for sending emails
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass,
  },
});

/**
 * Scheduled function to send monthly email reports
 * Runs on the 1st day of every month at 9 AM IST
 */
exports.sendMonthlyEmailReport = functions.pubsub
  .schedule('0 9 1 * *') // Run on the 1st day of every month at 9 AM
  .timeZone('Asia/Kolkata') // Set to IST timezone
  .onRun(async (context) => {
    try {
      console.log('Starting monthly email report process...');
      
      // Get all users from the users collection
      const usersSnapshot = await db.collection('users').get();
      
      if (usersSnapshot.empty) {
        console.log('No users found, skipping monthly email reports');
        return null;
      }
      
      // Process each user
      const results = await Promise.allSettled(
        usersSnapshot.docs.map(userDoc => processUserReport(userDoc))
      );
      
      // Log results
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`Successfully sent ${successful} reports, ${failed} failed`);
      
      return {
        success: true,
        message: `Processed ${usersSnapshot.docs.length} users: ${successful} successful, ${failed} failed`
      };
    } catch (error) {
      console.error('Error in monthly email report function:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Process a single user's monthly report
 * @param {Object} userDoc - User document from Firestore
 */
async function processUserReport(userDoc) {
  try {
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    // Get user's email from auth or user document
    const userEmail = userData.email || await getUserEmail(userId);
    const userName = userData.name || userData.displayName || 'User';
    
    if (!userEmail) {
      console.log(`No email found for user ${userId}, skipping report`);
      return { success: false, message: 'No email found' };
    }
    
    // Get user's data from Firestore
    const userReportData = await getUserReportData(userId);
    
    if (!userReportData) {
      console.log(`No report data found for user ${userId}, skipping report`);
      return { success: false, message: 'No report data found' };
    }
    
    // Generate the email
    const emailSubject = `Your Monthly Fees Report – ${getMonthYearString()}`;
    const emailHtml = generateEmailTemplate(userName, userReportData, userEmail);
    
    // Send the email
    const mailOptions = {
      from: functions.config().email.user,
      to: userEmail,
      subject: emailSubject,
      html: emailHtml,
    };
    
    await transporter.sendMail(mailOptions);
    
    // Log successful email send
    await logEmailSent(userId, userEmail, userReportData);
    
    console.log(`Successfully sent monthly report to ${userEmail} (${userName})`);
    return { success: true, email: userEmail };
  } catch (error) {
    console.error(`Failed to send report to user:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's email from Firebase Auth
 * @param {string} userId - User ID
 * @returns {string|null} - User's email
 */
async function getUserEmail(userId) {
  try {
    const userRecord = await admin.auth().getUser(userId);
    return userRecord.email;
  } catch (error) {
    console.error(`Error getting user email for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get report data for a specific user
 * @param {string} userId - User ID
 * @returns {Object|null} - Report data
 */
async function getUserReportData(userId) {
  try {
    // Get user's students
    const studentsSnapshot = await db.collection(`users/${userId}/students`).get();
    
    // Calculate totals
    let totalStudents = 0;
    let totalFees = 0;
    let paidFees = 0;
    let pendingFees = 0;
    
    studentsSnapshot.forEach(doc => {
      const student = doc.data();
      totalStudents++;
      
      const studentTotalFees = parseFloat(student.totalFees) || 0;
      const studentFeesPaid = parseFloat(student.feesPaid) || 0;
      const studentPendingFees = studentTotalFees - studentFeesPaid;
      
      totalFees += studentTotalFees;
      paidFees += studentFeesPaid;
      pendingFees += studentPendingFees;
    });
    
    // Get user profile for branding info
    const profileDoc = await db.collection(`users/${userId}/settings`).doc('profile').get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};
    
    return {
      totalStudents,
      totalFees,
      paidFees,
      pendingFees,
      firmName: profileData.firmName || 'Your Academy',
      firmAddress: profileData.firmAddress || '',
      logoUrl: profileData.logoUrl || ''
    };
  } catch (error) {
    console.error(`Error getting report data for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Generate the HTML email template
 * @param {string} userName - User's name
 * @param {Object} reportData - Report data
 * @param {string} userEmail - User's email
 * @returns {string} - HTML email template
 */
function generateEmailTemplate(userName, reportData, userEmail) {
  const monthYear = getMonthYearString();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Fees Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #4e73df;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            max-width: 150px;
            margin-bottom: 10px;
          }
          .firm-name {
            font-size: 24px;
            color: #2c3e50;
            margin: 10px 0;
          }
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .summary-table th,
          .summary-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .summary-table th {
            background-color: #4e73df;
            color: white;
            font-weight: bold;
          }
          .summary-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .summary-table .value {
            font-weight: bold;
            text-align: right;
          }
          .dashboard-link {
            display: block;
            text-align: center;
            margin: 30px 0;
            padding: 15px;
            background-color: #4e73df;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
          }
          .dashboard-link:hover {
            background-color: #2e59d9;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .report-period {
            text-align: center;
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${reportData.logoUrl ? `<img src="${reportData.logoUrl}" alt="Logo" class="logo">` : ''}
            <h1 class="firm-name">${reportData.firmName}</h1>
            <p class="report-period">Monthly Report for ${monthYear}</p>
          </div>
          
          <p class="greeting">Hello ${userName},</p>
          
          <p>Here's your monthly summary of fees collected:</p>
          
          <table class="summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Students</td>
                <td class="value">${reportData.totalStudents}</td>
              </tr>
              <tr>
                <td>Total Fees</td>
                <td class="value">₹${formatCurrency(reportData.totalFees)}</td>
              </tr>
              <tr>
                <td>Fees Collected</td>
                <td class="value">₹${formatCurrency(reportData.paidFees)}</td>
              </tr>
              <tr>
                <td>Pending Fees</td>
                <td class="value">₹${formatCurrency(reportData.pendingFees)}</td>
              </tr>
            </tbody>
          </table>
          
          <a href="https://your-app-url.vercel.app/dashboard" class="dashboard-link" target="_blank">
            View Full Dashboard
          </a>
          
          <div class="footer">
            <p>This is an automated report from ${reportData.firmName}.</p>
            <p>If you have any questions, please contact your administrator.</p>
            <p>© ${new Date().getFullYear()} ${reportData.firmName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Format currency with Indian number formatting
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount) {
  return parseFloat(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Get current month and year string
 * @returns {string} - Month and year string (e.g., "December 2024")
 */
function getMonthYearString() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Log email sent to Firestore
 * @param {string} userId - User ID
 * @param {string} email - Email address
 * @param {Object} reportData - Report data
 */
async function logEmailSent(userId, email, reportData) {
  try {
    const logData = {
      userId,
      email,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      reportData,
      monthYear: getMonthYearString(),
    };
    
    await db.collection('emailLogs').add(logData);
  } catch (error) {
    console.error('Error logging email sent:', error.message);
  }
}