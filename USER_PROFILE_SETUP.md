# User Profile Setup: Phone Number and Firm Name Collection

This guide explains how phone number and firm name collection has been implemented in your Fees Management System.

## Overview

The application now collects additional user information during signup:
1. Phone number
2. Firm/Organization name

This information is stored in Firestore and displayed in the user profile section.

## Implementation Details

### 1. Signup Form Enhancement

The login/signup form has been enhanced to collect additional information during account creation:

- **Phone Number Field**: Collects the user's phone number
- **Firm/Organization Name Field**: Collects the name of the user's organization

These fields are only visible during the signup process.

### 2. Data Storage

User profile information is stored in Firestore in the `userProfiles` collection:

```
userProfiles/
  └── [userId]/
      ├── email: user@example.com
      ├── phone: "+1234567890"
      ├── firmName: "ABC Educational Institute"
      ├── displayName: "ABC Educational Institute"
      ├── createdAt: timestamp
      └── uid: "user_uid"
```

### 3. Data Retrieval

The profile page retrieves user information from two sources:

1. **Firebase Authentication**: Basic user information (email, display name)
2. **Firestore**: Extended profile information (phone, firm name)

### 4. Google Sign-In Integration

For users who sign in with Google:
- Phone number is taken from the Google account (if available)
- Firm/Organization name can be entered manually during signup
- Profile is automatically created for new Google users

## Code Structure

### Components Modified

1. **Login Component** (`src/components/Login.jsx`)
   - Added phone number and firm name fields to signup form
   - Implemented Google sign-in functionality
   - Added profile creation logic after signup

2. **Profile Component** (`src/components/profile/Profile.jsx`)
   - Enhanced to display phone number and firm name
   - Added logic to fetch extended profile data from Firestore

3. **Firebase Service** (`src/services/firebaseService.js`)
   - Added `createUserProfile` function
   - Added `getUserProfile` function

### Styling

The login form has been updated with new styles:
- Google sign-in button with distinctive styling
- Proper spacing and layout for additional fields

## Testing the Implementation

### 1. Email/Password Signup

1. Navigate to the login page
2. Click "Don't have an account? Sign Up"
3. Fill in:
   - Email
   - Password
   - Phone Number
   - Firm/Organization Name
4. Click "Sign Up"
5. Verify the profile is created in Firestore

### 2. Google Sign-In

1. Navigate to the login page
2. Click "Sign in with Google"
3. Complete Google authentication
4. Verify the profile is created in Firestore

### 3. Profile Display

1. After logging in, navigate to the Profile page
2. Verify that:
   - Phone number is displayed (or "Not provided")
   - Firm/Organization name is displayed (or "Not provided")

## Firestore Security Rules

To protect user profile data, you should implement appropriate Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - only accessible by the user themselves
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Existing rules for other collections...
  }
}
```

## Customization Options

### Adding More Profile Fields

To add more fields to the user profile:

1. Add the field to the signup form in `Login.jsx`
2. Include the field in the `profileData` object
3. Update the Firestore security rules if needed
4. Modify the Profile component to display the new field

### Validation

Currently, there's minimal validation on the profile fields. You can enhance this by:

1. Adding HTML5 validation attributes to form inputs
2. Implementing client-side validation in the form submission handler
3. Adding server-side validation in Firestore security rules

## Troubleshooting

### Common Issues

1. **Profile Not Saving**
   - Check browser console for Firestore errors
   - Verify Firestore security rules allow writes
   - Ensure user is authenticated before saving profile

2. **Profile Not Loading**
   - Check browser console for Firestore errors
   - Verify Firestore security rules allow reads
   - Ensure the user profile document exists

3. **Google Sign-In Not Creating Profile**
   - Check browser console for errors
   - Verify the GoogleAuthProvider is correctly configured
   - Ensure the profile creation function is being called

### Debugging Tips

1. Use browser developer tools to monitor:
   - Network requests to Firestore
   - Console logs for errors
   - React component state changes

2. Check Firestore data in the Firebase Console:
   - Verify documents are created correctly
   - Check field names and data types

3. Test with different user accounts:
   - Email/password users
   - Google sign-in users
   - Users with and without profile data

## Future Enhancements

Consider implementing these enhancements:

1. **Profile Editing**
   - Add a form to edit profile information
   - Implement update functionality in Firebase service

2. **Avatar Upload**
   - Allow users to upload profile pictures
   - Store images in Firebase Storage

3. **Email Verification**
   - Require email verification for new accounts
   - Display verification status in profile

4. **Phone Number Verification**
   - Implement SMS verification for phone numbers
   - Use Firebase Authentication's phone number verification

5. **Multi-factor Authentication**
   - Enable 2FA for enhanced security
   - Integrate with Firebase's MFA features

## Conclusion

The phone number and firm name collection has been successfully implemented in your application. Users can now provide additional information during signup, which is stored securely in Firestore and displayed in their profile.

For any issues or questions about this implementation, refer to the browser console for error messages and check the Firebase documentation for Firestore and Authentication services.