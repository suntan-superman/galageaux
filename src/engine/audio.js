/**
 * audio.js - Game Audio System
 * 
 * Manages all sound effects and background music for Galageaux.
 * Uses expo-av for audio playback with graceful fallbacks.
 * 
 * Features:
 * - Sound effect pooling and preloading
 * - Prioritized loading (critical sounds first)
 * - Lazy loading for non-critical sounds
 * - Background music with looping
 * - Volume controls for sounds and music separately
 * - State subscription system for UI updates
 * 
 * @module audio
 */

import { Audio } from 'expo-av';

/**
 * @typedef {Object} AudioStatus
 * @property {boolean} initialized - Whether audio system is ready
 * @property {boolean} initializing - Whether initialization is in progress
 * @property {string|null} error - Error message if initialization failed
 * @property {boolean} soundsEnabled - Whether sound effects are enabled
 * @property {boolean} musicEnabled - Whether music is enabled
 * @property {number} loadedSounds - Number of successfully loaded sounds
 * @property {number} totalSounds - Total number of sounds to load
 * @property {string[]} failedSounds - Names of sounds that failed to load
 * @property {boolean} isHealthy - True if all sounds loaded successfully
 * @property {boolean} isPartiallyWorking - True if some sounds loaded
 * @property {number} criticalSoundsLoaded - Number of critical sounds loaded
 * @property {number} totalCriticalSounds - Total critical sounds
 */

/**
 * @typedef {'playerShoot'|'playerShootRapid'|'playerShootSpread'|'enemyHit'|'enemyDestroy'|'powerupCollect'|'playerHit'|'playerDeath'|'bossAppear'|'bossDeath'|'uiClick'|'levelUp'|'shieldActivate'|'comboIncrease'} SoundName
 */

/**
 * @typedef {'menu'|'gameplay'|'boss'|'gameOver'} MusicTrackName
 */

// Audio manager state
const audioState = {
  initialized: false,
  initializing: false,
  initError: null,
  soundsEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
  sounds: {},
  music: null,
  currentTrack: null,
  musicPaused: false,
  loadedSounds: 0,
  totalSounds: 0,
  failedSounds: [],
  listeners: new Set(),
  criticalSoundsLoaded: 0,
  totalCriticalSounds: 0,
  lazyLoadQueue: [],
  isLazyLoading: false
};
let pendingMusicPause = null;
let initializationPromise = null;
let musicOperation = Promise.resolve();
let latestMusicRequest = 0;
let desiredMusic = null;
let currentMusicLoop = null;

// Only the latest screen's music intent may own the shared native player.
function scheduleMusic(operation) {
  const request = ++latestMusicRequest;
  const task = musicOperation.then(() => operation(request));
  musicOperation = task.catch(() => {});
  return task;
}

// Track gain is playback-only: retain the user's unscaled saved preference.
export const MENU_MUSIC_MULTIPLIER = 0.25;
const musicPlaybackVolume = trackName => audioState.musicVolume * (trackName === 'menu' ? MENU_MUSIC_MULTIPLIER : 1);

// Sound effect definitions with priority
// Priority 1: Critical (needed immediately for gameplay)
// Priority 2: Important (needed during gameplay)
// Priority 3: Secondary (can be loaded after game starts)
const SOUND_FILES = {
  // Priority 1 - Critical (load first)
  playerShoot: { file: require('../../assets/sounds/shoot.mp3'), priority: 1 },
  enemyDestroy: { file: require('../../assets/sounds/explosion.mp3'), priority: 1 },
  playerHit: { file: require('../../assets/sounds/player_hit.mp3'), priority: 1 },
  
  // Priority 2 - Important (load soon)
  enemyHit: { file: require('../../assets/sounds/enemy_hit.mp3'), priority: 2 },
  powerupCollect: { file: require('../../assets/sounds/powerup.mp3'), priority: 2 },
  levelUp: { file: require('../../assets/sounds/level_up.mp3'), priority: 2 },
  
  // Priority 3 - Secondary (lazy load)
  playerShootRapid: { file: require('../../assets/sounds/shoot_rapid.mp3'), priority: 3 },
  playerShootSpread: { file: require('../../assets/sounds/shoot_spread.mp3'), priority: 3 },
  playerDeath: { file: require('../../assets/sounds/player_death.mp3'), priority: 3 },
  bossAppear: { file: require('../../assets/sounds/boss_appear.mp3'), priority: 3 },
  bossDeath: { file: require('../../assets/sounds/boss_death.mp3'), priority: 3 },
  uiClick: { file: require('../../assets/sounds/ui_click.mp3'), priority: 3 },
  shieldActivate: { file: require('../../assets/sounds/shield.mp3'), priority: 3 },
  comboIncrease: { file: require('../../assets/sounds/combo.mp3'), priority: 3 }
};

