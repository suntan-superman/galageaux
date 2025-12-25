/**
 * StageCompleteOverlay - Victory screen between stages
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * @typedef {Object} StageCompleteOverlayProps
 * @property {boolean} visible - Whether overlay should be visible
 * @property {string} currentStage - Current stage identifier (e.g., 'stage1')
 * @property {string[]} allStages - Array of all stage identifiers
 */

export default function StageCompleteOverlay({ visible, currentStage, allStages }) {
  if (!visible) return null;

  const currentIndex = allStages.indexOf(currentStage);
  const isLastStage = currentIndex >= allStages.length - 1;
  const nextStage = !isLastStage ? allStages[currentIndex + 1] : null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>STAGE COMPLETE!</Text>
        <Text style={styles.stage}>{currentStage.toUpperCase()}</Text>
        {nextStage ? (
          <Text style={styles.next}>
            Get ready for {nextStage.toUpperCase()}...
          </Text>
        ) : (
          <Text style={styles.victory}>🎉 YOU WIN! 🎉</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 60,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  title: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 16,
    textShadowColor: 'rgba(34, 197, 94, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  stage: {
    color: '#38bdf8',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 20
  },
  next: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic'
  },
  victory: {
    color: '#fbbf24',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2
  }
});
