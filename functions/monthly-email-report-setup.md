# Monthly Email Report Setup

This document provides instructions for setting up the monthly email report system using Firebase Cloud Functions.

## Prerequisites

1. Firebase CLI installed globally
2. Gmail account with app password (for sending emails) or SendGrid account
3. Firebase project with Firestore database

## Configuration

### 1. Set up Gmail for sending emails

If using Gmail:

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"
3. Set Firebase config variables:

```bash
firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password"
```

### 2. Alternative: Set up SendGrid

If using SendGrid instead of Gmail:

1. Create a SendGrid account
2. Generate an API key
3. Update the transporter in `monthlyEmailReport.js`:

```javascript
const transporter = nodemailer.createTransporter({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: functions.config().sendgrid.api_key,
  },
});
```

Then set the config:

```bash
firebase functions:config:set sendgrid.api_key="your-sendgrid-api-key"
```

## Deployment

1. Install dependencies:

```bash
cd functions
npm install
```

2. Deploy the functions:

```bash
firebase deploy --only functions:sendMonthlyEmailReport
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

## Verification

1. Check the deployed function in Firebase Console:
   - Go to Firebase Console > Functions
   - Verify `sendMonthlyEmailReport` function is deployed
   - Check the schedule: `0 9 1 * *` (runs on 1st day of each month at 9 AM IST)

2. Check logs:
   - Go to Firebase Console > Functions > Logs
   - Look for execution logs on the 1st of the month

## How It Works

1. The function runs automatically on the 1st day of every month at 9 AM IST
2. It fetches all users from the Firestore `users` collection
3. For each user, it calculates:
   - Total number of students
   - Total fees
   - Fees collected
   - Pending fees
4. It generates a personalized HTML email report
5. It sends the report to the user's registered email address
6. It logs the email send in the `emailLogs` collection in Firestore

## Error Handling

- If a user has no email address, the function skips that user
- If there's no data for a user, the function skips that user
- All errors are logged to Firebase Functions logs
- Successful sends are logged to the `emailLogs` Firestore collection

## Testing

To test the function manually, you can temporarily modify the schedule in `monthlyEmailReport.js`:

```javascript
// For testing only - change schedule to run every minute
exports.sendMonthlyEmailReport = functions.pubsub
  .schedule('* * * * *') // Run every minute (for testing only)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    // ... rest of function
  });
```

Remember to revert this back to the monthly schedule after testing.

## Security

- The function only reads data (no modifications)
- It respects existing Firestore security rules
- Email credentials are stored securely using Firebase config
- No sensitive data is logged