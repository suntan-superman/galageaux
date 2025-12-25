/**
 * Firebase Services for Galageaux
 * 
 * This module provides a unified interface for all Firebase operations including:
 * - Authentication (signUp, signIn, signOut, password reset, email verification)
 * - Cloud Save (game progress synchronization)
 * - Leaderboards (score submission and retrieval)
 * 
 * @module services/firebase
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../constants/firebase';

// ============================================================================
// ERROR MESSAGE MAPPING
// ============================================================================

/**
 * Firebase error code to user-friendly message mapping
 */
const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/expired-action-code': 'This link has expired. Please request a new one.',
  'auth/invalid-action-code': 'This link is invalid. Please request a new one.',
  default: 'An unexpected error occurred. Please try again.',
};

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

/**
 * Authentication service for user management
 */
export const AuthService = {
  /**
   * Get user-friendly error message from Firebase error code
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  getErrorMessage(errorCode) {
    return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
  },

  /**
   * Get the currently signed-in user
   * @returns {Object|null} Current Firebase user or null
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Called with user object or null
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
  },

  /**
   * Check if current user's email is verified
   * @returns {Promise<boolean>} True if email is verified
   */
  async isEmailVerified() {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Reload user to get latest verification status
    await user.reload();
    return user.emailVerified;
  },

  /**
   * Create a new user account with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {Object} userData - Additional user data to store
   * @returns {Promise<{success: boolean, user?: Object, needsEmailVerification?: boolean, error?: Object}>}
   */
  async signUp(email, password, userData = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const userDoc = {
        email: firebaseUser.email,
        displayName: userData.name || userData.displayName || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: false,
        ...userData,
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);

      // Send verification email
      await firebaseSendEmailVerification(firebaseUser);

      return {
        success: true,
        user: { id: firebaseUser.uid, ...userDoc },
        needsEmailVerification: true,
        email: firebaseUser.email,
      };
    } catch (error) {
      console.error('SignUp error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },

  /**
   * Sign in with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{success: boolean, user?: Object, error?: Object}>}
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user data from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
      };

      if (userDocSnap.exists()) {
        userData = {
          ...userData,
          ...userDocSnap.data(),
        };
      }

      // Update last login time
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
        emailVerified: firebaseUser.emailVerified,
      });

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error('SignIn error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },

  /**
   * Sign out the current user
   * @returns {Promise<{success: boolean, error?: Object}>}
   */
  async signOut() {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('SignOut error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @returns {Promise<{success: boolean, error?: Object}>}
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('ResetPassword error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },

  /**
   * Send email verification to current user
   * @returns {Promise<{success: boolean, error?: Object}>}
   */
  async sendEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: { message: 'No user is signed in.' },
        };
      }

      await firebaseSendEmailVerification(user);
      return { success: true };
    } catch (error) {
      console.error('SendEmailVerification error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },

  /**
   * Delete the current user's account
   * @returns {Promise<{success: boolean, error?: Object}>}
   */
  async deleteAccount() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: { message: 'No user is signed in.' },
        };
      }

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete user's game save
      await deleteDoc(doc(db, 'gameSaves', user.uid));
      
      // Delete Firebase auth user
      await deleteUser(user);

      return { success: true };
    } catch (error) {
      console.error('DeleteAccount error:', error);
      return {
        success: false,
        error: {
          code: error.code,
          message: this.getErrorMessage(error.code),
        },
      };
    }
  },
};

// ============================================================================
// CLOUD SAVE SERVICE
// ============================================================================

/**
 * Cloud save data schema version
 * Increment when save format changes
 */
const SAVE_VERSION = 1;

/**
 * Cloud save service for game progress synchronization
 */
