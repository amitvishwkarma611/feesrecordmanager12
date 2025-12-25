# Firebase Collection Structure

This document explains how the Firebase collections are structured in the Fees Management System and how they work with the Firestore security rules.

## Collection Structure

All collections in the system use a flat structure at the root level with ownership enforced through the `ownerId` field:

```
Firestore Database
├── users/{userId}           # User profiles (one document per user)
├── students                 # All students across all users
├── staff                    # All staff across all users
├── fees                     # All fee records across all users
├── expenditures             # All expenditures across all users
├── attendance               # All attendance records across all users
└── supportQueries           # All support queries across all users
```

## Security Rules Enforcement

The Firestore security rules enforce ownership-based access control:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // 🔐 Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // 🎓 Students collection (UID based ownership)
    match /students/{studentId} {
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;

      allow read, update, delete: if request.auth != null
                    && resource.data.ownerId == request.auth.uid;
    }

    // 👨‍🏫 Staff collection
    match /staff/{staffId} {
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;

      allow read, update, delete: if request.auth != null
                    && resource.data.ownerId == request.auth.uid;
    }

    // 💰 Fees / Payments
    match /fees/{feeId} {
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;

      allow read, update, delete: if request.auth != null
                    && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

## Implementation Details

### 1. ownerId Field Requirement

Every document in the collections must include an `ownerId` field that matches the authenticated user's UID:

```javascript
// Correct way to add a student
const studentData = {
  name: "John Doe",
  email: "john@example.com",
  ownerId: currentUser.uid,  // Required for security rules
  // ... other fields
};

await addDoc(collection(db, 'students'), studentData);
```

### 2. Client-Side Implementation

The Firebase service functions in `src/services/firebaseService.js` automatically add the `ownerId` field:

```javascript
export const addStudent = async (studentData) => {
  // Add ownerId for security rules compliance
  const studentDataWithOwner = {
    ...studentData,
    ownerId: getCurrentUserUID()
  };
  
  const docRef = await addDoc(studentsCollection(), studentDataWithOwner);
  return { id: docRef.id, ...studentDataWithOwner };
};
```

### 3. Document Path Consistency

All operations use the top-level collection paths:
- ✅ `collection(db, 'students')`
- ❌ `collection(db, `users/${uid}/students`)`

This ensures consistency with the security rules and prevents path-based access issues.

## Troubleshooting Collection Issues

### Common Issues and Solutions

1. **Permission Denied Errors**
   - Ensure the `ownerId` field is correctly set
   - Verify the user is authenticated
   - Check that the UID matches the authenticated user

2. **Documents Not Appearing**
   - Verify the `ownerId` field matches the current user
   - Check Firestore rules in the Firebase Console
   - Ensure proper indexing if using complex queries

3. **Write Failures**
   - Confirm all required fields are present
   - Check for data type mismatches
   - Verify Firestore storage limits are not exceeded

### Testing Collection Access

Use the test script `test-collection-generation.js` to verify that collections are working correctly:

```bash
node test-collection-generation.js
```

This script will:
1. Create a test user
2. Add a test document with proper ownerId
3. Verify the document can be retrieved
4. Clean up test data

## Best Practices

1. **Always Include ownerId**: Every document operation must include the `ownerId` field
2. **Use Service Functions**: Utilize the provided service functions in `firebaseService.js` rather than direct Firestore calls
3. **Handle Authentication**: Always check authentication status before performing operations
4. **Error Handling**: Implement proper error handling for permission and network issues
5. **Data Validation**: Validate data on both client and server sides

## Related Files

- `src/services/firebaseService.js` - Main service functions
- `src/utils/auth.js` - Authentication utilities
- `src/firebase/firebaseConfig.js` - Firebase configuration
- `firestore.rules` - Security rules
- `test-collection-generation.js` - Test script