# Google Authentication Setup for Firebase

This guide explains how to enable Google authentication for your Fees Management System.

## Prerequisites

1. A Firebase project (already created for your application)
2. Firebase CLI installed (optional but recommended)

## Steps to Enable Google Authentication

### 1. Enable Google Sign-In Provider

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. In the left sidebar, click **Authentication**
4. Click the **Sign-in method** tab
5. Find **Google** in the list of providers
6. Click the **Edit** button (pencil icon) next to Google
7. Toggle the **Enable** switch to **On**
8. Enter your project's support email (usually your email)
9. Click **Save**

### 2. Configure Authorized Domains (if needed)

Firebase usually automatically adds localhost and your Firebase hosting domains. If you're deploying to a custom domain:

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Scroll down to **Authorized domains**
3. Click **Add domain**
4. Enter your custom domain (e.g., `your-app.vercel.app`)
5. Click **Add**

### 3. Test Google Authentication

After enabling Google authentication:

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to the login page
3. Click the "Sign in with Google" button
4. You should see a Google login popup

### 4. Troubleshooting

#### Common Issues

1. **CONFIGURATION_NOT_FOUND Error**
   - Make sure you've enabled Google as a sign-in provider in Firebase Console
   - Check that you're using the correct Firebase project configuration

2. **Popup Blocked**
   - Ensure your browser allows popups for your development site
   - Try clicking the button again (some browsers allow popups on second click)

3. **OAuth Client Error**
   - This usually happens when Firebase hasn't properly set up the OAuth consent screen
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Check if Firebase automatically created OAuth 2.0 Client IDs
   - If not, you may need to create them manually

#### Checking Firebase Configuration

To verify your Firebase configuration is correct:

1. In Firebase Console, go to Project Settings (gear icon)
2. In the **General** tab, make sure you have a web app configured
3. Check that your `firebaseConfig` in `src/firebase/firebaseConfig.js` matches the values shown

### 5. Security Considerations

1. **OAuth Consent Screen**
   - For production apps, you should configure the OAuth consent screen in Google Cloud Console
   - Go to Google Cloud Console > APIs & Services > OAuth consent screen
   - Configure the application name, user support email, and developer contact information

2. **Domain Verification**
   - For custom domains, you may need to verify domain ownership in Google Search Console

3. **Rate Limiting**
   - Firebase Authentication has built-in protections against abuse
   - Monitor your Firebase Authentication usage in the Firebase Console

## Implementation Details

The Google authentication implementation in your application uses:

1. `signInWithPopup()` method from Firebase Authentication
2. GoogleAuthProvider for handling the OAuth flow
3. Automatic user profile creation for new users
4. Integration with the existing user profile system

### Code Structure

- **Login Component**: Handles the Google sign-in button and flow
- **Firebase Service**: Provides functions for user profile management
- **Profile Component**: Displays user information including phone and firm name

## Next Steps

1. Test the Google authentication flow thoroughly
2. Customize the OAuth consent screen for production use
3. Implement additional security measures as needed
4. Monitor authentication usage in Firebase Console

## Need Help?

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Ensure Google authentication is enabled in Firebase Console
4. Check that your development server is running correctly