// Music track definitions
const MUSIC_FILES = {
  menu: require('../../assets/music/menu_theme.mp3'),
  gameplay: require('../../assets/music/gameplay_theme.mp3'),
  boss: require('../../assets/music/boss_theme.mp3'),
  gameOver: require('../../assets/music/gameover_theme.mp3')
};

/**
 * Subscribe to audio state changes
 * @param {function(AudioStatus): void} callback - Called when audio state changes
 * @returns {function(): void} Unsubscribe function
 */
export function subscribeToAudioState(callback) {
  audioState.listeners.add(callback);
  return () => audioState.listeners.delete(callback);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  const status = getAudioStatus();
  audioState.listeners.forEach(callback => callback(status));
}

/**
 * Get current audio system status
 * @returns {AudioStatus} Current audio status
 */
export function getAudioStatus() {
  return {
    initialized: audioState.initialized,
    initializing: audioState.initializing,
    error: audioState.initError,
    soundsEnabled: audioState.soundsEnabled,
    musicEnabled: audioState.musicEnabled,
    loadedSounds: audioState.loadedSounds,
    totalSounds: audioState.totalSounds,
    failedSounds: [...audioState.failedSounds],
    isHealthy: audioState.initialized && audioState.failedSounds.length === 0,
    isPartiallyWorking: audioState.initialized && audioState.failedSounds.length > 0 && audioState.loadedSounds > 0,
    criticalSoundsLoaded: audioState.criticalSoundsLoaded,
    totalCriticalSounds: audioState.totalCriticalSounds
  };
}

/**
 * Create a dummy sound object as fallback for failed loads
 * @returns {Object} Dummy sound object with no-op methods
 */
function createDummySound() {
  return { 
    playAsync: async () => {},
    setVolumeAsync: async () => {},
    setPositionAsync: async () => {},
    stopAsync: async () => {},
    unloadAsync: async () => {}
  };
}

/**
 * Load a single sound effect
 * @param {string} key - Sound identifier
 * @param {Object} soundDef - Sound definition with file and priority
 * @returns {Promise<boolean>} True if loaded successfully
 */
async function loadSound(key, soundDef) {
  try {
    const { sound } = await Audio.Sound.createAsync(
      soundDef.file,
      { shouldPlay: false, volume: audioState.soundVolume }
    );
    audioState.sounds[key] = sound;
    audioState.loadedSounds++;
    
    if (soundDef.priority === 1) {
      audioState.criticalSoundsLoaded++;
    }
    
    return true;
  } catch (error) {
    console.warn(`Failed to load sound: ${key}`, error);
    audioState.failedSounds.push(key);
    audioState.sounds[key] = createDummySound();
    return false;
  }
}

/**
 * Load sounds by priority level
 * @param {number} priority - Priority level to load (1, 2, or 3)
 * @returns {Promise<void>}
 */
async function loadSoundsByPriority(priority) {
  const soundsToLoad = Object.entries(SOUND_FILES)
    .filter(([_, def]) => def.priority === priority);
  
  for (const [key, soundDef] of soundsToLoad) {
    if (!audioState.sounds[key]) {
      await loadSound(key, soundDef);
      notifyListeners();
    }
  }
}

/**
 * Start lazy loading of remaining sounds (priority 3)
 * Called after critical sounds are loaded to continue loading in background
 */
async function startLazyLoading() {
  if (audioState.isLazyLoading) return;
  audioState.isLazyLoading = true;
  
  // Load priority 3 sounds in background
  await loadSoundsByPriority(3);
  
  audioState.isLazyLoading = false;
  console.log(`Lazy loading complete: ${audioState.loadedSounds}/${audioState.totalSounds} sounds loaded`);
}

/**
 * Initialize the audio system with prioritized loading
 * Loads critical sounds first, then important sounds, then lazy loads the rest.
 * Safe to call multiple times - will skip if already initialized.
 * @param {Object} options - Initialization options
 * @param {boolean} [options.eagerLoadAll=false] - If true, loads all sounds immediately
 * @returns {Promise<{success: boolean, status: AudioStatus}>} Initialization result
 */
