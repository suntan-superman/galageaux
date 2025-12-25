/**
 * BonusBanner - Bonus round announcement with countdown timer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * @typedef {Object} BonusBannerProps
 * @property {boolean} visible - Whether banner should be visible
 * @property {number} timeLeft - Remaining time in seconds
 */

export default function BonusBanner({ visible, timeLeft }) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BONUS SHOOT-OUT</Text>
      <Text style={styles.timer}>{timeLeft.toFixed(1)}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  title: {
    color: '#fb923c',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8
  },
  timer: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4
  }
});
