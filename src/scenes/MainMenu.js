import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Canvas, Rect, Circle } from '@shopify/react-native-skia';
import * as AudioManager from '../engine/audio';
import GameScreen from './GameScreen';
import AuthScreen from './AuthScreen';

export default function MainMenu() {
  const { width, height } = useWindowDimensions();
  const [inGame, setInGame] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Initialize audio and play menu music
  useEffect(() => {
    let mounted = true;
    
    const initAudio = async () => {
      await AudioManager.initializeAudio();
      if (mounted) {
        await AudioManager.playMusic('menu');
      }
    };
    
    initAudio();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handlePlayClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setShowTutorial(false);
    setInGame(true);
  };

  const handleTutorialClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setShowTutorial(true);
    setInGame(true);
  };

  const handleAccountClick = () => {
    AudioManager.playSound('uiClick', 0.6);
    setAuthVisible(true);
  };

  if (inGame) return <GameScreen onExit={() => setInGame(false)} showTutorial={showTutorial} />;
  if (authVisible) return <AuthScreen onClose={() => setAuthVisible(false)} />;

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
        <View style={styles.centerSection}>
          <Text style={styles.title}>GALAGEAUX</Text>
          <Text style={styles.subtitle}>Vertical neon space shooter</Text>
          <TouchableOpacity style={styles.button} onPress={handlePlayClick}>
            <Text style={styles.buttonText}>PLAY</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSection}>
          <TouchableOpacity style={[styles.button, styles.tutorialButton]} onPress={handleTutorialClick}>
            <Text style={[styles.buttonText, styles.tutorialButtonText]}>SHOW ME HOW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleAccountClick}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>ACCOUNT</Text>
          </TouchableOpacity>
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
    width: 200,
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#020617',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center'
  },
  tutorialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  tutorialButtonText: {
    color: '#38bdf8'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  secondaryButtonText: {
    color: '#e5e7eb'
  }
});
