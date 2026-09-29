/**
 * StageCompleteOverlay - Victory screen between stages
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * @typedef {Object} StageCompleteOverlayProps
 * @property {boolean} visible - Whether overlay should be visible
 * @property {string} currentStage - Current stage identifier (e.g., 'stage1')
 * @property {string[]} allStages - Array of all stage identifiers
 */

export default function StageCompleteOverlay({ visible, currentStage, allStages, score = 0, onRetry, onExit }) {
  if (!visible) return null;

  const currentIndex = allStages.indexOf(currentStage);
  const isLastStage = currentIndex >= allStages.length - 1;
  const nextStage = !isLastStage ? allStages[currentIndex + 1] : null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>STAGE COMPLETE!</Text>
        <Text style={styles.stage} numberOfLines={1} adjustsFontSizeToFit>{currentStage.toUpperCase()}</Text>
        {nextStage ? (
          <Text style={styles.next}>
            Get ready for {nextStage.toUpperCase()}...
          </Text>
        ) : (
          <>
            <Text style={styles.victory}>YOU WIN</Text>
            <Text style={styles.scoreLabel}>FINAL SCORE</Text>
            <Text style={styles.scoreValue} numberOfLines={1} adjustsFontSizeToFit>{score.toLocaleString('en-US')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.action}>
              <Text style={styles.next}>PLAY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={onExit} style={styles.action}>
              <Text style={styles.next}>MAIN MENU</Text>
            </TouchableOpacity>
          </>
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
    paddingHorizontal: 24,
    width: '90%',
    maxWidth: 360,
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
  },
  scoreLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '800', letterSpacing: 2, marginTop: 14 },
  scoreValue: { color: '#f8fafc', fontSize: 32, fontWeight: '900', marginTop: 4 },
  action: { padding: 12, marginTop: 8 }
});
