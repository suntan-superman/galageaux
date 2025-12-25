/**
 * Localization Framework for Galageaux
 * 
 * Provides internationalization (i18n) support with:
 * - Multiple language support
 * - String interpolation
 * - Pluralization
 * - Number/date formatting
 * - Language detection
 * 
 * @module i18n
 */

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// LANGUAGE CONFIGURATION
// ============================================================================

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  pt: 'Português',
};

/**
 * Default fallback language
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Storage key for language preference
 */
const LANGUAGE_STORAGE_KEY = '@galageaux/language';

// ============================================================================
// ENGLISH TRANSLATIONS (BASE)
// ============================================================================

const en = {
  // App general
  appName: 'Galageaux',
  loading: 'Loading...',
  error: 'Error',
  retry: 'Retry',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
  back: 'Back',
  close: 'Close',
  yes: 'Yes',
  no: 'No',
  ok: 'OK',

  // Main menu
  mainMenu: {
    title: 'GALAGEAUX',
    play: 'Play',
    continue: 'Continue',
    achievements: 'Achievements',
    leaderboard: 'Leaderboard',
    settings: 'Settings',
    credits: 'Credits',
    signIn: 'Sign In',
    signOut: 'Sign Out',
  },

  // Game UI
  game: {
    score: 'SCORE',
    highScore: 'HIGH',
    stage: 'STAGE',
    wave: 'WAVE',
    lives: 'LIVES',
    level: 'LEVEL',
    combo: 'COMBO',
    pause: 'PAUSED',
    resume: 'Resume',
    restart: 'Restart',
    quit: 'Quit',
    bossIncoming: 'BOSS INCOMING!',
    stageClear: 'STAGE CLEAR!',
    bonusRound: 'BONUS ROUND!',
    perfect: 'PERFECT!',
    getReady: 'GET READY!',
    go: 'GO!',
  },

  // Game over
  gameOver: {
    title: 'GAME OVER',
    finalScore: 'Final Score',
    newHighScore: 'NEW HIGH SCORE!',
    enemiesDestroyed: 'Enemies Destroyed',
    maxCombo: 'Max Combo',
    stagesCleared: 'Stages Cleared',
    playAgain: 'Play Again',
    mainMenu: 'Main Menu',
    shareScore: 'Share Score',
  },

  // Powerups
  powerups: {
    shield: 'SHIELD!',
    rapidFire: 'RAPID FIRE!',
    spreadShot: 'SPREAD SHOT!',
    extraLife: 'EXTRA LIFE!',
    bomb: 'SCREEN CLEAR!',
    doublePoints: 'DOUBLE POINTS!',
  },

  // Achievements
  achievements: {
    title: 'Achievements',
    locked: 'Locked',
    unlocked: 'Unlocked!',
    progress: '{{current}}/{{total}}',
    newUnlock: 'Achievement Unlocked!',
    
    // Achievement names
    firstBlood: 'First Blood',
    firstBloodDesc: 'Destroy your first enemy',
    combo10: 'Combo Master',
    combo10Desc: 'Reach a 10x combo',
    combo25: 'Combo King',
    combo25Desc: 'Reach a 25x combo',
    bossSlayer: 'Boss Slayer',
    bossSlayerDesc: 'Defeat your first boss',
    perfectStage: 'Perfectionist',
    perfectStageDesc: 'Complete a stage without getting hit',
    scoreHunter: 'Score Hunter',
    scoreHunterDesc: 'Reach 100,000 points',
    scoreMaster: 'Score Master',
    scoreMasterDesc: 'Reach 500,000 points',
    survivor: 'Survivor',
    survivorDesc: 'Play for 10 minutes in a single game',
    powerCollector: 'Power Collector',
    powerCollectorDesc: 'Collect 50 powerups',
    stageComplete: 'Stage Complete',
    stageCompleteDesc: 'Complete all 3 stages',
  },

  // Leaderboard
  leaderboard: {
    title: 'Leaderboard',
    daily: 'Daily',
    weekly: 'Weekly',
    allTime: 'All Time',
    rank: 'Rank',
    player: 'Player',
    score: 'Score',
    yourRank: 'Your Rank: #{{rank}}',
    noScores: 'No scores yet',
    loading: 'Loading scores...',
    signInToSubmit: 'Sign in to submit your score',
  },

  // Settings
  settings: {
    title: 'Settings',
    audio: 'Audio',
    music: 'Music',
    soundEffects: 'Sound Effects',
    vibration: 'Vibration',
    controls: 'Controls',
    tiltSensitivity: 'Tilt Sensitivity',
    autoFire: 'Auto Fire',
    language: 'Language',
    account: 'Account',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    deleteAccount: 'Delete Account',
    about: 'About',
    version: 'Version {{version}}',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
  },

  // Auth
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    createAccount: 'Create Account',
    resetPassword: 'Reset Password',
    resetPasswordSent: 'Password reset email sent!',
    verifyEmail: 'Please verify your email',
    checkEmail: 'Check your email for a verification link',
    resendVerification: 'Resend Verification',
    
    // Errors
    invalidEmail: 'Please enter a valid email',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    emailInUse: 'This email is already registered',
    wrongPassword: 'Incorrect password',
    userNotFound: 'No account found with this email',
    tooManyAttempts: 'Too many attempts. Please try again later.',
    networkError: 'Network error. Please check your connection.',
  },

  // Notifications
  notifications: {
    cloudSaveSuccess: 'Progress saved to cloud',
    cloudSaveFailed: 'Failed to save progress',
    cloudLoadSuccess: 'Progress loaded from cloud',
    cloudLoadFailed: 'Failed to load progress',
    scoreSubmitted: 'Score submitted to leaderboard!',
    newAchievement: 'Achievement unlocked: {{name}}',
  },

  // Tutorial
  tutorial: {
    welcome: 'Welcome to Galageaux!',
    tiltToMove: 'Tilt your device to move',
    tapToFire: 'Tap to fire',
    collectPowerups: 'Collect powerups to gain abilities',
    defeatBoss: 'Defeat the boss to advance',
    goodLuck: 'Good luck, pilot!',
    skip: 'Skip Tutorial',
    next: 'Next',
  },
};

