const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure nodemailer for sending emails
const emailUser = functions.config().email.user;
const emailPass = functions.config().email.pass;

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

/**
 * Cloud function triggered when a new support query is added
 * Sends an email notification to the admin
 */
exports.sendSupportQueryNotification = functions.firestore
  .document('users/{userId}/supportQueries/{queryId}')
  .onCreate(async (snap, context) => {
    try {
      const queryData = snap.data();
      const { userId, category, priority, description, email, createdAt } = queryData;
      
      // Get admin email from environment variables or config
      const adminEmail = functions.config().admin.email || process.env.ADMIN_EMAIL;
      
      if (!adminEmail) {
        console.error('Admin email not configured in functions config');
        return { success: false, error: 'Admin email not configured' };
      }
      
      // Get user details
      const userRecord = await admin.auth().getUser(userId);
      const userName = userRecord.displayName || userRecord.email || 'User';
      const userEmail = userRecord.email || email || 'Unknown';
      
      // Format the email
      const emailSubject = `New Support Query - ${category} (${priority} Priority)`;
      const emailHtml = generateSupportQueryEmailTemplate(
        userName, 
        userEmail, 
        category, 
        priority, 
        description, 
        createdAt,
        userId,
        context.params.queryId
      );
      
      // Send the email
      const mailOptions = {
        from: emailUser,
        to: adminEmail,
        subject: emailSubject,
        html: emailHtml,
      };
      
      await transporter.sendMail(mailOptions);
      
      console.log(`Support query notification sent to admin: ${adminEmail}`);
      
      // Also send confirmation to the user who raised the query
      if (userEmail) {
        const userMailOptions = {
          from: emailUser,
          to: userEmail,
          subject: `Your Query Has Been Received - ${category}`,
          html: generateUserConfirmationEmailTemplate(
            userName,
            category,
            priority,
            description,
            createdAt,
            context.params.queryId
          ),
        };
        
        await transporter.sendMail(userMailOptions);
        console.log(`Confirmation email sent to user: ${userEmail}`);
      }
      
      // Update the query document to mark notification as sent
      await snap.ref.update({
        notificationSent: admin.firestore.FieldValue.serverTimestamp(),
        notificationStatus: 'sent'
      });
      
      return { success: true, message: 'Email notifications sent successfully' };
      
    } catch (error) {
      console.error('Error sending support query notification:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Generate HTML email template for admin notification
 */
function generateSupportQueryEmailTemplate(userName, userEmail, category, priority, description, createdAt, userId, queryId) {
  const priorityColors = {
    'Low': '#28a745',
    'Medium': '#ffc107',
    'High': '#dc3545'
  };
  
  const formattedDate = createdAt ? createdAt.toDate().toLocaleString() : new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Query</title>
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
          .priority-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            color: white;
            background-color: ${priorityColors[priority] || '#6c757d'};
            margin-bottom: 20px;
          }
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .query-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .detail-label {
            font-weight: bold;
            color: #495057;
            display: inline-block;
            width: 120px;
          }
          .detail-value {
            color: #6c757d;
          }
          .description {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Support Query</h1>
            <div class="priority-badge">${priority} Priority</div>
            <p>A new support query has been raised in the system.</p>
          </div>
          
          <p class="greeting">Hello Admin,</p>
          
          <p>A new support query has been submitted with the following details:</p>
          
          <div class="query-details">
            <div class="detail-row">
              <span class="detail-label">User Name:</span>
              <span class="detail-value">${userName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">User Email:</span>
              <span class="detail-value">${userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="detail-value">${priority}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Query ID:</span>
              <span class="detail-value">${queryId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Submitted:</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
          </div>
          
          <div class="description">
            <strong>Query Description:</strong><br>
            ${description}
          </div>
          
          <p>Please review this query and respond to the user as soon as possible.</p>
          
          <div class="footer">
            <p>This is an automated notification from the Fees Management System.</p>
            <p>Query ID: ${queryId} | User ID: ${userId}</p>
            <p>© ${new Date().getFullYear()} Fees Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML email template for user confirmation
 */
function generateUserConfirmationEmailTemplate(userName, category, priority, description, createdAt, queryId) {
  const formattedDate = createdAt ? createdAt.toDate().toLocaleString() : new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Query Received Confirmation</title>
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
            border-bottom: 2px solid #28a745;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .confirmation-details {
            background-color: #d4edda;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
          }
          .detail-row {
            margin-bottom: 10px;
          }
          .detail-label {
            font-weight: bold;
            color: #155724;
          }
          .detail-value {
            color: #155724;
          }
          .next-steps {
            background-color: #e2e3e5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Query Received</h1>
            <p>Your support query has been successfully submitted.</p>
          </div>
          
          <p class="greeting">Hello ${userName},</p>
          
          <p>We have received your support query and are currently reviewing it.</p>
          
          <div class="confirmation-details">
            <div class="detail-row">
              <span class="detail-label">Query ID:</span>
              <span class="detail-value">${queryId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="detail-value">${priority}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Submitted:</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
          </div>
          
          <div class="next-steps">
            <strong>Next Steps:</strong>
            <ul>
              <li>Our support team will review your query</li>
              <li>You will receive a response within 24 hours</li>
              <li>You can check the status of your query in your profile</li>
            </ul>
          </div>
          
          <p>We appreciate your patience and will get back to you as soon as possible.</p>
          
          <div class="footer">
            <p>This is an automated confirmation from the Fees Management System.</p>
            <p>Query ID: ${queryId}</p>
            <p>© ${new Date().getFullYear()} Fees Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}