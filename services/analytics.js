/**
 * Analytics Framework for Galageaux
 * 
 * Provides event tracking with:
 * - Firebase Analytics integration
 * - Privacy-respecting data collection
 * - Event batching for performance
 * - Session tracking
 * - User properties
 * 
 * @module services/analytics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// ANALYTICS CONFIGURATION
// ============================================================================

/**
 * Analytics storage key for queued events
 */
const QUEUE_STORAGE_KEY = '@galageaux/analytics_queue';

/**
 * Privacy consent storage key
 */
const CONSENT_STORAGE_KEY = '@galageaux/analytics_consent';

/**
 * Maximum events to queue before force flush
 */
const MAX_QUEUE_SIZE = 50;

/**
 * Flush interval in milliseconds
 */
const FLUSH_INTERVAL = 30000; // 30 seconds

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Predefined event names for consistency
 */
export const AnalyticsEvents = {
  // Session events
  APP_OPEN: 'app_open',
  APP_CLOSE: 'app_close',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // Game lifecycle
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  GAME_PAUSE: 'game_pause',
  GAME_RESUME: 'game_resume',

  // Progression
  STAGE_START: 'stage_start',
  STAGE_COMPLETE: 'stage_complete',
  WAVE_START: 'wave_start',
  WAVE_COMPLETE: 'wave_complete',
  BOSS_START: 'boss_start',
  BOSS_DEFEAT: 'boss_defeat',

  // Player actions
  PLAYER_DEATH: 'player_death',
  POWERUP_COLLECT: 'powerup_collect',
  ENEMY_DESTROY: 'enemy_destroy',
  COMBO_ACHIEVED: 'combo_achieved',

  // Achievements
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  ACHIEVEMENT_VIEW: 'achievement_view',

  // Scores
  SCORE_MILESTONE: 'score_milestone',
  HIGH_SCORE: 'high_score',
  LEADERBOARD_SUBMIT: 'leaderboard_submit',
  LEADERBOARD_VIEW: 'leaderboard_view',

  // UI interactions
  MENU_VIEW: 'menu_view',
  BUTTON_CLICK: 'button_click',
  SETTINGS_CHANGE: 'settings_change',
  LANGUAGE_CHANGE: 'language_change',

  // Auth
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',

  // Errors
  ERROR: 'error',
  CRASH: 'crash',

  // Performance
  FRAME_DROP: 'frame_drop',
  LOAD_TIME: 'load_time',
};

/**
 * User property names
 */
export const UserProperties = {
  HIGH_SCORE: 'high_score',
  GAMES_PLAYED: 'games_played',
  HIGHEST_STAGE: 'highest_stage',
  TOTAL_PLAY_TIME: 'total_play_time',
  ACHIEVEMENTS_COUNT: 'achievements_count',
  PREFERRED_LANGUAGE: 'preferred_language',
  AUDIO_ENABLED: 'audio_enabled',
  FIRST_PLAY_DATE: 'first_play_date',
};

// ============================================================================
// ANALYTICS STATE
// ============================================================================

/**
 * Analytics state
 */
