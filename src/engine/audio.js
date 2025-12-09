import { Audio } from 'expo-av';

// Audio manager state
const audioState = {
  initialized: false,
  soundsEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
  sounds: {},
  music: null,
  currentTrack: null
};

// Sound effect definitions
// Map to actual require statements (React Native requires static paths)
const SOUND_FILES = {
  playerShoot: require('../../assets/sounds/shoot.mp3'),
  playerShootRapid: require('../../assets/sounds/shoot_rapid.mp3'),
  playerShootSpread: require('../../assets/sounds/shoot_spread.mp3'),
  enemyHit: require('../../assets/sounds/enemy_hit.mp3'),
  enemyDestroy: require('../../assets/sounds/explosion.mp3'),
  powerupCollect: require('../../assets/sounds/powerup.mp3'),
  playerHit: require('../../assets/sounds/player_hit.mp3'),
  playerDeath: require('../../assets/sounds/player_death.mp3'),
  bossAppear: require('../../assets/sounds/boss_appear.mp3'),
  bossDeath: require('../../assets/sounds/boss_death.mp3'),
  uiClick: require('../../assets/sounds/ui_click.mp3'),
  levelUp: require('../../assets/sounds/level_up.mp3'),
  shieldActivate: require('../../assets/sounds/shield.mp3'),
  comboIncrease: require('../../assets/sounds/combo.mp3')
};

// Music track definitions
const MUSIC_FILES = {
  menu: require('../../assets/music/menu_theme.mp3'),
  gameplay: require('../../assets/music/gameplay_theme.mp3'),
  boss: require('../../assets/music/boss_theme.mp3'),
  gameOver: require('../../assets/music/gameover_theme.mp3')
};

/**
 * Initialize the audio system
 */
export async function initializeAudio() {
  if (audioState.initialized) return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });

    // Preload sound effects
    for (const [key, soundFile] of Object.entries(SOUND_FILES)) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          soundFile,
          { shouldPlay: false, volume: audioState.soundVolume }
        );
        audioState.sounds[key] = sound;
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
        // Create a dummy sound object as fallback
        audioState.sounds[key] = { 
          playAsync: async () => {},
          setVolumeAsync: async () => {},
          setPositionAsync: async () => {},
          stopAsync: async () => {},
          unloadAsync: async () => {}
        };
      }
    }

    audioState.initialized = true;
    console.log('Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    audioState.initialized = false;
  }
}

/**
 * Play a sound effect
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
 */
export async function playMusic(trackName, loop = true) {
  if (!audioState.musicEnabled || !audioState.initialized) return;
  if (audioState.currentTrack === trackName && audioState.music) return;

  try {
    // Stop current music
    if (audioState.music) {
      await audioState.music.stopAsync();
      await audioState.music.unloadAsync();
    }

    // Load and play new track
    const musicFile = MUSIC_FILES[trackName];
    if (!musicFile) {
      console.warn(`Music track not found: ${trackName}`);
      return;
    }
    
    const { sound } = await Audio.Sound.createAsync(
      musicFile,
      { shouldPlay: true, isLooping: loop, volume: audioState.musicVolume }
    );
    audioState.music = sound;
    audioState.currentTrack = trackName;
  } catch (error) {
    console.warn(`Failed to play music: ${trackName}`, error);
    // Use a fallback empty sound object
    audioState.music = {
      stopAsync: async () => {},
      pauseAsync: async () => {},
      playAsync: async () => {},
      setVolumeAsync: async () => {},
      unloadAsync: async () => {}
    };
  }
}

/**
 * Stop background music
 */
export async function stopMusic() {
  if (!audioState.music) return;

  try {
    await audioState.music.stopAsync();
    await audioState.music.unloadAsync();
    audioState.music = null;
    audioState.currentTrack = null;
  } catch (error) {
    console.warn('Failed to stop music:', error);
  }
}

/**
 * Pause background music
 */
export async function pauseMusic() {
  if (!audioState.music) return;

  try {
    await audioState.music.pauseAsync();
  } catch (error) {
    console.warn('Failed to pause music:', error);
  }
}

/**
 * Resume background music
 */
export async function resumeMusic() {
  if (!audioState.music) return;

  try {
    await audioState.music.playAsync();
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
      await audioState.music.setVolumeAsync(audioState.musicVolume);
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
  
  if (!enabled && audioState.music) {
    await pauseMusic();
  } else if (enabled && audioState.music && audioState.currentTrack) {
    await resumeMusic();
  }
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
  } catch (error) {
    console.error('Failed to cleanup audio:', error);
  }
}

// Adaptive music tempo control
let musicPlaybackRate = 1.0;

/**
 * Adjust music tempo based on game intensity (level)
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
