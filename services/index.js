/**
 * Services Index
 * 
 * Central export for all Galageaux services
 */

export { AuthService, CloudSaveService, LeaderboardService, CompanyService } from './firebase';
export { default as analytics, AnalyticsEvents, UserProperties } from './analytics';
export { default as crashReporting } from './crashReporting';

// Re-export for convenience
export {
  initializeAnalytics,
  shutdownAnalytics,
  setAnalyticsConsent,
  trackEvent,
  trackGameStart,
  trackGameEnd,
  trackStageComplete,
  trackAchievementUnlock,
  trackError,
  trackScreenView,
  useAnalytics,
} from './analytics';

export {
  initializeCrashReporting,
  recordError,
  recordMessage,
  addBreadcrumb,
  addGameBreadcrumb,
  addNavigationBreadcrumb,
  setUserId as setCrashUserId,
  setCustomKey,
  setGameContext,
  useCrashReporting,
} from './crashReporting';
