import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Canvas, Rect, Circle } from '@shopify/react-native-skia';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/game';
import * as AudioManager from '../engine/audio';
import GameScreen from './GameScreen';
import ShowMeDemo from './ShowMeDemo';
import AchievementsScreen from './AchievementsScreen';
import SettingsScreen from './SettingsScreen';
import StatsScreen from './StatsScreen';
import AudioStatusBadge from '../components/AudioStatusBadge';

const FIRST_PLAY_CUE_KEY = 'galageaux:firstPlayCueSeen';

function MenuButton({ label, icon, width, onPress, style, textStyle }) {
  return (
    <TouchableOpacity
      style={[styles.button, { width }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon && <Text style={styles.buttonIcon} accessible={false} numberOfLines={1}>{icon}</Text>}
      <Text
        style={[styles.buttonText, textStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.9}
      >{label}</Text>
    </TouchableOpacity>
  );
}

export default function MainMenu() {
  const { width, height } = useWindowDimensions();
  const [inGame, setInGame] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showFirstPlayCue, setShowFirstPlayCue] = useState(false);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const preferencesRestored = useRef(false);
  const audioInitialization = useRef(null);
  const openedShowMe = useRef(false);
  const menuVisible = !inGame && !showDemo && !achievementsVisible && !settingsVisible && !statsVisible;
  const buttonWidth = Math.min(320, Math.max(0, width - 48));

  // Restore preferences before cold-menu playback; never save scaled track gain.
  // MainMenu stays mounted behind its child routes, so re-request music on return.
  useEffect(() => {
    if (!menuVisible) return;
    let cancelled = false;
    const initAudio = async () => {
      if (!preferencesRestored.current) {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
          if (cancelled) return;
          const settings = stored ? JSON.parse(stored) : null;
          if (settings && typeof settings === 'object') {
            if (typeof settings.soundsEnabled === 'boolean') AudioManager.setSoundsEnabled(settings.soundsEnabled);
            if (Number.isFinite(settings.soundVolume)) AudioManager.setSoundVolume(settings.soundVolume);
            if (Number.isFinite(settings.musicVolume)) await AudioManager.setMusicVolume(settings.musicVolume);
            if (cancelled) return;
            if (typeof settings.musicEnabled === 'boolean') await AudioManager.setMusicEnabled(settings.musicEnabled);
          }
        } catch (error) {
          console.warn('Failed to restore menu audio settings:', error);
        }
        if (cancelled) return;
        preferencesRestored.current = true;
      }
      // Reuse this menu's pending initialization if navigation returns quickly.
      if (!audioInitialization.current) {
        audioInitialization.current = AudioManager.initializeAudio().finally(() => { audioInitialization.current = null; });
      }
      await audioInitialization.current;
      if (!cancelled && AudioManager.getAudioSettings().musicEnabled) {
        await AudioManager.playMusic('menu');
      }
    };

    initAudio().catch(error => console.warn('Menu audio initialization failed:', error));
    return () => { cancelled = true; };
  }, [menuVisible]);

  const handlePlayClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setShowFirstPlayCue(!openedShowMe.current);
    setInGame(true);
  };

  const handleTutorialClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    openedShowMe.current = true;
    setShowFirstPlayCue(false);
    Promise.resolve().then(() => AsyncStorage.setItem(FIRST_PLAY_CUE_KEY, '1'))
      .catch(error => console.warn('Could not save Show Me control-cue state:', error));
    setShowDemo(true);
  };

  const handleAchievementsClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setAchievementsVisible(true);
  };

  const handleSettingsClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setSettingsVisible(true);
  };

  const handleStatsClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setStatsVisible(true);
  };

  if (inGame) return <GameScreen onExit={() => setInGame(false)} showFirstPlayCue={showFirstPlayCue} />;
  if (showDemo) return <ShowMeDemo onBack={() => setShowDemo(false)} onPlay={() => { setShowFirstPlayCue(false); setShowDemo(false); setInGame(true); }} />;
  if (achievementsVisible) return <AchievementsScreen onBack={() => setAchievementsVisible(false)} />;
  if (settingsVisible) return <SettingsScreen onBack={() => setSettingsVisible(false)} />;
  if (statsVisible) return <StatsScreen onBack={() => setStatsVisible(false)} />;

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Rect x={0} y={0} width={width} height={height} color="#020617" />
        {Array.from({ length: 60 }).map((_, i) => (
          <Circle
            key={i}
            cx={(i * 37) % width}
            cy={(i * 59) % height}
            r={Math.random() * 2 + 1}
            color="rgba(148,163,184,0.7)"
          />
        ))}
      </Canvas>
      <View style={styles.overlay}>
        <AudioStatusBadge style={styles.audioStatus} />
        <View style={styles.centerSection}>
          <Text style={styles.title}>GALAGEAUX</Text>
          <Text style={styles.subtitle}>Vertical neon space shooter</Text>
          <MenuButton label="PLAY" width={buttonWidth} onPress={handlePlayClick} />
        </View>
        <View style={styles.bottomSection}>
          <MenuButton label="SHOW ME HOW" width={buttonWidth} style={styles.tutorialButton} textStyle={styles.tutorialButtonText} onPress={handleTutorialClick} />
          <MenuButton label="ACHIEVEMENTS" icon="🏆" width={buttonWidth} style={styles.achievementsButton} textStyle={styles.achievementsButtonText} onPress={handleAchievementsClick} />
          <MenuButton label="SETTINGS" icon="⚙️" width={buttonWidth} style={styles.settingsButton} textStyle={styles.settingsButtonText} onPress={handleSettingsClick} />
          <MenuButton label="STATS" icon="📊" width={buttonWidth} style={styles.statsButton} textStyle={styles.statsButtonText} onPress={handleStatsClick} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40
  },
  audioStatus: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40
  },
  title: {
    color: '#e5e7eb',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 8
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 32
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  buttonIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  buttonText: {
    color: '#020617',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
    flexShrink: 1
  },
  tutorialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  tutorialButtonText: {
    color: '#38bdf8'
  },
  achievementsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fbbf24'
  },
  achievementsButtonText: {
    color: '#fbbf24'
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#a855f7'
  },
  settingsButtonText: {
    color: '#a855f7'
  },
  statsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#06b6d4'
  },
  statsButtonText: {
    color: '#06b6d4'
  },
});
