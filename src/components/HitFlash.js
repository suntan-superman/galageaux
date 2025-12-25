/**
 * HitFlash - Screen flash effect when player takes damage
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * @typedef {Object} HitFlashProps
 * @property {number} intensity - Flash intensity (0-1)
 */

export default function HitFlash({ intensity }) {
  if (intensity <= 0) return null;

  return (
    <View 
      style={[styles.flash, { opacity: intensity }]} 
      pointerEvents="none" 
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248,113,113,0.25)'
  }
});