export function initializeAudio(options = {}) {
  const { eagerLoadAll = false } = options;
  
  if (initializationPromise) return initializationPromise;
  if (audioState.initialized) return Promise.resolve({ success: true, status: getAudioStatus() });

  audioState.initializing = true;
  audioState.initError = null;
  audioState.failedSounds = [];
  audioState.totalSounds = Object.keys(SOUND_FILES).length;
  audioState.loadedSounds = 0;
  audioState.totalCriticalSounds = Object.values(SOUND_FILES)
    .filter(def => def.priority === 1).length;
  audioState.criticalSoundsLoaded = 0;

  initializationPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      // Load critical sounds before exposing initialized playback.
      await loadSoundsByPriority(1);
      console.log(`Critical sounds loaded: ${audioState.criticalSoundsLoaded}/${audioState.totalCriticalSounds}`);
      await loadSoundsByPriority(2);

      audioState.initialized = true;
      audioState.initializing = false;
      notifyListeners();

      console.log(`Audio system initialized: ${audioState.loadedSounds}/${audioState.totalSounds} sounds loaded (priority 1-2)`);

      if (eagerLoadAll) {
        await loadSoundsByPriority(3);
        console.log(`All sounds loaded: ${audioState.loadedSounds}/${audioState.totalSounds}`);
      } else {
        setTimeout(() => startLazyLoading(), 100);
      }

      return { success: true, status: getAudioStatus() };
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      audioState.initialized = false;
      audioState.initializing = false;
      audioState.initError = error.message || 'Unknown audio initialization error';
      notifyListeners();
      return { success: false, status: getAudioStatus() };
    }
  })().finally(() => { initializationPromise = null; });
  notifyListeners();
  return initializationPromise;
}

/**
 * Ensure a specific sound is loaded (for on-demand loading)
 * @param {SoundName} soundName - Name of the sound to load
 * @returns {Promise<boolean>} True if sound is available
 */
export async function ensureSoundLoaded(soundName) {
  if (audioState.sounds[soundName] && !audioState.failedSounds.includes(soundName)) {
    return true;
  }
  
  const soundDef = SOUND_FILES[soundName];
  if (!soundDef) {
    console.warn(`Unknown sound: ${soundName}`);
    return false;
  }
  
  return await loadSound(soundName, soundDef);
}

/**
 * Retry audio initialization
 */
export async function retryAudioInit() {
  if (initializationPromise) return initializationPromise;
  audioState.initialized = false;
  audioState.initializing = false;
  audioState.sounds = {};
  return await initializeAudio();
}

/**
 * Play a sound effect
 * @param {SoundName} soundName - Name of the sound to play
 * @param {number} [volumeMultiplier=1.0] - Volume multiplier (0-1)
 * @returns {Promise<void>}
 */
export async function playSound(soundName, volumeMultiplier = 1.0) {
  if (!audioState.soundsEnabled || !audioState.initialized) return;

  const sound = audioState.sounds[soundName];
  if (!sound) {
    console.warn(`Sound not found: ${soundName}`);
    return;
  }

  try {
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(audioState.soundVolume * volumeMultiplier);
    await sound.playAsync();
  } catch (error) {
    console.warn(`Failed to play sound: ${soundName}`, error);
  }
}

/**
 * Play background music
 * Stops any currently playing track before starting the new one.
 * @param {MusicTrackName} trackName - Name of the music track
 * @param {boolean} [loop=true] - Whether to loop the track
 * @returns {Promise<void>}
 */
export function playMusic(trackName, loop = true) {
  // Reject stale/unknown keys without tearing down the valid current track.
  const musicFile = MUSIC_FILES[trackName];
  if (!musicFile) {
    console.warn(`Music track not found: ${trackName}`);
    return Promise.resolve();
  }

  // Remember navigation while muted so enabling music starts the current
  // screen's track, not the last track that happened to be loaded.
  desiredMusic = { trackName, loop };
  return scheduleMusic(async request => {
    // Screen cleanup cannot await native pause before another screen reenters.
    if (pendingMusicPause) await pendingMusicPause;
    if (request !== latestMusicRequest) return;
    if (!audioState.initialized && audioState.musicEnabled) await initializeAudio();
    if (request !== latestMusicRequest || !audioState.musicEnabled || !audioState.initialized) return;
    if (audioState.currentTrack === trackName && currentMusicLoop === loop && audioState.music) {
      if (audioState.musicPaused) await resumeMusic();
      return;
    }

    try {
      const previous = audioState.music;
      audioState.music = null;
      audioState.currentTrack = null;
      currentMusicLoop = null;
      audioState.musicPaused = false;
      if (previous) {
        await previous.stopAsync();
        await previous.unloadAsync();
      }
      if (request !== latestMusicRequest || !audioState.musicEnabled) return;

      const { sound } = await Audio.Sound.createAsync(
        musicFile,
        { shouldPlay: true, isLooping: loop, volume: musicPlaybackVolume(trackName) }
      );
      if (request !== latestMusicRequest || !audioState.musicEnabled) {
        await sound.stopAsync();
        await sound.unloadAsync();
        return;
      }
      audioState.music = sound;
      audioState.currentTrack = trackName;
      currentMusicLoop = loop;
      audioState.musicPaused = false;
    } catch (error) {
      console.warn(`Failed to play music: ${trackName}`, error);
      if (request === latestMusicRequest) {
        // Keep the existing graceful no-audio fallback after native failure.
        audioState.music = createDummySound();
      }
    }
  });
}

