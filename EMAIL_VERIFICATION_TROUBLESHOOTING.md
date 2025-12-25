# Email Verification Troubleshooting Guide

This document provides troubleshooting steps for email verification issues in the Fees Management System.

## Common Issues and Solutions

### 1. Verification Emails Not Arriving

#### Issue: 
Users don't receive verification emails after signup or when using "Resend Verification Email".

#### Possible Causes and Solutions:

1. **Email Sent to Spam/Junk Folder**
   - Check spam/junk folders
   - Add your app's email domain to contacts/whitelist
   - Look for emails from `noreply@{your-project-id}.firebaseapp.com`

2. **Firebase Authentication Templates Not Configured**
   - Go to Firebase Console → Authentication → Templates
   - Check if the email verification template is enabled
   - Customize the template if needed (add your company name, logo, etc.)

3. **Domain Not Verified**
   - In Firebase Console → Authentication → Settings
   - Check if your domain is added to authorized domains
   - Add your custom domain if using one

4. **Email Delivery Quotas**
   - Firebase has daily quotas for free tier projects
   - Check Firebase Console for quota usage
   - Upgrade to Blaze plan for higher quotas if needed

5. **Network Issues**
   - Temporary network issues might prevent email delivery
   - Try resending after a few minutes

### 2. Resend Verification Email Not Working

#### Issue:
Clicking "Resend Verification Email" shows success message but no email arrives.

#### Troubleshooting Steps:

1. **Check Console Logs**
   - Open browser developer tools (F12)
   - Check the Console tab for any error messages
   - Look for Firebase-related errors

2. **Verify User Authentication State**
   - Ensure the user is properly signed in before resending
   - Check that the email address matches the account

3. **Rate Limiting**
   - Firebase has rate limits for email sending
   - Wait for the cooldown period (30 seconds) before trying again

4. **Password Verification**
   - The resend function requires the user's password
   - Ensure the correct password is entered

### 3. Email Verification Link Expired

#### Issue:
Verification link in email doesn't work or shows "expired" message.

#### Solutions:

1. **Resend Verification Email**
   - Use the "Resend Verification Email" button
   - Fresh links are valid for 1 hour

2. **Check Link Format**
   - Ensure the entire link is copied correctly
   - Links should start with `https://`

### 4. Code Implementation Issues

#### Issue:
Problems with the email verification flow in the application code.

#### Common Code Problems:

1. **Sending Email to Wrong User**
   ```javascript
   // Incorrect - sending to null user
   await sendEmailVerification(auth.currentUser); // auth.currentUser might be null
   
   // Correct - send to the specific user
   await sendEmailVerification(userCredential.user);
   ```

2. **Not Handling Errors Properly**
   ```javascript
   // Better error handling
   try {
     await sendEmailVerification(userCredential.user);
   } catch (error) {
     console.error('Error sending verification email:', error);
     // Handle error appropriately
   }
   ```

3. **Timing Issues**
   ```javascript
   // Ensure user is properly created before sending email
   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
   // Now safe to send verification email
   await sendEmailVerification(userCredential.user);
   ```

## Testing Email Delivery

### Manual Testing Steps:

1. **Create a Test Account**
   - Sign up with a real email address you control
   - Check inbox and spam folders

2. **Use Different Email Providers**
   - Test with Gmail, Outlook, Yahoo, etc.
   - Some providers have stricter spam filters

3. **Check Firebase Console**
   - Go to Authentication → Users
   - Verify the user appears with emailVerified = false

### Automated Testing:

1. **Browser Console Testing**
   ```javascript
   // Test email sending directly in browser console
   import { sendEmailVerification } from 'firebase/auth';
   sendEmailVerification(auth.currentUser)
     .then(() => console.log('Email sent'))
     .catch(error => console.error('Error:', error));
   ```

## Firebase Console Configuration

### Email Templates:
1. Go to Firebase Console → Authentication → Templates
2. Find "Email Verification" template
3. Customize subject and body if needed
4. Ensure the template is enabled

### Authorized Domains:
1. Go to Firebase Console → Authentication → Settings
2. In "Authorized domains" section
3. Add any custom domains you're using
4. Ensure localhost is present for development

### Quotas and Limits:
1. Go to Firebase Console → Usage and Billing
2. Check Authentication quotas
3. Consider upgrading to Blaze plan for production

## Advanced Troubleshooting

### 1. Enable Detailed Logging
Add to your code to see more detailed Firebase logs:
```javascript
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';

// Enable logging
connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
```

### 2. Check Security Rules
Ensure Firestore security rules aren't interfering:
```javascript
// In firestore.rules
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 3. Network and Firewall Issues
- Corporate firewalls might block email delivery
- Some countries restrict access to Google services
- Try from a different network

## Contact Support

If issues persist:
1. Check Firebase Status Dashboard: https://status.firebase.google.com/
2. Visit Firebase Community: https://community.firebase.google.com/
3. File a support ticket if you have a paid Firebase plan

## Related Documentation

- [Firebase Authentication Email Templates](https://firebase.google.com/docs/auth/custom-email-handler)
- [Firebase Authentication Quotas](https://firebase.google.com/docs/auth/limits)
- [Email Delivery Best Practices](https://firebase.google.com/docs/auth/emails)