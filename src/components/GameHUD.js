/** Compact, safe-area-positioned gameplay HUD. Boss health has its own strip. */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const fitted = { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7,
  maxFontSizeMultiplier: 1.4 };

export default function GameHUD({ score, currentStage, level, levelKills, levelTarget,
  lives, hasShield, isPaused, isBossEncounter = false, bossDefeated = false,
  hudScale = 1, top = 48, onLayout, onPauseToggle, onExit }) {
  const stageNumber = currentStage.replace('stage', '');
  const progress = isBossEncounter
    ? bossDefeated ? 'GUARDIAN DEFEATED' : 'BOSS FIGHT · Hit the ship'
    : `Level ${String(level).padStart(2, '0')} · ${Math.min(levelKills, levelTarget)}/${levelTarget} enemies`;

  return <>
    <View pointerEvents="box-none" onLayout={onLayout} style={[styles.hud, { top }]}>
      <View style={styles.topRow}>
        <View style={[styles.stat, styles.scoreStat]}>
          <Text {...fitted} style={styles.label}>SCORE</Text>
          <Text {...fitted} style={[styles.scoreValue, { transform: [{ scale: hudScale }] }]}>{score.toLocaleString('en-US')}</Text>
        </View>
        <View style={[styles.stat, styles.stageStat]}>
          <Text {...fitted} style={styles.label}>STAGE</Text>
          <Text {...fitted} style={styles.stageValue}>{stageNumber}</Text>
        </View>
        <View style={[styles.stat, styles.livesStat]}>
          <Text {...fitted} style={styles.label}>LIVES</Text>
          <Text {...fitted} style={styles.livesValue}>{lives > 0 ? `♥ ${lives}` : '—'}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isPaused ? 'Resume game' : 'Pause game'}
          onPress={onPauseToggle} style={styles.pauseButton}>
          <Text {...fitted} style={styles.pauseText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomRow}>
        <Text {...fitted} style={styles.progressText}>{progress}</Text>
        <Text {...fitted} style={[styles.shieldText, hasShield && styles.shieldActive]}>
          {hasShield ? 'SHIELD ACTIVE' : 'NO SHIELD'}
        </Text>
      </View>
    </View>
    <View style={styles.backBtnContainer}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Exit game" onPress={onExit}>
        <Text style={styles.backBtn}>Exit</Text>
      </TouchableOpacity>
    </View>
  </>;
}

const styles = StyleSheet.create({
  hud: { position: 'absolute', left: 12, right: 12, minHeight: 50,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.76)' },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  stat: { justifyContent: 'center', minWidth: 0, paddingRight: 3 },
  scoreStat: { flex: 1.45, alignItems: 'flex-start' },
  stageStat: { flex: 0.7, alignItems: 'center' },
  livesStat: { flex: 0.85, alignItems: 'center' },
  label: { color: '#9cc9df', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scoreValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stageValue: { color: '#b883f8', fontSize: 17, fontWeight: '800' },
  livesValue: { color: '#fb7185', fontSize: 16, fontWeight: '800' },
  pauseButton: { flex: 0.8, minWidth: 0, minHeight: 30, alignItems: 'flex-end', justifyContent: 'center' },
  pauseText: { color: '#e5e7eb', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.25)', marginTop: 2, paddingTop: 2 },
  progressText: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', flex: 1, minWidth: 0, marginRight: 8 },
  shieldText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  shieldActive: { color: '#4ade80' },
  backBtnContainer: { position: 'absolute', bottom: 30, left: 16 },
  backBtn: { color: '#9ca3af', fontSize: 14, textDecorationLine: 'underline' },
});
