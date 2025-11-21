import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Canvas, Rect, Circle } from '@shopify/react-native-skia';
import GameScreen from './GameScreen';

export default function MainMenu() {
  const { width, height } = useWindowDimensions();
  const [inGame, setInGame] = useState(false);

  if (inGame) return <GameScreen onExit={() => setInGame(false)} />;

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
        <Text style={styles.title}>GALAGA // MODERN</Text>
        <Text style={styles.subtitle}>Vertical neon space shooter</Text>
        <TouchableOpacity style={styles.button} onPress={() => setInGame(true)}>
          <Text style={styles.buttonText}>PLAY</Text>
        </TouchableOpacity>
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
    justifyContent: 'center'
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
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: '#22c55e',
    borderRadius: 999
  },
  buttonText: {
    color: '#020617',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 2
  }
});