const state = {
  isInitialized: false,
  isEnabled: true,
  hasConsent: false,
  sessionId: null,
  sessionStartTime: null,
  userId: null,
  eventQueue: [],
  flushTimer: null,
  firebaseAnalytics: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the analytics framework
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
export async function initializeAnalytics(options = {}) {
  if (state.isInitialized) return;

  try {
    // Check consent status
    const consentStr = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    state.hasConsent = consentStr === 'true';

    // Load queued events
    const queueStr = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (queueStr) {
      try {
        state.eventQueue = JSON.parse(queueStr);
      } catch {
        state.eventQueue = [];
      }
    }

    // Try to initialize Firebase Analytics
    try {
      // Note: Firebase Analytics must be properly configured in the project
      // This is a conditional import to avoid crashes if not configured
      const analytics = await import('@react-native-firebase/analytics');
      state.firebaseAnalytics = analytics.default();
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.log('Firebase Analytics not available, using local-only mode');
    }

    // Start session
    state.sessionId = generateSessionId();
    state.sessionStartTime = Date.now();

    // Set up flush timer
    state.flushTimer = setInterval(flushQueue, FLUSH_INTERVAL);

    state.isInitialized = true;

    // Track app open
    trackEvent(AnalyticsEvents.APP_OPEN, {
      session_id: state.sessionId,
      platform: Platform.OS,
    });

  } catch (error) {
    console.error('Failed to initialize analytics:', error);
  }
}

/**
 * Shutdown analytics (call on app close)
 */
export async function shutdownAnalytics() {
  if (!state.isInitialized) return;

  // Track app close
  const sessionDuration = Date.now() - (state.sessionStartTime || Date.now());
  trackEvent(AnalyticsEvents.APP_CLOSE, {
    session_id: state.sessionId,
    session_duration_ms: sessionDuration,
  });

  // Flush remaining events
  await flushQueue();

  // Clear timer
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }

  state.isInitialized = false;
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Set analytics consent
 * @param {boolean} hasConsent - Whether user has given consent
 */
export async function setAnalyticsConsent(hasConsent) {
  state.hasConsent = hasConsent;
  
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, hasConsent.toString());
  } catch (error) {
    console.error('Failed to save consent:', error);
  }

  if (state.firebaseAnalytics) {
    try {
      await state.firebaseAnalytics.setAnalyticsCollectionEnabled(hasConsent);
    } catch (error) {
      console.error('Failed to update Firebase consent:', error);
    }
  }
}

/**
 * Get current consent status
 * @returns {boolean}
 */
export function getAnalyticsConsent() {
  return state.hasConsent;
}

/**
 * Enable or disable analytics
 * @param {boolean} enabled 
 */
