/**
 * GameHUD - Heads-Up Display for game information
 * Displays score, stage, level, lives, shield status, and pause button
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * @typedef {Object} GameHUDProps
 * @property {number} score - Current player score
 * @property {string} currentStage - Current stage identifier (e.g., 'stage1')
 * @property {number} level - Current level number
 * @property {number} levelKills - Kills in current level
 * @property {number} levelTarget - Kills needed to advance level
 * @property {number} lives - Remaining player lives
 * @property {boolean} hasShield - Whether shield is active
 * @property {boolean} isPaused - Whether game is paused
 * @property {number} hudScale - Scale factor for HUD pulse animation
 * @property {function} onPauseToggle - Callback when pause button pressed
 * @property {function} onExit - Callback when exit button pressed
 */

/**
 * GameHUD Component
 * @param {GameHUDProps} props
 */
export default function GameHUD({
  score,
  currentStage,
  level,
  levelKills,
  levelTarget,
  lives,
  hasShield,
  isPaused,
  hudScale = 1,
  onPauseToggle,
  onExit
}) {
  const formattedScore = score.toLocaleString('en-US');
  const livesDisplay = lives > 0 ? '❤'.repeat(Math.min(lives, 10)) : '☠';
  const shieldStatus = hasShield ? 'ONLINE' : 'OFFLINE';
  const stageNumber = currentStage.replace('stage', '');

  return (
    <>
      <View style={[styles.hud, { transform: [{ scale: hudScale }] }]}>
        {/* Score */}
        <View style={styles.hudColumn}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{formattedScore}</Text>
        </View>

        {/* Stage */}
        <View style={styles.hudColumn}>
          <Text style={styles.hudText}>Stage</Text>
          <Text style={styles.stageText}>{stageNumber}</Text>
        </View>

        {/* Level Progress */}
        <View style={styles.hudColumn}>
          <Text style={styles.hudText}>Level</Text>
          <Text style={styles.levelText}>{String(level).padStart(2, '0')}</Text>
          <Text style={styles.levelProgress}>
            {Math.min(levelKills, levelTarget)}/{levelTarget}
          </Text>
        </View>

        {/* Lives & Shield */}
        <View style={styles.hudColumn}>
          <Text style={styles.hudText}>Lives</Text>
          <Text style={styles.livesText}>{livesDisplay}</Text>
          <Text style={[styles.hudText, hasShield ? styles.shieldTextOn : styles.shieldTextOff]}>
            Shield {shieldStatus}
          </Text>
        </View>

        {/* Pause Button */}
        <TouchableOpacity onPress={onPauseToggle} style={styles.pauseButton}>
          <Text style={styles.pauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>

      {/* Exit Button */}
      <View style={styles.backBtnContainer}>
        <TouchableOpacity onPress={onExit}>
          <Text style={styles.backBtn}>Exit</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hudText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600'
  },
  hudColumn: {
    alignItems: 'center'
  },
  scoreLabel: {
    color: '#38bdf8',
    fontSize: 12,
    letterSpacing: 2
  },
  scoreValue: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1
  },
  stageText: {
    color: '#a855f7',
    fontSize: 22,
    fontWeight: '800'
  },
  levelText: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: '800'
  },
  levelProgress: {
    color: '#cbd5f5',
    fontSize: 12
  },
  livesText: {
    color: '#f87171',
    fontSize: 18,
    marginVertical: 4
  },
  shieldTextOn: {
    color: '#22c55e'
  },
  shieldTextOff: {
    color: '#94a3b8'
  },
  pauseButton: {
    padding: 8
  },
  pauseText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600'
  },
  backBtnContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16
  },
  backBtn: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline'
  }
});
