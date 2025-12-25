# WhatsApp Fee Reminder System Setup Guide

## Overview
This guide explains how to set up and deploy the automated WhatsApp fee reminder system for the Fees Management application.

## Prerequisites
1. Meta Developer Account with WhatsApp Business API access
2. WhatsApp Business Account
3. Firebase project with Blaze plan (required for scheduled functions)
4. Phone Number ID and Access Token from Meta

## Setup Steps

### 1. Configure Meta WhatsApp Business API
1. Go to [Meta Developers Portal](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the WhatsApp product to your app
4. Get your:
   - Phone Number ID
   - Permanent Access Token

### 2. Set Firebase Configuration
Configure the WhatsApp credentials in Firebase:

```bash
firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID" whatsapp.access_token="YOUR_ACCESS_TOKEN"
```

### 3. Deploy Cloud Functions
Deploy the functions to Firebase:

```bash
cd functions
npm install
firebase deploy --only functions
```

### 4. Verify Deployment
Check that the function is deployed correctly:

```bash
firebase functions:log
```

## How It Works

### Function Details
- **Name**: `sendWhatsAppFeeReminders`
- **Schedule**: Daily at 9:00 AM (Asia/Kolkata timezone)
- **Trigger**: Firebase Pub/Sub scheduler

### Eligibility Criteria
Students must meet ALL of these conditions to receive reminders:
1. `pendingFees > 0`
2. `reminderEnabled !== false` (defaults to `true`)
3. Valid Indian phone number in `contact` field
4. Last reminder was sent more than 24 hours ago (or never sent)

### Message Template
The system sends a polite, professional message:

```
Hello [Student Name],

This is a friendly reminder from [School Name] regarding your pending fees of ₹[Amount].

Please make the payment at your earliest convenience to avoid any inconvenience.

If you have already made the payment, please ignore this message.

Thank you!
[School Name] Team
```

## Safety Features
1. **Rate Limiting**: Sends maximum one reminder per student per 24 hours
2. **Payment Status Check**: Skips students who have paid their fees
3. **Error Handling**: Silently handles API errors without crashing
4. **Validation**: Validates phone numbers before sending
5. **Opt-Out Support**: Students can disable reminders by setting `reminderEnabled` to `false`

## Firestore Schema Updates
Two new fields are added to the student documents:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reminderEnabled` | Boolean | `true` | Controls whether reminders are sent |
| `lastReminderSent` | Timestamp | `null` | Tracks when the last reminder was sent |

## Testing
To test the function manually:

```bash
firebase functions:shell
sendWhatsAppFeeReminders()
```

## Monitoring
Check logs for function execution:

```bash
firebase functions:log --only sendWhatsAppFeeReminders
```

## Troubleshooting
Common issues and solutions:

1. **Function not triggering**: Ensure Firebase Blaze plan is enabled
2. **Authentication errors**: Verify WhatsApp credentials are correctly configured
3. **Phone number issues**: Ensure phone numbers are in valid Indian format
4. **Rate limiting**: Check that reminders aren't being sent too frequently

## Cost Considerations
- Firebase Blaze plan required (pay-as-you-go)
- WhatsApp API calls are billed by Meta
- Firestore reads/writes are billed normally

## Scaling
The system is designed to handle 1000+ students efficiently:
- Batch processing of student data
- Parallel message sending
- Automatic rate limiting
- Error isolation (one failure doesn't stop others)