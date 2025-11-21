import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function GameOverOverlay({ score, onRetry, onExit }) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>GAME OVER</Text>
      <Text style={styles.score}>Score: {score}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.buttonPrimary} onPress={onRetry}>
          <Text style={styles.buttonPrimaryText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={onExit}>
          <Text style={styles.buttonSecondaryText}>MENU</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: '#f9fafb',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12
  },
  score: {
    color: '#e5e7eb',
    fontSize: 18,
    marginBottom: 24
  },
  row: {
    flexDirection: 'row'
  },
  buttonPrimary: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    marginRight: 8
  },
  buttonPrimaryText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  buttonSecondaryText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700'
  }
});
