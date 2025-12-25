# Fees Management System

A comprehensive fees management application for educational institutions built with React, Vite, and Firebase.

## Deployment to Vercel

Follow these steps to deploy the application to Vercel:

### 1. Prepare Your Firebase Project

Before deploying to Vercel, ensure you have:
1. Created a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enabled Firebase Authentication (Email/Password method)
3. Created Firestore database
4. Configured storage (if needed)

### 2. Get Your Firebase Configuration

From your Firebase project settings, get the following configuration values:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 3. Deploy to Vercel

#### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Navigate to your project directory:
   ```bash
   cd fees-management
   ```

3. Deploy the project:
   ```bash
   vercel
   ```

4. During the deployment process, Vercel will ask for:
   - Set up and deploy? `Y`
   - Which scope? Select your team or personal account
   - Link to existing project? `N` (for first deployment)
   - What's your project's name? (you can use the default or enter a custom name)
   - In which directory is your code located? `./`
   - Want to override the settings? `N`

5. After deployment, add environment variables:
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   vercel env add VITE_FIREBASE_PROJECT_ID
   vercel env add VITE_FIREBASE_STORAGE_BUCKET
   vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
   vercel env add VITE_FIREBASE_APP_ID
   ```

6. Redeploy the project:
   ```bash
   vercel --prod
   ```

#### Option 2: Using GitHub and Vercel Integration

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables in the "Environment Variables" section
7. Deploy the project

### 4. Environment Variables

In Vercel, you need to set the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSyBBvchyq9AsOtWmzlVcdnug9FY_MTaz2U8` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `416490982366` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:416490982366:web:65c9d54a605950582e6b4f` |

### 5. Redeployment

After making changes to your code:
```bash
git add .
git commit -m "Update code"
git push origin main
```

If you're using Vercel CLI:
```bash
vercel --prod
```

## Local Development

To run the project locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with your Firebase configuration

3. Run the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Firebase Collection Structure

This application uses a flat collection structure with ownership-based security rules. For details on how collections are structured and secured, see [FIREBASE_COLLECTION_STRUCTURE.md](FIREBASE_COLLECTION_STRUCTURE.md).

## Testing Firebase Collections

To test Firebase collection generation and security rules, see [TESTING_FIREBASE_COLLECTIONS.md](TESTING_FIREBASE_COLLECTIONS.md).

## Email Verification Troubleshooting

If you're experiencing issues with email verification (emails not arriving, resend not working), see [EMAIL_VERIFICATION_TROUBLESHOOTING.md](EMAIL_VERIFICATION_TROUBLESHOOTING.md).

## Build for Production

To build the project for production:
```bash
npm run build
```

The built files will be in the `dist` directory.# fees_track
