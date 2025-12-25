# Galageaux Deployment Guide

This document covers deployment procedures for all Galageaux applications:
- **Mobile App** (iOS/Android) - React Native + Expo
- **Marketing Website** (galageauxweb) - Vite static site on Netlify
- **Backend** - Firebase (Auth, Firestore, Storage, Functions)

---

## ⚠️ Important: Environment Variables

**DO NOT modify environment variables during deployment.** All environment variables are pre-configured in their respective platforms:
- Mobile: Set in EAS Build secrets
- Web: Set in Netlify environment settings
- Firebase: Configured in Firebase Console

Modifying or re-setting environment variables during deployment will **replace or remove existing variables**, causing authentication and service failures.

---

## 📱 Mobile App Deployment (iOS & Android)

### Prerequisites

- Node.js 18+ and Yarn installed
- EAS CLI installed: `npm install -g eas-cli`
- Logged into Expo: `eas login`
- Apple Developer account (iOS)
- Google Play Console access (Android)

### Set Correct EAS Project

```bash
# Verify you're using the correct project
eas whoami
eas project:info

# Project ID: b8ad8243-6b58-45d1-a61c-e22e65191733
# Owner: Your Expo account
```

### Building for Production

#### iOS Build

```bash
# Navigate to project root
cd galageaux

# Build for iOS App Store
eas build --platform ios --profile production

# This will:
# - Use image: latest (as configured in eas.json)
# - Auto-increment build number
# - Create an IPA for App Store submission
```

#### Android Build

```bash
# Build for Google Play Store
eas build --platform android --profile production

# This creates an AAB (Android App Bundle) for Play Store
```

#### Build Both Platforms

```bash
eas build --platform all --profile production
```

### Submitting to App Stores

#### iOS App Store

```bash
# Submit to App Store Connect
eas submit --platform ios --latest

# Or submit a specific build
eas submit --platform ios --id <build-id>
```

**iOS Submission Configuration** (from eas.json):
- Apple ID: `sroy@prologixsa.com`
- ASC App ID: `6755568919`
- Apple Team ID: `K2H76A4V66`

#### Google Play Store

```bash
# Submit to Google Play
eas submit --platform android --latest

# First-time setup requires service account key
# See: https://docs.expo.dev/submit/android/
```

### Development & Preview Builds

```bash
# Development build (with dev client)
eas build --platform ios --profile development
eas build --platform android --profile development

# Preview/Internal testing build
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### OTA Updates (No App Store Review)

For JavaScript-only changes:

```bash
# Publish an update to production
eas update --branch production --message "Bug fixes"

# Publish to preview channel
eas update --branch preview --message "New feature testing"
```

---

## 🌐 Marketing Website Deployment (Netlify)

The marketing website (`galageauxweb/`) is automatically deployed via Netlify's GitHub integration.

### Deployment Process

1. **Push to GitHub** - Commits to the main branch trigger automatic deployment
2. **Netlify builds** - Runs `npm run build` (Vite)
3. **Publishes** - Deploys the `dist/` folder

### Manual Deployment (if needed)

```bash
# Navigate to web directory
cd galageauxweb

# Install dependencies
npm install

# Build locally (for testing)
npm run build

# Preview build locally
npm run preview
```

### Netlify Configuration

The `netlify.toml` file configures:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Branch Deploys

- **Production**: `main` branch → production URL
- **Preview**: Pull requests get preview URLs automatically

### Netlify Dashboard

Access the Netlify dashboard to:
- View deploy logs
- Rollback to previous deploys
- Check build status
- **DO NOT modify environment variables here**

---

## 🔥 Firebase Backend Deployment

### Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Logged into Firebase: `firebase login`
- gcloud CLI installed (for advanced operations)

### Set Correct Firebase Project

```bash
# List available projects
firebase projects:list

# Set the active project
firebase use galageaux
# or
firebase use <project-id>

# Verify current project
firebase projects:list
# Look for (current) marker
```

### For gcloud CLI

```bash
# List available projects
gcloud projects list

# Set the active project
gcloud config set project galageaux
# or
gcloud config set project <project-id>

# Verify current project
gcloud config get-value project
```

### Deploying Firebase Services

#### Deploy Everything

```bash
firebase deploy
```

#### Deploy Specific Services

```bash
# Firestore Rules only
firebase deploy --only firestore:rules

# Firestore Indexes only
firebase deploy --only firestore:indexes

# Storage Rules only
firebase deploy --only storage

# Cloud Functions only
firebase deploy --only functions

# Hosting only (if using Firebase Hosting)
firebase deploy --only hosting
```

### Firestore Security Rules

Rules are defined in `firestore.rules` (if present):

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Test rules locally
firebase emulators:start --only firestore
```

### Cloud Functions (if applicable)

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:functionName
```

### Firebase Emulators (Local Testing)

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only auth,firestore,functions
```

---

## 🔄 Complete Deployment Workflow

### Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] No TypeScript/ESLint errors
- [ ] Version bumped in `app.config.js` (if needed)
- [ ] Changes committed to Git
- [ ] Correct Firebase/EAS project selected

### Full Production Deploy

```bash
# 1. Verify projects
firebase use galageaux
eas whoami

# 2. Run tests
npm test

# 3. Deploy Firebase (if backend changes)
firebase deploy

# 4. Build mobile apps
eas build --platform all --profile production

# 5. Submit to app stores
eas submit --platform ios --latest
eas submit --platform android --latest

# 6. Push to GitHub (triggers Netlify deploy)
git push origin main
```

---

## 🚨 Troubleshooting

### Build Failures

```bash
# Clear Expo cache
expo start --clear

# Clear EAS cache and rebuild
eas build --clear-cache --platform ios

# Check build logs
eas build:list
eas build:view <build-id>
```

### Firebase Issues

```bash
# Verify authentication
firebase login --reauth

# Check project configuration
firebase projects:list

# View function logs
firebase functions:log
```

### Netlify Issues

1. Check build logs in Netlify dashboard
2. Verify `netlify.toml` configuration
3. Test build locally: `npm run build`

### Wrong Project Selected

```bash
# Firebase - switch projects
firebase use <correct-project-id>

# EAS - verify project
cat app.config.js | grep projectId

# gcloud - switch projects
gcloud config set project <correct-project-id>
```

---

## 📋 Project Configuration Reference

### Mobile App (EAS)

| Setting | Value |
|---------|-------|
| Project ID | `b8ad8243-6b58-45d1-a61c-e22e65191733` |
| iOS Bundle ID | `com.sjroy5.galageaux` |
| Android Package | `com.sjroy5.galageaux` |
| Apple Team ID | `K2H76A4V66` |
| ASC App ID | `6755568919` |

### Firebase

| Service | Status |
|---------|--------|
| Authentication | ✅ Enabled |
| Firestore | ✅ Enabled |
| Storage | ✅ Enabled |
| Functions | ✅ Available |

### Web (Netlify)

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Publish Directory | `dist` |
| Framework | Vite |

---

## 📞 Support Contacts

- **App Store Issues**: Apple Developer Support
- **Play Store Issues**: Google Play Console Help
- **EAS Build Issues**: [Expo Forums](https://forums.expo.dev)
- **Firebase Issues**: [Firebase Support](https://firebase.google.com/support)
- **Netlify Issues**: [Netlify Support](https://www.netlify.com/support)
