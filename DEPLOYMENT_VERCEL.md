# Deploying to Vercel

This guide explains how to deploy the Fees Management System to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Node.js installed locally (for testing)
3. Your Firebase project credentials

## Step-by-Step Deployment

### 1. Prepare Your Project

Ensure your project has the following files:
- `package.json` (with build scripts)
- `vite.config.js` (configured for Vercel)
- `vercel.json` (routing configuration)
- Environment variables in `.env` (for local testing)

### 2. Deploy Using Vercel CLI (Recommended)

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Navigate to your project directory:
   ```bash
   cd fees-management
   ```

3. Deploy to Vercel:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N` (for first deployment)
   - What's your project's name? (press Enter for default)
   - In which directory is your code located? `./`
   - Want to override the settings? `N`

### 3. Configure Environment Variables

After the initial deployment, configure your Firebase environment variables:

```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```

For each variable, Vercel will ask:
- What's the value of VARIABLE_NAME? (Enter your Firebase config value)
- Add to which Environments (select all): Development, Preview, Production

### 4. Deploy to Production

Deploy your site to production:
```bash
vercel --prod
```

### 5. Alternative: Deploy Using Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to your Vercel dashboard
3. Click "New Project"
4. Import your repository
5. Configure project settings:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables in the "Environment Variables" section
7. Click "Deploy"

## Environment Variables

You must set these environment variables in your Vercel project:

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | Firebase Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Firebase Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Firebase Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Firebase Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Firebase Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Firebase Project Settings |

## Troubleshooting

### Common Issues

1. **Routing Issues**: Make sure `vercel.json` is in your project root
2. **Environment Variables Not Loaded**: Ensure variables are prefixed with `VITE_`
3. **Build Failures**: Check that all dependencies are in `package.json`

### Checking Deployment Logs

View deployment logs in the Vercel dashboard or use:
```bash
vercel logs [your-domain].vercel.app
```

## Redeployment

After making changes:
```bash
git add .
git commit -m "Update code"
git push origin main
```

Vercel will automatically deploy new commits to your connected repository.

For manual redeployment with Vercel CLI:
```bash
vercel --prod
```