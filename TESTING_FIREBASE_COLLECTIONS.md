# Testing Firebase Collections

This document explains how to test Firebase collection generation and verify that the security rules are working correctly.

## Prerequisites

1. A Firebase project with Firestore enabled
2. Firebase Authentication configured with Email/Password sign-in method
3. Security rules deployed to Firestore

## Test Methods

### 1. Manual Testing with Browser

1. Open `public/test-firebase.html` in your browser
2. Update the Firebase configuration in the script:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```
3. Serve the file using a local server:
   ```bash
   npm run dev
   ```
4. Navigate to `http://localhost:3000/test-firebase.html`
5. Use the interface to:
   - Create a test user
   - Sign in
   - Add test students
   - Retrieve students
   - Verify that only owned documents are accessible

### 2. Using Firebase Console

1. Go to the Firebase Console
2. Navigate to Firestore Database
3. Manually add documents to collections:
   - Add a student document to the `students` collection
   - Ensure it includes the `ownerId` field matching a valid user UID
   - Verify that security rules allow/deny access appropriately

### 3. Unit Tests (Future Implementation)

For automated testing, you could implement unit tests using the Firebase Emulator Suite:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize the Emulator Suite:
   ```bash
   firebase init emulators
   ```

3. Start the emulators:
   ```bash
   firebase emulators:start
   ```

4. Run tests against the emulated environment

## Expected Behavior

### Successful Operations
- Users can create documents in collections when properly authenticated
- Documents are created with the correct `ownerId` field
- Users can read, update, and delete documents they own
- Operations appear in Firestore logs

### Failed Operations
- Unauthenticated users cannot create documents
- Users cannot access documents owned by other users
- Operations without `ownerId` field should be rejected
- Appropriate error messages are returned

## Troubleshooting

### Common Issues

1. **PERMISSION_DENIED Errors**
   - Check that the `ownerId` field is correctly set
   - Verify the user UID matches the authenticated user
   - Review Firestore security rules

2. **Documents Not Appearing**
   - Ensure the user has read permissions
   - Check that the `ownerId` matches the current user
   - Verify the document was actually created

3. **Authentication Issues**
   - Confirm Firebase Authentication is properly configured
   - Check that the user exists in Authentication
   - Verify the user's email is verified (if required)

### Debugging Steps

1. Check browser console for JavaScript errors
2. Review Firestore request logs in Firebase Console
3. Verify security rules in Firestore Rules editor
4. Test with simplified rules during development:
   ```javascript
   // Allow all reads and writes during testing only
   match /students/{studentId} {
     allow read, write: if true;
   }
   ```
5. Gradually re-enable security rules and test each scenario

## Security Rules Validation

The current security rules should:

1. Allow users to create documents in collections when:
   - User is authenticated
   - `request.resource.data.ownerId` equals `request.auth.uid`

2. Allow users to read/update/delete documents when:
   - User is authenticated
   - `resource.data.ownerId` equals `request.auth.uid`

3. Reject all other operations with PERMISSION_DENIED

## Related Documentation

- [FIREBASE_COLLECTION_STRUCTURE.md](FIREBASE_COLLECTION_STRUCTURE.md) - Collection structure details
- [FIREBASE_CONFIG.md](FIREBASE_CONFIG.md) - Firebase configuration guide
- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)