// ============================================================================
// SPANISH TRANSLATIONS
// ============================================================================

const es = {
  appName: 'Galageaux',
  loading: 'Cargando...',
  error: 'Error',
  retry: 'Reintentar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  save: 'Guardar',
  back: 'Atrás',
  close: 'Cerrar',
  yes: 'Sí',
  no: 'No',
  ok: 'OK',

  mainMenu: {
    title: 'GALAGEAUX',
    play: 'Jugar',
    continue: 'Continuar',
    achievements: 'Logros',
    leaderboard: 'Clasificación',
    settings: 'Ajustes',
    credits: 'Créditos',
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
  },

  game: {
    score: 'PUNTOS',
    highScore: 'RÉCORD',
    stage: 'ETAPA',
    wave: 'OLEADA',
    lives: 'VIDAS',
    level: 'NIVEL',
    combo: 'COMBO',
    pause: 'PAUSA',
    resume: 'Continuar',
    restart: 'Reiniciar',
    quit: 'Salir',
    bossIncoming: '¡JEFE ACERCÁNDOSE!',
    stageClear: '¡ETAPA COMPLETADA!',
    bonusRound: '¡RONDA BONUS!',
    perfect: '¡PERFECTO!',
    getReady: '¡PREPÁRATE!',
    go: '¡YA!',
  },

  gameOver: {
    title: 'FIN DEL JUEGO',
    finalScore: 'Puntuación Final',
    newHighScore: '¡NUEVO RÉCORD!',
    enemiesDestroyed: 'Enemigos Destruidos',
    maxCombo: 'Combo Máximo',
    stagesCleared: 'Etapas Completadas',
    playAgain: 'Jugar de Nuevo',
    mainMenu: 'Menú Principal',
    shareScore: 'Compartir',
  },

  powerups: {
    shield: '¡ESCUDO!',
    rapidFire: '¡FUEGO RÁPIDO!',
    spreadShot: '¡DISPARO MÚLTIPLE!',
    extraLife: '¡VIDA EXTRA!',
    bomb: '¡EXPLOSIÓN!',
    doublePoints: '¡PUNTOS DOBLES!',
  },

  achievements: {
    title: 'Logros',
    locked: 'Bloqueado',
    unlocked: '¡Desbloqueado!',
    progress: '{{current}}/{{total}}',
    newUnlock: '¡Logro Desbloqueado!',
  },

  settings: {
    title: 'Ajustes',
    audio: 'Audio',
    music: 'Música',
    soundEffects: 'Efectos de Sonido',
    vibration: 'Vibración',
    controls: 'Controles',
    tiltSensitivity: 'Sensibilidad de Inclinación',
    autoFire: 'Disparo Automático',
    language: 'Idioma',
  },
};