export const CloudSaveService = {
  /**
   * Save game progress to cloud
   * @param {string} userId - User's ID
   * @param {Object} saveData - Game save data
   * @returns {Promise<{success: boolean, error?: Object}>}
   */
  async saveProgress(userId, saveData) {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required.' } };
      }

      const saveDoc = {
        version: SAVE_VERSION,
        updatedAt: serverTimestamp(),
        data: {
          // High scores
          highScore: saveData.highScore || 0,
          highestStage: saveData.highestStage || 1,
          highestWave: saveData.highestWave || 1,
          
          // Lifetime statistics
          stats: {
            totalGamesPlayed: saveData.stats?.totalGamesPlayed || 0,
            totalEnemiesDestroyed: saveData.stats?.totalEnemiesDestroyed || 0,
            totalBossesDefeated: saveData.stats?.totalBossesDefeated || 0,
            totalPowerupsCollected: saveData.stats?.totalPowerupsCollected || 0,
            totalPlayTime: saveData.stats?.totalPlayTime || 0, // in seconds
            longestCombo: saveData.stats?.longestCombo || 0,
            perfectStages: saveData.stats?.perfectStages || 0,
            totalDeaths: saveData.stats?.totalDeaths || 0,
          },
          
          // Achievements
          achievements: saveData.achievements || [],
          
          // Settings
          settings: {
            audioEnabled: saveData.settings?.audioEnabled ?? true,
            musicVolume: saveData.settings?.musicVolume ?? 0.7,
            sfxVolume: saveData.settings?.sfxVolume ?? 1.0,
            vibrationEnabled: saveData.settings?.vibrationEnabled ?? true,
            tiltSensitivity: saveData.settings?.tiltSensitivity ?? 0.5,
            autoFire: saveData.settings?.autoFire ?? true,
          },
          
          // Unlocks
          unlockedShips: saveData.unlockedShips || ['default'],
          selectedShip: saveData.selectedShip || 'default',
        },
      };

      await setDoc(doc(db, 'gameSaves', userId), saveDoc, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('SaveProgress error:', error);
      return {
        success: false,
        error: { message: 'Failed to save progress. Please try again.' },
      };
    }
  },

  /**
   * Load game progress from cloud
   * @param {string} userId - User's ID
   * @returns {Promise<{success: boolean, data?: Object, error?: Object}>}
   */
  async loadProgress(userId) {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required.' } };
      }

      const saveDocRef = doc(db, 'gameSaves', userId);
      const saveDocSnap = await getDoc(saveDocRef);

      if (!saveDocSnap.exists()) {
        // No save exists yet, return default data
        return {
          success: true,
          data: this.getDefaultSaveData(),
          isNewSave: true,
        };
      }

      const saveData = saveDocSnap.data();
      
      // Handle version migration if needed
      if (saveData.version !== SAVE_VERSION) {
        const migratedData = this.migrateData(saveData);
        return { success: true, data: migratedData };
      }

      return { success: true, data: saveData.data };
    } catch (error) {
      console.error('LoadProgress error:', error);
      return {
        success: false,
        error: { message: 'Failed to load progress. Please try again.' },
      };
    }
  },

  /**
   * Get default save data for new players
   * @returns {Object} Default save data structure
   */
  getDefaultSaveData() {
    return {
      highScore: 0,
      highestStage: 1,
      highestWave: 1,
      stats: {
        totalGamesPlayed: 0,
        totalEnemiesDestroyed: 0,
        totalBossesDefeated: 0,
        totalPowerupsCollected: 0,
        totalPlayTime: 0,
        longestCombo: 0,
        perfectStages: 0,
        totalDeaths: 0,
      },
      achievements: [],
      settings: {
        audioEnabled: true,
        musicVolume: 0.7,
        sfxVolume: 1.0,
        vibrationEnabled: true,
        tiltSensitivity: 0.5,
        autoFire: true,
      },
      unlockedShips: ['default'],
      selectedShip: 'default',
    };
  },

  /**
   * Migrate old save data to current version
   * @param {Object} oldData - Old save data
   * @returns {Object} Migrated save data
   */
  migrateData(oldData) {
    // Future: Add migration logic when save format changes
    return oldData.data || this.getDefaultSaveData();
  },

  /**
   * Resolve conflicts between local and cloud saves
   * @param {Object} localData - Local save data
   * @param {Object} cloudData - Cloud save data
   * @returns {Object} Merged save data (keeps higher values)
   */
  resolveConflict(localData, cloudData) {
    return {
      // Keep highest scores
      highScore: Math.max(localData.highScore || 0, cloudData.highScore || 0),
      highestStage: Math.max(localData.highestStage || 1, cloudData.highestStage || 1),
      highestWave: Math.max(localData.highestWave || 1, cloudData.highestWave || 1),
      
      // Keep highest stats
      stats: {
        totalGamesPlayed: Math.max(
          localData.stats?.totalGamesPlayed || 0,
          cloudData.stats?.totalGamesPlayed || 0
        ),
        totalEnemiesDestroyed: Math.max(
          localData.stats?.totalEnemiesDestroyed || 0,
          cloudData.stats?.totalEnemiesDestroyed || 0
        ),
        totalBossesDefeated: Math.max(
          localData.stats?.totalBossesDefeated || 0,
          cloudData.stats?.totalBossesDefeated || 0
        ),
        totalPowerupsCollected: Math.max(
          localData.stats?.totalPowerupsCollected || 0,
          cloudData.stats?.totalPowerupsCollected || 0
        ),
        totalPlayTime: Math.max(
          localData.stats?.totalPlayTime || 0,
          cloudData.stats?.totalPlayTime || 0
        ),
        longestCombo: Math.max(
          localData.stats?.longestCombo || 0,
          cloudData.stats?.longestCombo || 0
        ),
        perfectStages: Math.max(
          localData.stats?.perfectStages || 0,
          cloudData.stats?.perfectStages || 0
        ),
        totalDeaths: Math.max(
          localData.stats?.totalDeaths || 0,
          cloudData.stats?.totalDeaths || 0
        ),
      },
      
      // Merge achievements (union of both)
      achievements: [...new Set([
        ...(localData.achievements || []),
        ...(cloudData.achievements || []),
      ])],
      
      // Use most recently updated settings (prefer cloud if available)
      settings: cloudData.settings || localData.settings,
      
      // Merge unlocked ships
      unlockedShips: [...new Set([
        ...(localData.unlockedShips || ['default']),
        ...(cloudData.unlockedShips || ['default']),
      ])],
      
      selectedShip: cloudData.selectedShip || localData.selectedShip || 'default',
    };
  },
};

