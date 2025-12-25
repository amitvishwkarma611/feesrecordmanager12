# Firestore Security Rules Documentation

This document outlines all the Firestore security rules implemented for the fees management system, including the subscription management rules.

## Table of Contents
1. [Overview](#overview)
2. [User Profiles](#user-profiles)
3. [User-Specific Data](#user-specific-data)
4. [Collections](#collections)
5. [Subscriptions](#subscriptions)
6. [Field Validation](#field-validation)

## Overview

The Firestore security rules are designed to ensure that users can only access their own data while maintaining data integrity and security. All rules require authentication and implement granular permissions based on user IDs.

## User Profiles

```javascript
match /userProfiles/{userId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

- Users can only read and write their own profile data
- Authentication is required for all operations

## User-Specific Data

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

- All user-specific data is stored under `/users/{userId}/` namespace
- Users have full read/write access to their own data
- Recursive matching ensures all subcollections are protected

## Collections

### Students
```javascript
match /users/{userId}/students/{studentId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Payments
```javascript
match /users/{userId}/payments/{paymentId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Expenditures
```javascript
match /users/{userId}/expenditures/{expenditureId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Attendance
```javascript
match /users/{userId}/attendance/{attendanceId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Staff
```javascript
match /users/{userId}/staff/{staffId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Feedback
```javascript
match /users/{userId}/feedback/{feedbackId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Support Queries
```javascript
match /users/{userId}/supportQueries/{queryId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

### Staff Attendance
```javascript
match /users/{userId}/staffAttendance/{attendanceId} {
  allow create, read, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
}
```

## Subscriptions

The subscriptions collection is unique as it's stored at the top level but still user-specific:

```javascript
match /subscriptions/{subscriptionId} {
  // Users can only read their own subscription
  allow read: if request.auth != null
               && request.auth.uid == subscriptionId;
  
  // Users can only create their own subscription (typically done once)
  allow create: if request.auth != null
                 && request.auth.uid == subscriptionId;
  
  // Users can only update their own subscription
  allow update: if request.auth != null
                 && request.auth.uid == subscriptionId;
  
  // Users cannot delete their subscription
  allow delete: if false;
  
  // Additional field validation
  allow write: if request.auth != null
                && request.auth.uid == subscriptionId
                && (request.resource.data.keys().hasOnly([
                  'plan', 'status', 'trialStartDate', 'trialEndsAt', 
                  'isPaid', 'paidAt', 'amount', 'createdAt', 'updatedAt', 'userId', 'activatedAt', 'nextBillingDate'
                ]));
}
```

### Subscription Fields Explanation

- `plan`: The subscription plan type (e.g., 'TRIAL', 'PRO_499_MONTHLY')
- `status`: Current status of the subscription ('active', 'expired')
- `trialStartDate`: Timestamp when the trial period started
- `trialEndDate`: Timestamp when the trial period ends
- `amount`: Amount paid for the subscription
- `createdAt`: Timestamp when the subscription was created
- `updatedAt`: Timestamp when the subscription was last updated
- `userId`: User ID associated with this subscription
- `activatedAt`: Timestamp when the subscription was activated (for paid plans)
- `nextBillingDate`: Timestamp for the next billing date (for monthly subscriptions)

## Field Validation

All subscription writes are validated to ensure only allowed fields can be written:

```javascript
request.resource.data.keys().hasOnly([
  'plan', 'status', 'trialStartDate', 'trialEndDate', 
  'amount', 'createdAt', 'updatedAt', 'userId', 'activatedAt', 'nextBillingDate'
])
```

This prevents unauthorized addition or modification of fields not explicitly allowed.

## Security Best Practices Implemented

1. **Principle of Least Privilege**: Users only have access to their own data
2. **Authentication Required**: All operations require authenticated users
3. **Granular Permissions**: Different permissions for different operations where appropriate
4. **Field Validation**: Strict validation on subscription data to prevent unauthorized fields
5. **No Delete Permissions**: Subscriptions cannot be deleted, only expired
6. **User ID Matching**: All operations verify the requesting user ID matches the target resource ID