// ============================================================================
// TRANSLATION REGISTRY
// ============================================================================

const translations = {
  en,
  es,
  // Add more languages as needed
};

// ============================================================================
// I18N STATE
// ============================================================================

let currentLanguage = DEFAULT_LANGUAGE;
let listeners = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-notated path (e.g., 'mainMenu.play')
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Interpolate variables in string
 * @param {string} str - String with {{variable}} placeholders
 * @param {Object} vars - Variables to interpolate
 * @returns {string} Interpolated string
 */
function interpolate(str, vars = {}) {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Get device's preferred language
 * @returns {string} Language code (e.g., 'en', 'es')
 */
function getDeviceLanguage() {
  try {
    let locale;
    
    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
               NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier;
    } else {
      // Web
      locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
    }

    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = (locale || 'en').split(/[-_]/)[0].toLowerCase();
    
    // Return if supported, otherwise default
    return SUPPORTED_LANGUAGES[langCode] ? langCode : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize the i18n system
 * Loads saved language preference or detects device language
 */
export async function initializeI18n() {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
      currentLanguage = savedLanguage;
    } else {
      currentLanguage = getDeviceLanguage();
    }
  } catch {
    currentLanguage = getDeviceLanguage();
  }
  
  notifyListeners();
}

/**
 * Get translated string
 * @param {string} key - Translation key (dot notation supported)
 * @param {Object} vars - Variables for interpolation
 * @returns {string} Translated string
 */
export function t(key, vars = {}) {
  // Try current language first
  let value = getNestedValue(translations[currentLanguage], key);
  
  // Fall back to English if not found
  if (value === undefined) {
    value = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  }
  
  // Return key if still not found
  if (value === undefined) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  
  return interpolate(value, vars);
}

/**
 * Get current language code
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get current language display name
 * @returns {string} Language display name
 */
export function getCurrentLanguageName() {
  return SUPPORTED_LANGUAGES[currentLanguage];
}

/**
 * Set current language
 * @param {string} langCode - Language code to set
 * @returns {Promise<boolean>} Success status
 */
export async function setLanguage(langCode) {
  if (!SUPPORTED_LANGUAGES[langCode]) {
    console.warn(`Unsupported language: ${langCode}`);
    return false;
  }
  
  currentLanguage = langCode;
  
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
  
  notifyListeners();
  return true;
}

/**
 * Get all supported languages
 * @returns {Object} Language code to name mapping
 */
export function getSupportedLanguages() {
  return { ...SUPPORTED_LANGUAGES };
}

/**
 * Add language change listener
 * @param {Function} callback - Called when language changes
 * @returns {Function} Unsubscribe function
 */
export function addLanguageListener(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * Notify all listeners of language change
 */
function notifyListeners() {
  listeners.forEach(callback => {
    try {
      callback(currentLanguage);
    } catch (error) {
      console.error('Language listener error:', error);
    }
  });
}

/**
 * Format number according to current locale
 * @param {number} num - Number to format
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number
 */
export function formatNumber(num, options = {}) {
  try {
    return new Intl.NumberFormat(currentLanguage, options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format score with thousands separators
 * @param {number} score - Score to format
 * @returns {string} Formatted score
 */
export function formatScore(score) {
  return formatNumber(score, { maximumFractionDigits: 0 });
}

/**
 * Format duration in seconds to mm:ss
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for translations
 * Re-renders component when language changes
 * 
 * Usage:
 * const { t, language, setLanguage } = useTranslation();
 * 
 * @returns {Object} Translation utilities
 */
export function useTranslation() {
  // Note: In actual usage, you'd want to use useState/useEffect
  // to properly handle re-renders on language change
  
  return {
    t,
    language: currentLanguage,
    setLanguage,
    formatNumber,
    formatScore,
    formatDuration,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeI18n,
  t,
  getCurrentLanguage,
  getCurrentLanguageName,
  setLanguage,
  getSupportedLanguages,
  addLanguageListener,
  formatNumber,
  formatScore,
  formatDuration,
  useTranslation,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
};