export function setAnalyticsEnabled(enabled) {
  state.isEnabled = enabled;
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track an analytics event
 * @param {string} eventName - Event name (use AnalyticsEvents constants)
 * @param {Object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (!state.isEnabled || !state.hasConsent) return;

  const event = {
    name: eventName,
    params: {
      ...params,
      timestamp: Date.now(),
      session_id: state.sessionId,
    },
  };

  // Add to queue
  state.eventQueue.push(event);

  // Send to Firebase if available
  if (state.firebaseAnalytics) {
    try {
      state.firebaseAnalytics.logEvent(eventName, params);
    } catch (error) {
      console.error('Firebase event error:', error);
    }
  }

  // Flush if queue is full
  if (state.eventQueue.length >= MAX_QUEUE_SIZE) {
    flushQueue();
  }
}

/**
 * Track game start event
 * @param {Object} gameParams - Game configuration
 */
export function trackGameStart(gameParams = {}) {
  trackEvent(AnalyticsEvents.GAME_START, {
    stage: gameParams.stage || 1,
    difficulty: gameParams.difficulty || 'normal',
    control_type: gameParams.controlType || 'tilt',
    audio_enabled: gameParams.audioEnabled ?? true,
  });
}

/**
 * Track game end event
 * @param {Object} gameResults - Game results
 */
export function trackGameEnd(gameResults = {}) {
  trackEvent(AnalyticsEvents.GAME_END, {
    score: gameResults.score || 0,
    stage: gameResults.stage || 1,
    wave: gameResults.wave || 1,
    enemies_destroyed: gameResults.enemiesDestroyed || 0,
    max_combo: gameResults.maxCombo || 0,
    powerups_collected: gameResults.powerupsCollected || 0,
    play_time_seconds: gameResults.playTime || 0,
    death_cause: gameResults.deathCause || 'enemy',
    is_high_score: gameResults.isHighScore || false,
  });
}

/**
 * Track stage completion
 * @param {Object} stageData - Stage results
 */
export function trackStageComplete(stageData = {}) {
  trackEvent(AnalyticsEvents.STAGE_COMPLETE, {
    stage: stageData.stage || 1,
    score: stageData.score || 0,
    time_seconds: stageData.time || 0,
    enemies_destroyed: stageData.enemiesDestroyed || 0,
    perfect: stageData.perfect || false,
    lives_remaining: stageData.livesRemaining || 0,
  });
}

/**
 * Track achievement unlock
 * @param {string} achievementId - Achievement identifier
 */
export function trackAchievementUnlock(achievementId) {
  trackEvent(AnalyticsEvents.ACHIEVEMENT_UNLOCK, {
    achievement_id: achievementId,
  });
}

/**
 * Track error
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {Object} context - Additional context
 */
export function trackError(errorType, errorMessage, context = {}) {
  trackEvent(AnalyticsEvents.ERROR, {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}

/**
 * Track screen/menu view
 * @param {string} screenName - Screen name
 */
export function trackScreenView(screenName) {
  trackEvent(AnalyticsEvents.MENU_VIEW, {
    screen_name: screenName,
  });

  if (state.firebaseAnalytics) {
    try {
      state.firebaseAnalytics.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (error) {
      console.error('Firebase screen view error:', error);
    }
  }
}

// ============================================================================
// USER PROPERTIES
// ============================================================================

/**
 * Set a user property
 * @param {string} name - Property name (use UserProperties constants)
 * @param {*} value - Property value
 */
export function setUserProperty(name, value) {
  if (!state.isEnabled || !state.hasConsent) return;

  if (state.firebaseAnalytics) {
    try {
      state.firebaseAnalytics.setUserProperty(name, String(value));
    } catch (error) {
      console.error('Failed to set user property:', error);
    }
  }
}

/**
 * Set user ID for analytics
 * @param {string|null} userId - User ID or null to clear
 */
export function setAnalyticsUserId(userId) {
  state.userId = userId;

  if (state.firebaseAnalytics) {
    try {
      state.firebaseAnalytics.setUserId(userId);
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }
}

/**
 * Update user stats after game
 * @param {Object} stats - User statistics
 */
export function updateUserStats(stats) {
  if (stats.highScore !== undefined) {
    setUserProperty(UserProperties.HIGH_SCORE, stats.highScore);
  }
  if (stats.gamesPlayed !== undefined) {
    setUserProperty(UserProperties.GAMES_PLAYED, stats.gamesPlayed);
  }
  if (stats.highestStage !== undefined) {
    setUserProperty(UserProperties.HIGHEST_STAGE, stats.highestStage);
  }
  if (stats.totalPlayTime !== undefined) {
    setUserProperty(UserProperties.TOTAL_PLAY_TIME, stats.totalPlayTime);
  }
  if (stats.achievementsCount !== undefined) {
    setUserProperty(UserProperties.ACHIEVEMENTS_COUNT, stats.achievementsCount);
  }
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Flush event queue to storage
 */
async function flushQueue() {
  if (state.eventQueue.length === 0) return;

  try {
    // Save to storage as backup
    await AsyncStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify(state.eventQueue.slice(-MAX_QUEUE_SIZE))
    );

    // In a real implementation, you might send to a custom analytics endpoint
    // For now, we just rely on Firebase Analytics real-time sending

    // Clear processed events (keep last 10 for debugging)
    if (state.eventQueue.length > 10) {
      state.eventQueue = state.eventQueue.slice(-10);
    }
  } catch (error) {
    console.error('Failed to flush analytics queue:', error);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate unique session ID
 * @returns {string}
 */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current session info
 * @returns {Object}
 */
export function getSessionInfo() {
  return {
    sessionId: state.sessionId,
    startTime: state.sessionStartTime,
    duration: Date.now() - (state.sessionStartTime || Date.now()),
    isEnabled: state.isEnabled,
    hasConsent: state.hasConsent,
  };
}

/**
 * Get analytics debug info
 * @returns {Object}
 */
export function getDebugInfo() {
  return {
    isInitialized: state.isInitialized,
    isEnabled: state.isEnabled,
    hasConsent: state.hasConsent,
    queueSize: state.eventQueue.length,
    hasFirebase: !!state.firebaseAnalytics,
    sessionId: state.sessionId,
  };
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for analytics
 * @returns {Object} Analytics utilities
 */
export function useAnalytics() {
  return {
    trackEvent,
    trackGameStart,
    trackGameEnd,
    trackStageComplete,
    trackAchievementUnlock,
    trackError,
    trackScreenView,
    setUserProperty,
    updateUserStats,
    getSessionInfo,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeAnalytics,
  shutdownAnalytics,
  setAnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsEnabled,
  trackEvent,
  trackGameStart,
  trackGameEnd,
  trackStageComplete,
  trackAchievementUnlock,
  trackError,
  trackScreenView,
  setUserProperty,
  setAnalyticsUserId,
  updateUserStats,
  getSessionInfo,
  getDebugInfo,
  useAnalytics,
  AnalyticsEvents,
  UserProperties,
};
