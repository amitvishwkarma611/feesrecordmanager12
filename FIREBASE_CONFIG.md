# Firebase Configuration for Vercel Deployment

This document explains how to configure Firebase for your Fees Management System when deploying to Vercel.

## Getting Firebase Configuration Values

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon next to "Project Overview" and select "Project settings"
4. Scroll down to the "General" tab
5. Under "Your apps", find your web app or create one if it doesn't exist
6. Copy the configuration values from the Firebase SDK snippet (config):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Setting Environment Variables in Vercel

### Using Vercel CLI

After deploying your project initially, set the environment variables:

```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```

### Using Vercel Dashboard

1. Go to your project in the Vercel dashboard
2. Click "Settings"
3. Select "Environment Variables" from the sidebar
4. Add each variable with the prefix `VITE_`:

| Name | Value |
|------|-------|
| VITE_FIREBASE_API_KEY | (Your API Key) |
| VITE_FIREBASE_AUTH_DOMAIN | (Your Auth Domain) |
| VITE_FIREBASE_PROJECT_ID | (Your Project ID) |
| VITE_FIREBASE_STORAGE_BUCKET | (Your Storage Bucket) |
| VITE_FIREBASE_MESSAGING_SENDER_ID | (Your Messaging Sender ID) |
| VITE_FIREBASE_APP_ID | (Your App ID) |

## Firebase Services Setup

### 1. Authentication

Enable Email/Password authentication:
1. In Firebase Console, go to "Authentication" > "Sign-in method"
2. Enable "Email/Password" provider

### 2. Firestore Database

Create the required collections:
1. In Firebase Console, go to "Firestore Database" > "Create database"
2. Start in "test mode" (for development) or set up production rules
3. Create the following collections as needed:
   - `students`
   - `fees`
   - `expenses`
   - `users`

### 3. Security Rules

Update your Firestore rules in `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /students/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /fees/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /expenses/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /users/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Testing Configuration

To test your configuration locally:

1. Create a `.env.local` file in your project root:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Check the browser console for successful Firebase initialization messages

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/network-request-failed)"**: Check your API key and network connectivity
2. **"Missing or insufficient permissions"**: Verify your Firestore security rules
3. **Environment variables not loading**: Ensure they are prefixed with `VITE_` and deployed to the correct environments

### Verifying Configuration

Check that your environment variables are correctly loaded by adding this to your code temporarily:

```javascript
console.log('Firebase Config:');
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '[SET]' : '[NOT SET]');
console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '[SET]' : '[NOT SET]');
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '[SET]' : '[NOT SET]');
```

Remember to remove this logging before production deployment for security reasons.