import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function ControlHintsOverlay({ visible, onDismiss, onBack }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      {onBack && (
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>🚀 How to Play</Text>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>📍 Move</Text>
            <Text style={styles.value}>
              • Tilt left or right to steer.{'\n'}
              • Prefer dragging? Turn Tilt Control off in Pause, then drag the ship left or right.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>💥 Fire</Text>
            <Text style={styles.value}>
              • Tap FIRE for one shot, or hold it to keep firing.{'\n'}
              • Turn Auto-Fire on in Pause to shoot continuously while you steer.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>🎯 Score & advance</Text>
            <Text style={styles.value}>
              • Line up beneath ordinary enemies and shoot them for points.{'\n'}
              • Consecutive kills raise your combo and earn more points.{'\n'}
              • The Level 0/8-style counter tracks ordinary-enemy kills, not boss health.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>🛡️ Get a shield</Text>
            <Text style={styles.value}>
              • Defeated ordinary enemies occasionally drop a glowing shield-shaped badge. Move into it to collect it.{'\n'}
              • A shield lasts four seconds or absorbs one hit. Points do not unlock shields.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>👾 Defeat a boss</Text>
            <Text style={styles.value}>
              • The long colored bar above the boss is its health. Keep hitting it; one shot is not enough.{'\n'}
              • Dodge its orange projectiles, then aim at it again. Defeating it awards 1,000 points.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>❤️ Stay alive</Text>
            <Text style={styles.value}>
              • You start with five lives. Shield ONLINE means the next hit is blocked.{'\n'}
              • Open Pause to change controls or move the FIRE button to the other side.
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={onDismiss}
          accessibilityRole="button" accessibilityLabel="Close how to play guide">
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 15,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
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

