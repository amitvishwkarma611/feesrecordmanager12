# Unverified User Cleanup System

This document explains the automatic cleanup system for unverified users in the Fees Management System.

## Overview

The system automatically deletes unverified user accounts and their associated data after 7 days to maintain database cleanliness and security.

## How It Works

1. **Scheduled Execution**: The cleanup function runs daily at midnight (IST timezone).
2. **User Identification**: The system identifies users who:
   - Have not verified their email address
   - Were created more than 7 days ago
3. **Data Deletion**: For each identified user, the system:
   - Deletes the user account from Firebase Authentication
   - Removes all associated data from Firestore:
     - User profile document
     - All user-specific collections (students, payments, expenditures, etc.)

## Implementation Details

- **Function Name**: `deleteUnverifiedUsers`
- **Schedule**: Daily at 00:00 IST (`0 0 * * *`)
- **Location**: `functions/src/deleteUnverifiedUsers.js`

## Security Considerations

- Only unverified users are targeted
- Verified users are never affected by this cleanup
- The system maintains data integrity by removing all related data

## Monitoring

- Check Firebase Functions logs for execution results
- Monitor the success and failure counts
- Review any errors in the logs if users aren't being deleted as expected

## Testing

To test the function:
1. Create a test user account
2. Do not verify the email
3. Wait 7+ days or temporarily modify the function to test with a shorter period
4. Check the logs for execution results