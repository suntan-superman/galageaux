/**
 * Crash Reporting Service for Galageaux
 * 
 * Provides comprehensive error and crash tracking with:
 * - Firebase Crashlytics integration
 * - Sentry fallback support
 * - Error context enrichment
 * - Breadcrumb tracking
 * - Performance monitoring
 * 
 * @module services/crashReporting
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Maximum breadcrumbs to keep
 */
const MAX_BREADCRUMBS = 100;

/**
 * Storage key for offline crash reports
 */
const OFFLINE_REPORTS_KEY = '@galageaux/offline_crashes';

// ============================================================================
// STATE
// ============================================================================

const state = {
  isInitialized: false,
  isEnabled: true,
  crashlytics: null,
  sentry: null,
  breadcrumbs: [],
  userContext: {},
  customKeys: {},
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize crash reporting
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initializeCrashReporting(options = {}) {
  if (state.isInitialized) return true;

  try {
    // Try Firebase Crashlytics first
    try {
      const crashlytics = await import('@react-native-firebase/crashlytics');
      state.crashlytics = crashlytics.default();
      
      if (options.enabled !== false) {
        await state.crashlytics.setCrashlyticsCollectionEnabled(true);
      }
      
      console.log('Firebase Crashlytics initialized');
    } catch (error) {
      console.log('Firebase Crashlytics not available:', error.message);
    }

    // Try Sentry as fallback
    if (!state.crashlytics) {
      try {
        const Sentry = await import('@sentry/react-native');
        
        if (options.sentryDsn) {
          Sentry.init({
            dsn: options.sentryDsn,
            environment: options.environment || 'production',
            enableAutoSessionTracking: true,
            tracesSampleRate: 0.2,
          });
          
          state.sentry = Sentry;
          console.log('Sentry initialized');
        }
      } catch (error) {
        console.log('Sentry not available:', error.message);
      }
    }

    // Set up global error handler
    setupGlobalErrorHandler();

    // Send any offline reports
    await sendOfflineReports();

    state.isInitialized = true;
    
    // Add initialization breadcrumb
    addBreadcrumb('app', 'Crash reporting initialized');

    return true;
  } catch (error) {
    console.error('Failed to initialize crash reporting:', error);
    return false;
  }
}

/**
 * Set up global unhandled error and promise rejection handlers
 */
function setupGlobalErrorHandler() {
  // Handle unhandled JS errors
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    recordError(error, {
      isFatal,
      type: 'unhandled_exception',
    });

    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    const originalRejectionHandler = global.onunhandledrejection;
    
    global.onunhandledrejection = (event) => {
      recordError(event.reason || new Error('Unhandled Promise Rejection'), {
        type: 'unhandled_promise_rejection',
      });

      if (originalRejectionHandler) {
        originalRejectionHandler(event);
      }
    };
  }
}

// ============================================================================
// ERROR RECORDING
// ============================================================================

/**
 * Record an error or exception
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context
 */
export function recordError(error, context = {}) {
  if (!state.isEnabled) return;

  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Enrich with context
  const enrichedContext = {
    ...state.customKeys,
    ...state.userContext,
    ...context,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    breadcrumbs: state.breadcrumbs.slice(-20),
  };

  // Log to console in development
  if (__DEV__) {
    console.error('Recorded error:', errorObj.message, enrichedContext);
  }

  // Send to Crashlytics
  if (state.crashlytics) {
    try {
      // Set custom keys
      Object.entries(enrichedContext).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          state.crashlytics.setAttribute(key, String(value));
        }
      });

      state.crashlytics.recordError(errorObj);
    } catch (e) {
      console.error('Crashlytics recordError failed:', e);
    }
  }

  // Send to Sentry
  if (state.sentry) {
    try {
      state.sentry.withScope((scope) => {
        scope.setExtras(enrichedContext);
        state.sentry.captureException(errorObj);
      });
    } catch (e) {
      console.error('Sentry captureException failed:', e);
    }
  }

  // Store offline if no service available
  if (!state.crashlytics && !state.sentry) {
    storeOfflineReport(errorObj, enrichedContext);
  }
}

/**
 * Record a non-fatal issue with a message
 * @param {string} message - Issue message
 * @param {Object} context - Additional context
 */
