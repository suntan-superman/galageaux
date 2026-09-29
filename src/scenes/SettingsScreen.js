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
  Switch,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AudioManager from '../engine/audio';
import { PLAYER, STORAGE_KEYS } from '../constants/game';
import { normalizeTiltSensitivity } from '../engine/inputSettings';
import { APP_INFO, getCopyrightText } from '../../constants/appInfo';

export default function SettingsScreen({ onBack }) {
  // Audio settings
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [musicVolume, setMusicVolume] = useState(0.5);
  
  // Control settings
  const [tiltSensitivity, setTiltSensitivity] = useState(PLAYER.TILT_SENSITIVITY_DEFAULT);
  const [fireButtonPosition, setFireButtonPosition] = useState('right');
  const [failedSaves, setFailedSaves] = useState({});
  const saveFailed = Object.values(failedSaves).some(Boolean);
  const markSaveResult = (setting, failed) => {
    setFailedSaves(previous => ({ ...previous, [setting]: failed }));
  };
  
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
        setTiltSensitivity(normalizeTiltSensitivity(tiltVal));
      }

      const firePos = await AsyncStorage.getItem(STORAGE_KEYS.FIRE_BUTTON_POSITION);
      if (firePos) {
        setFireButtonPosition(firePos);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  };

  const saveAudioSettings = async (updates = {}) => {
    const settings = {
      soundsEnabled,
      musicEnabled,
      soundVolume,
      musicVolume,
      ...updates,
    };
    
    // Apply to audio manager
    AudioManager.setSoundsEnabled(settings.soundsEnabled);
    AudioManager.setMusicEnabled(settings.musicEnabled);
    AudioManager.setSoundVolume(settings.soundVolume);
    AudioManager.setMusicVolume(settings.musicVolume);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(settings));
      markSaveResult('audio', false);
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
      markSaveResult('audio', true);
    }
  };

  const handleSoundsToggle = (value) => {
    setSoundsEnabled(value);
    AudioManager.setSoundsEnabled(value);
    if (value) {
      AudioManager.playSound('uiClick', 0.5);
    }
    saveAudioSettings({ soundsEnabled: value });
  };

  const handleMusicToggle = (value) => {
    setMusicEnabled(value);
    AudioManager.setMusicEnabled(value);
    if (value) {
      AudioManager.playMusic('menu');
    } else {
      AudioManager.stopMusic();
    }
    saveAudioSettings({ musicEnabled: value });
  };

  const handleSoundVolumeChange = (value) => {
    setSoundVolume(value);
    AudioManager.setSoundVolume(value);
  };

  const handleSoundVolumeComplete = (value = soundVolume) => {
    AudioManager.playSound('uiClick', 0.5);
    saveAudioSettings({ soundVolume: value });
  };

  const handleMusicVolumeChange = (value) => {
    setMusicVolume(value);
    AudioManager.setMusicVolume(value);
  };

  const handleMusicVolumeComplete = (value = musicVolume) => {
    saveAudioSettings({ musicVolume: value });
  };

  const handleTiltSensitivityChange = async (value) => {
    const sensitivity = normalizeTiltSensitivity(value);
    setTiltSensitivity(sensitivity);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TILT_SENSITIVITY, String(sensitivity));
      markSaveResult('tilt', false);
    } catch (error) {
      console.warn('Failed to save tilt sensitivity:', error);
      markSaveResult('tilt', true);
    }
  };

  const handleFirePositionToggle = async () => {
    const newPosition = fireButtonPosition === 'right' ? 'left' : 'right';
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRE_BUTTON_POSITION, newPosition);
      setFireButtonPosition(newPosition);
      markSaveResult('fire', false);
      AudioManager.playSound('uiClick', 0.5);
    } catch (error) {
      console.warn('Failed to save fire button position:', error);
      markSaveResult('fire', true);
    }
  };

  const handleResetDefaults = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUDIO_SETTINGS,
        STORAGE_KEYS.TILT_SENSITIVITY,
        STORAGE_KEYS.FIRE_BUTTON_POSITION
      ]);
      setSoundsEnabled(true);
      setMusicEnabled(true);
      setSoundVolume(0.7);
      setMusicVolume(0.5);
      setTiltSensitivity(PLAYER.TILT_SENSITIVITY_DEFAULT);
      setFireButtonPosition('right');
      AudioManager.setSoundsEnabled(true);
      AudioManager.setMusicEnabled(true);
      AudioManager.setSoundVolume(0.7);
      AudioManager.setMusicVolume(0.5);
      AudioManager.playSound('uiClick', 0.5);
      setFailedSaves({});
    } catch (error) {
      console.warn('Failed to reset settings:', error);
      markSaveResult('reset', true);
    }
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

      {saveFailed && <Text accessibilityRole="alert" style={styles.saveError}>
        Settings could not be saved. Please try again.
      </Text>}

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
              minimumValue={PLAYER.TILT_SENSITIVITY_MIN}
              maximumValue={PLAYER.TILT_SENSITIVITY_MAX}
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
          <Text style={styles.versionText}>{APP_INFO.name} v{APP_INFO.version}</Text>
          <Text style={styles.copyrightText}>{getCopyrightText('symbol-first')}</Text>
          <View style={styles.legalRow}>
            <TouchableOpacity accessibilityRole="link" accessibilityLabel="Terms of Service"
              onPress={() => Linking.openURL('https://galageaux.com/terms')} style={styles.legalLink}>
              <Text style={styles.legalText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="link" accessibilityLabel="Privacy Policy"
              onPress={() => Linking.openURL('https://galageaux.com/privacy')} style={styles.legalLink}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
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
  saveError: { color: '#fca5a5', fontSize: 13, textAlign: 'center', paddingHorizontal: 20,
    paddingVertical: 8 },
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
  legalRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legalLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  legalText: { color: '#79d7ff', fontSize: 13, textDecorationLine: 'underline' },
  bottomSpacer: {
    height: 40,
  },
});