// ============================================================================
// LEADERBOARD SERVICE
// ============================================================================

/**
 * Leaderboard service for global high scores
 */
export const LeaderboardService = {
  /**
   * Submit a score to the leaderboard
   * @param {Object} scoreData - Score submission data
   * @returns {Promise<{success: boolean, rank?: number, error?: Object}>}
   */
  async submitScore(scoreData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: { message: 'Must be signed in to submit scores.' } };
      }

      const { score, stage, wave, enemiesDestroyed, maxCombo, playTime } = scoreData;

      // Validate score
      if (typeof score !== 'number' || score < 0 || score > 999999999) {
        return { success: false, error: { message: 'Invalid score value.' } };
      }

      // Get user's display name
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const displayName = userDocSnap.exists() 
        ? userDocSnap.data().displayName || 'Anonymous'
        : 'Anonymous';

      // Create score entry
      const scoreEntry = {
        score,
        userId: user.uid,
        displayName,
        stage: stage || 1,
        wave: wave || 1,
        enemiesDestroyed: enemiesDestroyed || 0,
        maxCombo: maxCombo || 0,
        playTime: playTime || 0,
        timestamp: serverTimestamp(),
        platform: 'mobile',
      };

      // Add to leaderboard collection
      const leaderboardRef = doc(collection(db, 'leaderboard'));
      await setDoc(leaderboardRef, scoreEntry);

      // Update user's personal best if applicable
      const gameSaveRef = doc(db, 'gameSaves', user.uid);
      const gameSaveSnap = await getDoc(gameSaveRef);
      const currentHighScore = gameSaveSnap.exists() 
        ? gameSaveSnap.data().data?.highScore || 0 
        : 0;

      if (score > currentHighScore) {
        await updateDoc(gameSaveRef, {
          'data.highScore': score,
          'data.highestStage': Math.max(stage || 1, gameSaveSnap.data()?.data?.highestStage || 1),
          'data.highestWave': Math.max(wave || 1, gameSaveSnap.data()?.data?.highestWave || 1),
          updatedAt: serverTimestamp(),
        });
      }

      // Get rank (count how many scores are higher)
      const higherScoresQuery = query(
        collection(db, 'leaderboard'),
        where('score', '>', score)
      );
      const higherScoresSnap = await getDocs(higherScoresQuery);
      const rank = higherScoresSnap.size + 1;

      return { success: true, rank };
    } catch (error) {
      console.error('SubmitScore error:', error);
      return {
        success: false,
        error: { message: 'Failed to submit score. Please try again.' },
      };
    }
  },

  /**
   * Get top scores from leaderboard
   * @param {string} period - 'daily', 'weekly', or 'alltime'
   * @param {number} count - Number of scores to retrieve
   * @returns {Promise<{success: boolean, scores?: Array, error?: Object}>}
   */
  async getTopScores(period = 'alltime', count = 100) {
    try {
      let leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('score', 'desc'),
        limit(count)
      );

      // Add time filter for daily/weekly
      if (period === 'daily') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        leaderboardQuery = query(
          collection(db, 'leaderboard'),
          where('timestamp', '>=', oneDayAgo),
          orderBy('timestamp', 'desc'),
          orderBy('score', 'desc'),
          limit(count)
        );
      } else if (period === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        leaderboardQuery = query(
          collection(db, 'leaderboard'),
          where('timestamp', '>=', oneWeekAgo),
          orderBy('timestamp', 'desc'),
          orderBy('score', 'desc'),
          limit(count)
        );
      }

      const querySnapshot = await getDocs(leaderboardQuery);
      const scores = [];

      querySnapshot.forEach((doc, index) => {
        const data = doc.data();
        scores.push({
          id: doc.id,
          rank: index + 1,
          score: data.score,
          displayName: data.displayName || 'Anonymous',
          stage: data.stage,
          wave: data.wave,
          maxCombo: data.maxCombo,
          timestamp: data.timestamp?.toDate?.() || null,
        });
      });

      // Re-sort by score (for daily/weekly which are first sorted by timestamp)
      if (period !== 'alltime') {
        scores.sort((a, b) => b.score - a.score);
        scores.forEach((score, index) => {
          score.rank = index + 1;
        });
      }

      return { success: true, scores };
    } catch (error) {
      console.error('GetTopScores error:', error);
      return {
        success: false,
        error: { message: 'Failed to load leaderboard. Please try again.' },
      };
    }
  },

  /**
   * Get user's rank and nearby scores
   * @param {string} userId - User's ID
   * @returns {Promise<{success: boolean, rank?: number, nearbyScores?: Array, error?: Object}>}
   */
  async getUserRank(userId) {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required.' } };
      }

      // Get user's best score
      const gameSaveRef = doc(db, 'gameSaves', userId);
      const gameSaveSnap = await getDoc(gameSaveRef);
      const userHighScore = gameSaveSnap.exists() 
        ? gameSaveSnap.data().data?.highScore || 0 
        : 0;

      // Count how many unique users have higher scores
      const higherScoresQuery = query(
        collection(db, 'leaderboard'),
        where('score', '>', userHighScore)
      );
      const higherScoresSnap = await getDocs(higherScoresQuery);
      
      // Get unique users with higher scores
      const uniqueHigherUsers = new Set();
      higherScoresSnap.forEach((doc) => {
        uniqueHigherUsers.add(doc.data().userId);
      });
      
      const rank = uniqueHigherUsers.size + 1;

      return {
        success: true,
        rank,
        userScore: userHighScore,
      };
    } catch (error) {
      console.error('GetUserRank error:', error);
      return {
        success: false,
        error: { message: 'Failed to get rank. Please try again.' },
      };
    }
  },
};

// ============================================================================
// COMPANY SERVICE (for compatibility with AuthContext)
// ============================================================================

/**
 * Company service placeholder for AuthContext compatibility
 * Galageaux doesn't use companies, but AuthContext references it
 */
export const CompanyService = {
  async createCompany(companyData) {
    // Not implemented for game - return success to avoid errors
    console.log('CompanyService.createCompany called (not implemented for game)');
    return { success: true };
  },

  async joinCompanyByCode(userId, companyCode, role) {
    // Not implemented for game - return success to avoid errors
    console.log('CompanyService.joinCompanyByCode called (not implemented for game)');
    return { success: true };
  },
};

export default {
  AuthService,
  CloudSaveService,
  LeaderboardService,
  CompanyService,
};