export function recordMessage(message, context = {}) {
  if (!state.isEnabled) return;

  const enrichedContext = {
    ...state.customKeys,
    ...state.userContext,
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (state.crashlytics) {
    try {
      state.crashlytics.log(message);
    } catch (e) {
      console.error('Crashlytics log failed:', e);
    }
  }

  if (state.sentry) {
    try {
      state.sentry.captureMessage(message, {
        level: context.level || 'info',
        extra: enrichedContext,
      });
    } catch (e) {
      console.error('Sentry captureMessage failed:', e);
    }
  }
}

/**
 * Force a test crash (for testing crash reporting)
 * WARNING: This will crash the app!
 */
export function testCrash() {
  if (state.crashlytics) {
    state.crashlytics.crash();
  } else if (state.sentry) {
    state.sentry.nativeCrash();
  } else {
    throw new Error('Test crash - no crash reporting service available');
  }
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

/**
 * Add a breadcrumb for debugging
 * @param {string} category - Breadcrumb category
 * @param {string} message - Breadcrumb message
 * @param {Object} data - Additional data
 */
export function addBreadcrumb(category, message, data = {}) {
  const breadcrumb = {
    category,
    message,
    data,
    timestamp: Date.now(),
  };

  state.breadcrumbs.push(breadcrumb);

  // Trim to max size
  if (state.breadcrumbs.length > MAX_BREADCRUMBS) {
    state.breadcrumbs = state.breadcrumbs.slice(-MAX_BREADCRUMBS);
  }

  // Send to services
  if (state.crashlytics) {
    try {
      state.crashlytics.log(`[${category}] ${message}`);
    } catch (e) {
      // Ignore
    }
  }

  if (state.sentry) {
    try {
      state.sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
      });
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Add navigation breadcrumb
 * @param {string} from - Previous screen
 * @param {string} to - New screen
 */
export function addNavigationBreadcrumb(from, to) {
  addBreadcrumb('navigation', `${from} → ${to}`, { from, to });
}

/**
 * Add game action breadcrumb
 * @param {string} action - Action name
 * @param {Object} data - Action data
 */
export function addGameBreadcrumb(action, data = {}) {
  addBreadcrumb('game', action, data);
}

/**
 * Add user interaction breadcrumb
 * @param {string} action - Interaction type
 * @param {string} target - Target element
 */
export function addInteractionBreadcrumb(action, target) {
  addBreadcrumb('ui', `${action}: ${target}`, { action, target });
}

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Set user identifier for crash reports
 * @param {string|null} userId - User ID or null to clear
 */
export function setUserId(userId) {
  state.userContext.userId = userId;

  if (state.crashlytics) {
    try {
      state.crashlytics.setUserId(userId || '');
    } catch (e) {
      // Ignore
    }
  }

  if (state.sentry) {
    try {
      state.sentry.setUser(userId ? { id: userId } : null);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Set custom key-value pair for crash reports
 * @param {string} key - Key name
 * @param {string|number|boolean} value - Value
 */
export function setCustomKey(key, value) {
  state.customKeys[key] = value;

  if (state.crashlytics) {
    try {
      state.crashlytics.setAttribute(key, String(value));
    } catch (e) {
      // Ignore
    }
  }

  if (state.sentry) {
    try {
      state.sentry.setTag(key, String(value));
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Set multiple custom keys
 * @param {Object} keys - Key-value pairs
 */
export function setCustomKeys(keys) {
  Object.entries(keys).forEach(([key, value]) => {
    setCustomKey(key, value);
  });
}

/**
 * Set game context for crash reports
 * @param {Object} gameState - Current game state
 */
export function setGameContext(gameState) {
  const context = {
    game_stage: gameState.stage,
    game_wave: gameState.wave,
    game_score: gameState.score,
    game_lives: gameState.lives,
    game_paused: gameState.isPaused,
  };

  setCustomKeys(context);
}

// ============================================================================
// OFFLINE STORAGE
// ============================================================================

/**
 * Store crash report for later sending
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 */
async function storeOfflineReport(error, context) {
  try {
    const reportsStr = await AsyncStorage.getItem(OFFLINE_REPORTS_KEY);
    const reports = reportsStr ? JSON.parse(reportsStr) : [];

    reports.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
    });

    // Keep only last 50 reports
    const trimmedReports = reports.slice(-50);

    await AsyncStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(trimmedReports));
  } catch (e) {
    console.error('Failed to store offline report:', e);
  }
}

/**
 * Send stored offline reports
 */
async function sendOfflineReports() {
  if (!state.crashlytics && !state.sentry) return;

  try {
    const reportsStr = await AsyncStorage.getItem(OFFLINE_REPORTS_KEY);
    if (!reportsStr) return;

    const reports = JSON.parse(reportsStr);

    for (const report of reports) {
      const error = new Error(report.message);
      error.stack = report.stack;
      
      recordError(error, {
        ...report.context,
        offline: true,
        originalTimestamp: report.timestamp,
      });
    }

    // Clear stored reports
    await AsyncStorage.removeItem(OFFLINE_REPORTS_KEY);
  } catch (e) {
    console.error('Failed to send offline reports:', e);
  }
}

// ============================================================================
// ENABLE/DISABLE
// ============================================================================

/**
 * Enable or disable crash reporting
 * @param {boolean} enabled 
 */
export async function setCrashReportingEnabled(enabled) {
  state.isEnabled = enabled;

  if (state.crashlytics) {
    try {
      await state.crashlytics.setCrashlyticsCollectionEnabled(enabled);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Check if crash reporting is enabled
 * @returns {boolean}
 */
export function isCrashReportingEnabled() {
  return state.isEnabled;
}

// ============================================================================
// DEBUG
// ============================================================================

/**
 * Get debug info about crash reporting state
 * @returns {Object}
 */
export function getDebugInfo() {
  return {
    isInitialized: state.isInitialized,
    isEnabled: state.isEnabled,
    hasCrashlytics: !!state.crashlytics,
    hasSentry: !!state.sentry,
    breadcrumbCount: state.breadcrumbs.length,
    customKeysCount: Object.keys(state.customKeys).length,
  };
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for crash reporting
 * @returns {Object} Crash reporting utilities
 */
export function useCrashReporting() {
  return {
    recordError,
    recordMessage,
    addBreadcrumb,
    addGameBreadcrumb,
    addNavigationBreadcrumb,
    addInteractionBreadcrumb,
    setCustomKey,
    setGameContext,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeCrashReporting,
  recordError,
  recordMessage,
  testCrash,
  addBreadcrumb,
  addNavigationBreadcrumb,
  addGameBreadcrumb,
  addInteractionBreadcrumb,
  setUserId,
  setCustomKey,
  setCustomKeys,
  setGameContext,
  setCrashReportingEnabled,
  isCrashReportingEnabled,
  getDebugInfo,
  useCrashReporting,
};
