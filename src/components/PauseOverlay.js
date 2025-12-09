import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

export default function PauseOverlay({
  visible,
  onResume,
  onExit,
  autoFire,
  onToggleAutoFire,
  tiltControl,
  onToggleTiltControl,
  tiltSensitivity,
  onChangeTiltSensitivity,
  fireButtonPosition,
  onToggleFireButtonPosition,
  soundsEnabled,
  musicEnabled,
  soundVolume,
  musicVolume,
  onToggleSounds,
  onToggleMusic,
  onChangeSoundVolume,
  onChangeMusicVolume
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>Paused</Text>
        <Text style={styles.subtitle}>Take a breather, pilot.</Text>

        <TouchableOpacity style={styles.buttonPrimary} onPress={onResume}>
          <Text style={styles.buttonPrimaryText}>Resume</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={onToggleAutoFire}>
          <Text style={styles.buttonSecondaryText}>
            Auto-Fire: {autoFire ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={onToggleTiltControl}>
          <Text style={styles.buttonSecondaryText}>
            Tilt Control: {tiltControl ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={onToggleFireButtonPosition}>
          <Text style={styles.buttonSecondaryText}>
            Fire Button: {fireButtonPosition === 'left' ? 'Left' : 'Right'}
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tilt Sensitivity</Text>
          <View style={styles.sensitivityRow}>
            <TouchableOpacity
              style={[styles.adjustButton, tiltSensitivity <= 1 && styles.adjustButtonDisabled]}
              onPress={() => onChangeTiltSensitivity(Math.max(1, tiltSensitivity - 1))}
              disabled={tiltSensitivity <= 1}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.sensitivityValue}>{tiltSensitivity}</Text>
            <TouchableOpacity
              style={[styles.adjustButton, tiltSensitivity >= 10 && styles.adjustButtonDisabled]}
              onPress={() => onChangeTiltSensitivity(Math.min(10, tiltSensitivity + 1))}
              disabled={tiltSensitivity >= 10}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.buttonSecondary} onPress={onToggleSounds}>
          <Text style={styles.buttonSecondaryText}>
            Sound FX: {soundsEnabled ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={onToggleMusic}>
          <Text style={styles.buttonSecondaryText}>
            Music: {musicEnabled ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sound Volume</Text>
          <View style={styles.sensitivityRow}>
            <TouchableOpacity
              style={[styles.adjustButton, soundVolume <= 0 && styles.adjustButtonDisabled]}
              onPress={() => onChangeSoundVolume(Math.max(0, soundVolume - 0.1))}
              disabled={soundVolume <= 0}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.sensitivityValue}>{Math.round(soundVolume * 100)}%</Text>
            <TouchableOpacity
              style={[styles.adjustButton, soundVolume >= 1 && styles.adjustButtonDisabled]}
              onPress={() => onChangeSoundVolume(Math.min(1, soundVolume + 0.1))}
              disabled={soundVolume >= 1}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Music Volume</Text>
          <View style={styles.sensitivityRow}>
            <TouchableOpacity
              style={[styles.adjustButton, musicVolume <= 0 && styles.adjustButtonDisabled]}
              onPress={() => onChangeMusicVolume(Math.max(0, musicVolume - 0.1))}
              disabled={musicVolume <= 0}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.sensitivityValue}>{Math.round(musicVolume * 100)}%</Text>
            <TouchableOpacity
              style={[styles.adjustButton, musicVolume >= 1 && styles.adjustButtonDisabled]}
              onPress={() => onChangeMusicVolume(Math.min(1, musicVolume + 0.1))}
              disabled={musicVolume >= 1}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Quit to Menu</Text>
        </TouchableOpacity>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://galageaux.com/terms')}>
            <Text style={styles.legalLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://galageaux.com/privacy')}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: 'rgba(2,6,23,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center'
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4
  },
  subtitle: {
    color: '#cbd5f5',
    fontSize: 14,
    marginBottom: 20
  },
  buttonPrimary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    marginBottom: 12
  },
  buttonPrimaryText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
    marginBottom: 12
  },
  buttonSecondaryText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600'
  },
  section: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center'
  },
  sectionLabel: {
    color: '#38bdf8',
    fontSize: 14,
    marginBottom: 6
  },
  sensitivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  sensitivityValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    width: 28,
    textAlign: 'center'
  },
  adjustButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  adjustButtonDisabled: {
    opacity: 0.4
  },
  adjustButtonText: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '700'
  },
  exitButton: {
    marginTop: 8
  },
  exitButtonText: {
    color: '#f87171',
    fontSize: 14,
    textDecorationLine: 'underline'
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8
  },
  legalLinkText: {
    color: '#38bdf8',
    fontSize: 12,
    textDecorationLine: 'underline'
  },
  legalLinkSeparator: {
    color: 'rgba(148,163,184,0.5)',
    fontSize: 12
  }
});

