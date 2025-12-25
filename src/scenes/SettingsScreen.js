/**
 * SettingsScreen - Game settings and preferences
 * Provides controls for audio, controls, and display options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AudioManager from '../engine/audio';
import { STORAGE_KEYS } from '../constants/game';

export default function SettingsScreen({ onBack }) {
  // Audio settings
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [musicVolume, setMusicVolume] = useState(0.5);
  
  // Control settings
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [tiltSensitivity, setTiltSensitivity] = useState(1.5);
  const [fireButtonPosition, setFireButtonPosition] = useState('right');
  const [autoFire, setAutoFire] = useState(false);
  
  // Load saved settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load audio settings
      const audioJson = await AsyncStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
      if (audioJson) {
        const audio = JSON.parse(audioJson);
        setSoundsEnabled(audio.soundsEnabled ?? true);
        setMusicEnabled(audio.musicEnabled ?? true);
        setSoundVolume(audio.soundVolume ?? 0.7);
        setMusicVolume(audio.musicVolume ?? 0.5);
      }

      // Load control settings
      const tiltVal = await AsyncStorage.getItem(STORAGE_KEYS.TILT_SENSITIVITY);
      if (tiltVal) {
        setTiltSensitivity(parseFloat(tiltVal));
        setTiltEnabled(true);
      }

      const firePos = await AsyncStorage.getItem(STORAGE_KEYS.FIRE_BUTTON_POSITION);
      if (firePos) {
        setFireButtonPosition(firePos);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  };

  const saveAudioSettings = async () => {
    const settings = {
      soundsEnabled,
      musicEnabled,
      soundVolume,
      musicVolume
    };
    await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(settings));
    
    // Apply to audio manager
    AudioManager.setSoundsEnabled(soundsEnabled);
    AudioManager.setMusicEnabled(musicEnabled);
    AudioManager.setSoundVolume(soundVolume);
    AudioManager.setMusicVolume(musicVolume);
  };

  const handleSoundsToggle = (value) => {
    setSoundsEnabled(value);
    AudioManager.setSoundsEnabled(value);
    if (value) {
      AudioManager.playSound('uiClick', 0.5);
    }
    saveAudioSettings();
  };

  const handleMusicToggle = (value) => {
    setMusicEnabled(value);
    AudioManager.setMusicEnabled(value);
    if (value) {
      AudioManager.playMusic('menu');
    } else {
      AudioManager.stopMusic();
    }
    saveAudioSettings();
  };

  const handleSoundVolumeChange = (value) => {
    setSoundVolume(value);
    AudioManager.setSoundVolume(value);
  };

  const handleSoundVolumeComplete = () => {
    AudioManager.playSound('uiClick', 0.5);
    saveAudioSettings();
  };

  const handleMusicVolumeChange = (value) => {
    setMusicVolume(value);
    AudioManager.setMusicVolume(value);
  };

  const handleMusicVolumeComplete = () => {
    saveAudioSettings();
  };

  const handleTiltSensitivityChange = async (value) => {
    setTiltSensitivity(value);
    await AsyncStorage.setItem(STORAGE_KEYS.TILT_SENSITIVITY, String(value));
  };

  const handleFirePositionToggle = async () => {
    const newPosition = fireButtonPosition === 'right' ? 'left' : 'right';
    setFireButtonPosition(newPosition);
    await AsyncStorage.setItem(STORAGE_KEYS.FIRE_BUTTON_POSITION, newPosition);
    AudioManager.playSound('uiClick', 0.5);
  };

  const handleResetDefaults = async () => {
    // Reset to defaults
    setSoundsEnabled(true);
    setMusicEnabled(true);
    setSoundVolume(0.7);
    setMusicVolume(0.5);
    setTiltSensitivity(1.5);
    setFireButtonPosition('right');
    setAutoFire(false);
    
    // Save defaults
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUDIO_SETTINGS,
      STORAGE_KEYS.TILT_SENSITIVITY,
      STORAGE_KEYS.FIRE_BUTTON_POSITION
    ]);
    
    // Apply to audio
    AudioManager.setSoundsEnabled(true);
    AudioManager.setMusicEnabled(true);
    AudioManager.setSoundVolume(0.7);
    AudioManager.setMusicVolume(0.5);
    AudioManager.playSound('uiClick', 0.5);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            AudioManager.playSound('uiClick', 0.5);
            if (onBack) onBack();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Audio</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingHint}>Explosions, shots, power-ups</Text>
            </View>
            <Switch
              value={soundsEnabled}
              onValueChange={handleSoundsToggle}
              trackColor={{ false: '#334155', true: '#22c55e' }}
              thumbColor={soundsEnabled ? '#fff' : '#94a3b8'}
            />
          </View>

          {soundsEnabled && (
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Volume</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={soundVolume}
                onValueChange={handleSoundVolumeChange}
                onSlidingComplete={handleSoundVolumeComplete}
                minimumTrackTintColor="#22c55e"
                maximumTrackTintColor="#334155"
                thumbTintColor="#fff"
              />
              <Text style={styles.sliderValue}>{Math.round(soundVolume * 100)}%</Text>
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Music</Text>
              <Text style={styles.settingHint}>Background soundtrack</Text>
            </View>
            <Switch
              value={musicEnabled}
              onValueChange={handleMusicToggle}
              trackColor={{ false: '#334155', true: '#22c55e' }}
              thumbColor={musicEnabled ? '#fff' : '#94a3b8'}
            />
          </View>

          {musicEnabled && (
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Volume</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={musicVolume}
                onValueChange={handleMusicVolumeChange}
                onSlidingComplete={handleMusicVolumeComplete}
                minimumTrackTintColor="#38bdf8"
                maximumTrackTintColor="#334155"
                thumbTintColor="#fff"
              />
              <Text style={styles.sliderValue}>{Math.round(musicVolume * 100)}%</Text>
            </View>
          )}
        </View>

        {/* Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Controls</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Fire Button Position</Text>
              <Text style={styles.settingHint}>Which side of the screen</Text>
            </View>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={handleFirePositionToggle}
            >
              <Text style={styles.toggleButtonText}>
                {fireButtonPosition === 'right' ? 'RIGHT' : 'LEFT'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Tilt Sensitivity</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={3}
              value={tiltSensitivity}
              onValueChange={handleTiltSensitivityChange}
              minimumTrackTintColor="#fbbf24"
              maximumTrackTintColor="#334155"
              thumbTintColor="#fff"
            />
            <Text style={styles.sliderValue}>{tiltSensitivity.toFixed(1)}x</Text>
          </View>
        </View>

        {/* Reset Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={handleResetDefaults}
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Galageaux v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 Galageaux</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  spacer: {
    width: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  settingHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sliderLabel: {
    color: '#94a3b8',
    fontSize: 14,
    width: 100,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  toggleButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  toggleButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  resetButtonText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '700',
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    color: '#64748b',
    fontSize: 14,
  },
  copyrightText: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
