/**
 * FireButton - Touch-based fire control with auto-fire indicator
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * @typedef {Object} FireButtonProps
 * @property {'left'|'right'} position - Button position on screen
 * @property {boolean} disabled - Whether button is disabled
 * @property {boolean} autoFire - Whether auto-fire is enabled
 * @property {function} onFire - Fire callback
 * @property {boolean} visible - Whether button should be visible
 */

/**
 * FireButton Component
 * @param {FireButtonProps} props
 */
export default function FireButton({
  position = 'right',
  disabled = false,
  autoFire = false,
  onFire,
  visible = true
}) {
  if (!visible) return null;

  const autoBadgeText = autoFire ? 'AUTO ON' : 'MANUAL';

  return (
    <View style={[
      styles.container,
      position === 'left' ? styles.containerLeft : styles.containerRight
    ]}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onFire}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>FIRE</Text>
      </TouchableOpacity>
      <View style={[styles.autoChip, autoFire && styles.autoChipActive]}>
        <Text style={styles.autoChipText}>{autoBadgeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  containerLeft: {
    left: 16
  },
  containerRight: {
    right: 16
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  buttonDisabled: {
    backgroundColor: '#64748b',
    opacity: 0.5,
    shadowOpacity: 0
  },
  buttonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2
  },
  autoChip: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.75)'
  },
  autoChipActive: {
    backgroundColor: 'rgba(34,197,94,0.85)'
  },
  autoChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600'
  }
});
