import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function ControlHintsOverlay({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>🚀 How to Play</Text>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>📍 Movement</Text>
            <Text style={styles.value}>
              • Tilt your device left/right to move (or drag on screen){'\n'}
              • Adjust sensitivity in Pause menu (⚙️)
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>💥 Firing</Text>
            <Text style={styles.value}>
              • Tap the FIRE button to shoot{'\n'}
              • Enable Auto-Fire in Pause menu for continuous shooting{'\n'}
              • Move the FIRE button to left/right side in settings
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>⭐ Power-ups</Text>
            <Text style={styles.value}>
              • Collect glowing orbs dropped by enemies{'\n'}
              • Spread Shot: Fire multiple bullets{'\n'}
              • Shield: Temporary protection{'\n'}
              • Rapid Fire: Faster shooting speed{'\n'}
              • Slow: Slows down enemies
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>🎯 Objectives</Text>
            <Text style={styles.value}>
              • Destroy enemies to earn points{'\n'}
              • Complete levels by reaching kill targets{'\n'}
              • Survive bonus shoot-out rounds{'\n'}
              • Defeat bosses for massive points
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>💚 Lives & Shield</Text>
            <Text style={styles.value}>
              • You start with 3 lives{'\n'}
              • Shield protects you from one hit{'\n'}
              • Watch the HUD for your status{'\n'}
              • Game Over when all lives are lost
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>⏸️ Pause Menu</Text>
            <Text style={styles.value}>
              • Tap Pause to access settings{'\n'}
              • Toggle Auto-Fire and Tilt Control{'\n'}
              • Adjust Tilt Sensitivity (1-10){'\n'}
              • Move Fire Button position
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={onDismiss}>
          <Text style={styles.buttonText}>Got It! Let's Play</Text>
        </TouchableOpacity>
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
    backgroundColor: 'rgba(2,6,23,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 12
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)'
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1
  },
  scroll: {
    maxHeight: 400,
    marginBottom: 16
  },
  section: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)'
  },
  label: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5
  },
  value: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    marginTop: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  buttonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1
  }
});