/**
 * Stop background music
 */
export function stopMusic() {
  // A terminal stop cancels any deferred request made while music was muted.
  desiredMusic = null;
  return scheduleMusic(async () => {
    if (pendingMusicPause) await pendingMusicPause;
    const previous = audioState.music;
    audioState.music = null;
    audioState.currentTrack = null;
    currentMusicLoop = null;
    audioState.musicPaused = false;
    if (!previous) return;
    try {
      await previous.stopAsync();
      await previous.unloadAsync();
    } catch (error) {
      console.warn('Failed to stop music:', error);
    }
  });
}

/**
 * Pause background music
 */
export async function pauseMusic() {
  if (!audioState.music) return;
  if (pendingMusicPause) return pendingMusicPause;

  const music = audioState.music;
  pendingMusicPause = (async () => {
    try {
      await music.pauseAsync();
      if (audioState.music === music) audioState.musicPaused = true;
    } catch (error) {
      console.warn('Failed to pause music:', error);
    }
  })();
  try {
    await pendingMusicPause;
  } finally {
    pendingMusicPause = null;
  }
}

/**
 * Resume background music
 */
export async function resumeMusic() {
  if (!audioState.music || !audioState.musicEnabled) return;

  try {
    await audioState.music.setVolumeAsync(musicPlaybackVolume(audioState.currentTrack));
    await audioState.music.playAsync();
    audioState.musicPaused = false;
  } catch (error) {
    console.warn('Failed to resume music:', error);
  }
}

/**
 * Set sound effects volume
 */
export function setSoundVolume(volume) {
  audioState.soundVolume = Math.max(0, Math.min(1, volume));
  
  // Update all loaded sounds
  Object.values(audioState.sounds).forEach(async (sound) => {
    try {
      await sound.setVolumeAsync(audioState.soundVolume);
    } catch (error) {
      // Ignore errors
    }
  });
}

/**
 * Set music volume
 */
export async function setMusicVolume(volume) {
  audioState.musicVolume = Math.max(0, Math.min(1, volume));
  
  if (audioState.music) {
    try {
      await audioState.music.setVolumeAsync(musicPlaybackVolume(audioState.currentTrack));
    } catch (error) {
      console.warn('Failed to set music volume:', error);
    }
  }
}

/**
 * Enable/disable sound effects
 */
export function setSoundsEnabled(enabled) {
  audioState.soundsEnabled = enabled;
}

/**
 * Enable/disable music
 */
export async function setMusicEnabled(enabled) {
  audioState.musicEnabled = enabled;

  if (!enabled) {
    if (audioState.music) await pauseMusic();
    return;
  }

  // Finish any request queued while muted before inspecting the latest intent.
  // playMusic handles either resuming its loaded track or replacing a stale one.
  await musicOperation;
  if (!audioState.musicEnabled || !desiredMusic) return;
  const { trackName, loop } = desiredMusic;
  await playMusic(trackName, loop);
}

/**
 * Get current audio settings
 */
export function getAudioSettings() {
  return {
    soundsEnabled: audioState.soundsEnabled,
    musicEnabled: audioState.musicEnabled,
    soundVolume: audioState.soundVolume,
    musicVolume: audioState.musicVolume
  };
}

/**
 * Cleanup audio resources
 */
export async function cleanupAudio() {
  try {
    // Stop and unload music
    if (audioState.music) {
      await audioState.music.stopAsync();
      await audioState.music.unloadAsync();
    }

    // Unload all sounds
    for (const sound of Object.values(audioState.sounds)) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    audioState.initialized = false;
    audioState.sounds = {};
    audioState.music = null;
    audioState.currentTrack = null;
    currentMusicLoop = null;
    desiredMusic = null;
    audioState.musicPaused = false;
  } catch (error) {
    console.error('Failed to cleanup audio:', error);
  }
}

// Adaptive music tempo control
let musicPlaybackRate = 1.0;

/**
 * Adjust music tempo based on game intensity (level)
 * Tempo scales from 1.0 at level 1 to 1.3 at level 10+.
 * @param {number} level - Current game level (1-10)
 * @returns {Promise<void>}
 */
export async function setMusicTempo(level) {
  if (!audioState.music || !audioState.musicEnabled) return;

  // Gradually increase tempo: 1.0 at level 1, up to 1.3 at level 10+
  const newRate = Math.min(1.3, 1.0 + (level - 1) * 0.03);
  
  if (Math.abs(newRate - musicPlaybackRate) > 0.01) {
    musicPlaybackRate = newRate;
    try {
      await audioState.music.setRateAsync(musicPlaybackRate, true);
    } catch (error) {
      console.warn('Failed to set music tempo:', error);
    }
  }
}
