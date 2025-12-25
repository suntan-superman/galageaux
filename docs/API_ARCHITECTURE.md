# 🔌 Galageaux Backend API Architecture

*Version 1.0 — December 2025*

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Authentication](#authentication)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [Security](#security)
7. [Error Handling](#error-handling)
8. [Implementation Guide](#implementation-guide)

---

## Overview

Galageaux uses **Firebase** as its backend-as-a-service (BaaS) platform, providing:

- **Authentication** — Email/password sign-up and sign-in
- **Cloud Firestore** — NoSQL database for game saves and leaderboards
- **Cloud Storage** — Asset storage (future use)
- **Cloud Functions** — Server-side logic for leaderboard validation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App (React Native)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AuthContext │  │ CloudSave   │  │ Leaderboard Service     │  │
│  │             │  │ Service     │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase SDK Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Firebase     │  │ Cloud        │  │ Cloud Functions      │   │
│  │ Auth         │  │ Firestore    │  │ (Score Validation)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Client | React Native + Expo | Mobile app framework |
| Auth | Firebase Authentication | User management |
| Database | Cloud Firestore | Game data storage |
| Functions | Cloud Functions (Node.js) | Score validation |
| Analytics | Firebase Analytics | Usage tracking |
| Crash Reporting | Firebase Crashlytics | Error tracking |

---

## Authentication

### Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  User    │────▶│  AuthScreen  │────▶│ Firebase Auth│
│          │     │              │     │              │
└──────────┘     └──────────────┘     └──────────────┘
                        │                    │
                        │    ┌───────────────┘
                        │    │ JWT Token
                        ▼    ▼
                 ┌──────────────┐
                 │ AuthContext  │
                 │ (State Mgmt) │
                 └──────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Firestore   │
                 │  (User Doc)  │
                 └──────────────┘
```

### Supported Auth Methods

1. **Email/Password** (Primary)
   - Sign up with email verification
   - Sign in with email/password
   - Password reset via email

2. **Anonymous Auth** (Future)
   - Play without account
   - Convert to full account later

3. **Social Auth** (Future)
   - Google Sign-In
   - Apple Sign-In

### Auth Service API

```javascript
// Sign Up
AuthService.signUp(email, password, userData)
// Returns: { success, user?, needsEmailVerification?, error? }

// Sign In
AuthService.signIn(email, password)
// Returns: { success, user?, error? }

// Sign Out
AuthService.signOut()
// Returns: { success, error? }

// Password Reset
AuthService.resetPassword(email)
// Returns: { success, error? }

// Email Verification
AuthService.sendEmailVerification()
// Returns: { success, error? }

// Check Verification Status
AuthService.isEmailVerified()
// Returns: boolean

// Get Current User
AuthService.getCurrentUser()
// Returns: FirebaseUser | null

// Delete Account
AuthService.deleteAccount()
// Returns: { success, error? }
```

---

## Data Models

### Users Collection (`/users/{userId}`)

```typescript
interface UserDocument {
  // Basic info
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  emailVerified: boolean;
  
  // Profile (optional)
  avatarUrl?: string;
  country?: string;
}
```

### Game Saves Collection (`/gameSaves/{userId}`)

```typescript
interface GameSaveDocument {
  version: number; // Schema version for migrations
  updatedAt: Timestamp;
  
  data: {
    // High scores
    highScore: number;
    highestStage: number; // 1-3
    highestWave: number;
    
    // Lifetime statistics
    stats: {
      totalGamesPlayed: number;
      totalEnemiesDestroyed: number;
      totalBossesDefeated: number;
      totalPowerupsCollected: number;
      totalPlayTime: number; // seconds
      longestCombo: number;
      perfectStages: number;
      totalDeaths: number;
    };
    
    // Achievements
    achievements: string[]; // Array of achievement IDs
    
    // Settings
    settings: {
      audioEnabled: boolean;
      musicVolume: number; // 0-1
      sfxVolume: number; // 0-1
      vibrationEnabled: boolean;
      tiltSensitivity: number; // 0.2-1.5
      autoFire: boolean;
    };
    
    // Unlocks
    unlockedShips: string[];
    selectedShip: string;
  };
}
```

### Leaderboard Collection (`/leaderboard/{scoreId}`)

```typescript
interface LeaderboardEntry {
  score: number;
  userId: string;
  displayName: string;
  stage: number;
  wave: number;
  enemiesDestroyed: number;
  maxCombo: number;
  playTime: number; // seconds
  timestamp: Timestamp;
  platform: 'ios' | 'android' | 'web';
  
  // Anti-cheat (set by Cloud Function)
  validated?: boolean;
  validationScore?: number;
}
```

### Daily Challenges Collection (`/dailyChallenges/{date}`)

```typescript
interface DailyChallenge {
  date: string; // YYYY-MM-DD
  type: 'score' | 'combo' | 'survival' | 'perfect';
  target: number;
  modifiers: {
    enemySpeedMultiplier?: number;
    scoreMultiplier?: number;
    startingLives?: number;
  };
  rewards: {
    xp: number;
    achievement?: string;
  };
}
```

---

## API Endpoints

### Cloud Save API

```javascript
// Save Progress
CloudSaveService.saveProgress(userId, saveData)
// POST equivalent - saves to /gameSaves/{userId}
// Returns: { success, error? }

// Load Progress
CloudSaveService.loadProgress(userId)
// GET equivalent - reads from /gameSaves/{userId}
// Returns: { success, data?, isNewSave?, error? }

// Conflict Resolution
CloudSaveService.resolveConflict(localData, cloudData)
// Pure function - merges two save states
// Returns: mergedData
```

### Leaderboard API

```javascript
// Submit Score
LeaderboardService.submitScore(scoreData)
// POST to /leaderboard (auto-generated ID)
// Returns: { success, rank?, error? }

// Get Top Scores
LeaderboardService.getTopScores(period, count)
// GET from /leaderboard with filters
// period: 'daily' | 'weekly' | 'alltime'
// Returns: { success, scores?, error? }

// Get User Rank
LeaderboardService.getUserRank(userId)
// Query /leaderboard for user's position
// Returns: { success, rank?, userScore?, error? }
```

---

## Security

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Game saves - users can only access their own saves
    match /gameSaves/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Validate save data structure
      allow write: if validateSaveData(request.resource.data);
    }
    
    // Leaderboard - anyone can read, only authenticated users can write
    match /leaderboard/{scoreId} {
      allow read: if true;
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid
                    && validateScoreData(request.resource.data);
      allow update, delete: if false; // Scores are immutable
    }
    
    // Helper functions
    function validateSaveData(data) {
      return data.version is number
          && data.data.highScore is number
          && data.data.highScore >= 0
          && data.data.highScore <= 999999999;
    }
    
    function validateScoreData(data) {
      return data.score is number
          && data.score >= 0
          && data.score <= 999999999
          && data.stage is number
          && data.stage >= 1
          && data.stage <= 10;
    }
  }
}
```

### Anti-Cheat Measures

1. **Score Validation (Cloud Function)**
   - Validates score against play time and stage
   - Checks for impossible values
   - Flags suspicious patterns

2. **Rate Limiting**
   - Maximum 1 score submission per minute
   - Maximum 10 score submissions per hour

3. **Replay Verification** (Future)
   - Store input replay data
   - Server-side replay verification

---

## Error Handling

### Error Codes

| Code | Meaning | User Message |
|------|---------|--------------|
| `auth/email-already-in-use` | Email registered | "This email is already registered." |
| `auth/invalid-email` | Bad email format | "Please enter a valid email." |
| `auth/weak-password` | Password too short | "Password must be at least 6 characters." |
| `auth/user-not-found` | No such user | "No account found with this email." |
| `auth/wrong-password` | Bad password | "Incorrect password." |
| `auth/too-many-requests` | Rate limited | "Too many attempts. Try again later." |
| `save/conflict` | Cloud conflict | "Syncing your progress..." |
| `leaderboard/invalid-score` | Bad score data | "Unable to submit score." |
| `network/offline` | No connection | "You're offline. Progress saved locally." |

### Error Response Format

```javascript
{
  success: false,
  error: {
    code: 'auth/invalid-email',
    message: 'Please enter a valid email address.',
    details?: any // Optional additional info
  }
}
```

---

## Implementation Guide

### Setting Up Firebase

1. **Create Firebase Project**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize project
   firebase init
   ```

2. **Configure Environment Variables**
   ```bash
   # .env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
   ```

3. **Deploy Security Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

### Using Services in App

```javascript
// Authentication
import { AuthService } from '../services/firebase';

const handleSignIn = async (email, password) => {
  const result = await AuthService.signIn(email, password);
  if (result.success) {
    // Navigate to game
  } else {
    // Show error: result.error.message
  }
};

// Cloud Save
import { CloudSaveService } from '../services/firebase';

const saveProgress = async () => {
  const result = await CloudSaveService.saveProgress(userId, gameData);
  if (!result.success) {
    // Queue for later retry
  }
};

// Leaderboard
import { LeaderboardService } from '../services/firebase';

const submitScore = async (score, gameStats) => {
  const result = await LeaderboardService.submitScore({
    score,
    stage: gameStats.stage,
    wave: gameStats.wave,
    enemiesDestroyed: gameStats.enemiesDestroyed,
    maxCombo: gameStats.maxCombo,
    playTime: gameStats.playTime,
  });
  
  if (result.success) {
    console.log(`You ranked #${result.rank}!`);
  }
};
```

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Email/password authentication
- ✅ Cloud save/load
- ✅ Basic leaderboard

### Phase 2 (Planned)
- [ ] Social authentication (Google, Apple)
- [ ] Friends list
- [ ] Friend score comparison
- [ ] Daily challenges

### Phase 3 (Future)
- [ ] Multiplayer lobby
- [ ] Real-time co-op mode
- [ ] In-app purchases
- [ ] Push notifications

---

*Last Updated: December 2025*
