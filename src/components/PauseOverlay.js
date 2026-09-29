import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { PLAYER } from '../constants/game';
import { normalizeTiltSensitivity } from '../engine/inputSettings';

function ControlRow({ label, value, checked, onPress }) {
  return (
    <TouchableOpacity
      style={styles.controlRow}
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={checked === undefined ? undefined : { checked }}
    >
      <Text style={styles.controlLabel}>{label}</Text>
      <Text style={styles.controlValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

function ValueRow({ id, label, value, decreaseDisabled, increaseDisabled, onDecrease, onIncrease }) {
  return (
    <View style={styles.valueRow} testID={`pause-${id}-row`}>
      <Text style={styles.valueLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.adjustButton, decreaseDisabled && styles.adjustButtonDisabled]}
          onPress={onDecrease}
          disabled={decreaseDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          accessibilityState={{ disabled: decreaseDisabled }}
        >
          <Text style={styles.adjustButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.numericValue} numberOfLines={1} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        <TouchableOpacity
          style={[styles.adjustButton, increaseDisabled && styles.adjustButtonDisabled]}
          onPress={onIncrease}
          disabled={increaseDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          accessibilityState={{ disabled: increaseDisabled }}
        >
          <Text style={styles.adjustButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  const sensitivity = normalizeTiltSensitivity(tiltSensitivity);
  const adjustSensitivity = amount => onChangeTiltSensitivity(
    normalizeTiltSensitivity(Math.round((sensitivity + amount) * 10) / 10),
  );

  return (
    <ScrollView
      style={styles.overlay}
      contentContainerStyle={styles.overlayContent}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      accessibilityViewIsModal={true}
    >
      {/* Native automatic insets need no app-level SafeAreaProvider. Designed
          for ordinary text sizes; scrolling provides an overflow escape. */}
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">PAUSED</Text>
        <TouchableOpacity style={styles.buttonPrimary} onPress={onResume} accessibilityRole="button">
          <Text style={styles.buttonPrimaryText}>Resume</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeading} accessibilityRole="header">Gameplay</Text>
        <ControlRow label="Auto-Fire" value={autoFire ? 'On' : 'Off'} checked={Boolean(autoFire)} onPress={onToggleAutoFire} />
        <ControlRow label="Tilt Control" value={tiltControl ? 'On' : 'Off'} checked={Boolean(tiltControl)} onPress={onToggleTiltControl} />
        <ControlRow label="Fire Button" value={fireButtonPosition === 'left' ? 'Left' : 'Right'} onPress={onToggleFireButtonPosition} />
        <ValueRow
          id="tilt"
          label="Tilt Sensitivity"
          value={sensitivity.toFixed(1)}
          decreaseDisabled={sensitivity <= PLAYER.TILT_SENSITIVITY_MIN}
          increaseDisabled={sensitivity >= PLAYER.TILT_SENSITIVITY_MAX}
          onDecrease={() => adjustSensitivity(-0.1)}
          onIncrease={() => adjustSensitivity(0.1)}
        />

        <Text style={styles.sectionHeading} accessibilityRole="header">Audio</Text>
        <ControlRow label="Sound FX" value={soundsEnabled ? 'On' : 'Off'} checked={Boolean(soundsEnabled)} onPress={onToggleSounds} />
        <ControlRow label="Music" value={musicEnabled ? 'On' : 'Off'} checked={Boolean(musicEnabled)} onPress={onToggleMusic} />
        <ValueRow
          id="sound"
          label="Sound Volume"
          value={`${Math.round(soundVolume * 100)}%`}
          decreaseDisabled={soundVolume <= 0}
          increaseDisabled={soundVolume >= 1}
          onDecrease={() => onChangeSoundVolume(Math.max(0, soundVolume - 0.1))}
          onIncrease={() => onChangeSoundVolume(Math.min(1, soundVolume + 0.1))}
        />
        <ValueRow
          id="music"
          label="Music Volume"
          value={`${Math.round(musicVolume * 100)}%`}
          decreaseDisabled={musicVolume <= 0}
          increaseDisabled={musicVolume >= 1}
          onDecrease={() => onChangeMusicVolume(Math.max(0, musicVolume - 0.1))}
          onIncrease={() => onChangeMusicVolume(Math.min(1, musicVolume + 0.1))}
        />
        <TouchableOpacity style={styles.exitButton} onPress={onExit} accessibilityRole="button">
          <Text style={styles.exitButtonText}>Quit to Menu</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    zIndex: 10
  },
  overlayContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)'
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8
  },
  buttonPrimary: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  buttonPrimaryText: {
    color: '#020617',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700'
  },
  sectionHeading: {
    color: '#cbd5f5',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2
  },
  controlRow: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)'
  },
  controlLabel: {
    flex: 1,
    color: '#38bdf8',
    fontSize: 15,
    lineHeight: 20
  },
  controlValue: {
    minWidth: 48,
    flexShrink: 0,
    marginLeft: 8,
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'right'
  },
  valueRow: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 2,
    marginTop: 4
  },
  valueLabel: {
    flexBasis: 112,
    flexGrow: 1,
    flexShrink: 1,
    color: '#38bdf8',
    fontSize: 15,
    lineHeight: 20
  },
  stepper: {
    minWidth: 160,
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  numericValue: {
    minWidth: 64,
    flexShrink: 0,
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums']
  },
  adjustButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    lineHeight: 24,
    fontWeight: '700'
  },
  exitButton: {
    minWidth: 44,
    minHeight: 44,
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exitButtonText: {
    color: '#f87171',
    fontSize: 15,
    lineHeight: 20,
    textDecorationLine: 'underline'
  }
});

