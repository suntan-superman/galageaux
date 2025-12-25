/**
 * useGameSettings - Custom hook for managing game settings persistence
 * Handles tilt sensitivity, fire button position, and audio settings
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AudioManager from '../engine/audio';
import { STORAGE_KEYS } from '../constants/game';

const STORAGE_KEY_TILT = STORAGE_KEYS.TILT_SENSITIVITY;
const STORAGE_KEY_FIRE_POS = STORAGE_KEYS.FIRE_BUTTON_POSITION;
const STORAGE_KEY_AUDIO = STORAGE_KEYS.AUDIO_SETTINGS;

/**
 * @typedef {Object} AudioSettings
 * @property {boolean} soundsEnabled - Whether sound effects are enabled
 * @property {boolean} musicEnabled - Whether background music is enabled
 * @property {number} soundVolume - Sound effects volume (0-1)
 * @property {number} musicVolume - Music volume (0-1)
 */

const DEFAULT_AUDIO_SETTINGS = {
  soundsEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5
};

/**
 * Custom hook for game settings management
 * @returns {Object} Settings state and handlers
 */
export default function useGameSettings() {
  const [tiltSensitivity, setTiltSensitivity] = useState(5);
  const [fireButtonPosition, setFireButtonPosition] = useState('right');
  const [audioSettings, setAudioSettings] = useState(DEFAULT_AUDIO_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedTilt, storedFirePos, storedAudio] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_TILT),
          AsyncStorage.getItem(STORAGE_KEY_FIRE_POS),
          AsyncStorage.getItem(STORAGE_KEY_AUDIO)
        ]);

        if (storedTilt) {
          const value = parseInt(storedTilt, 10);
          if (!Number.isNaN(value)) {
            setTiltSensitivity(Math.min(10, Math.max(1, value)));
          }
        }

        if (storedFirePos && (storedFirePos === 'left' || storedFirePos === 'right')) {
          setFireButtonPosition(storedFirePos);
        }

        if (storedAudio) {
          const parsed = JSON.parse(storedAudio);
          setAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, ...parsed });
          // Apply loaded audio settings
          AudioManager.setSoundsEnabled(parsed.soundsEnabled ?? true);
          AudioManager.setSoundVolume(parsed.soundVolume ?? 0.7);
          if (parsed.musicEnabled !== undefined) {
            AudioManager.setMusicEnabled(parsed.musicEnabled);
          }
          if (parsed.musicVolume !== undefined) {
            AudioManager.setMusicVolume(parsed.musicVolume);
          }
        }
      } catch (err) {
        console.warn('Failed to load settings', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save audio settings helper
  const saveAudioSettings = useCallback(async (settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_AUDIO, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save audio settings', err);
    }
  }, []);

  // Tilt sensitivity handler
  const handleTiltSensitivityChange = useCallback(async (nextValue) => {
    setTiltSensitivity(nextValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TILT, String(nextValue));
    } catch (err) {
      console.warn('Failed to save tilt sensitivity', err);
    }
  }, []);

  // Fire button position handler
  const handleFireButtonPositionChange = useCallback(async (position) => {
    setFireButtonPosition(position);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FIRE_POS, position);
    } catch (err) {
      console.warn('Failed to save fire button position', err);
    }
  }, []);

  // Sound toggle handler
  const handleToggleSounds = useCallback(async () => {
    const newValue = !audioSettings.soundsEnabled;
    const newSettings = { ...audioSettings, soundsEnabled: newValue };
    setAudioSettings(newSettings);
    AudioManager.setSoundsEnabled(newValue);
    await saveAudioSettings(newSettings);
  }, [audioSettings, saveAudioSettings]);

  // Music toggle handler
  const handleToggleMusic = useCallback(async () => {
    const newValue = !audioSettings.musicEnabled;
    const newSettings = { ...audioSettings, musicEnabled: newValue };
    setAudioSettings(newSettings);
    await AudioManager.setMusicEnabled(newValue);
    await saveAudioSettings(newSettings);
  }, [audioSettings, saveAudioSettings]);

  // Sound volume handler
  const handleChangeSoundVolume = useCallback(async (volume) => {
    const rounded = Math.round(volume * 10) / 10;
    const newSettings = { ...audioSettings, soundVolume: rounded };
    setAudioSettings(newSettings);
    AudioManager.setSoundVolume(rounded);
    await saveAudioSettings(newSettings);
  }, [audioSettings, saveAudioSettings]);

  // Music volume handler
  const handleChangeMusicVolume = useCallback(async (volume) => {
    const rounded = Math.round(volume * 10) / 10;
    const newSettings = { ...audioSettings, musicVolume: rounded };
    setAudioSettings(newSettings);
    await AudioManager.setMusicVolume(rounded);
    await saveAudioSettings(newSettings);
  }, [audioSettings, saveAudioSettings]);

  return {
    // State
    tiltSensitivity,
    fireButtonPosition,
    audioSettings,
    loaded,
    
    // Handlers
    handleTiltSensitivityChange,
    handleFireButtonPositionChange,
    handleToggleSounds,
    handleToggleMusic,
    handleChangeSoundVolume,
    handleChangeMusicVolume
  };
}
