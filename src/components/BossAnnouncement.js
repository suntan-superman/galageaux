/** Brief, non-blocking warning driven by the boss's simulation clock. */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOSS_IDENTITY, BOSS_STATE } from '../engine/bossEncounter';

export default function BossAnnouncement({ boss, stage, top = 132 }) {
  if (!boss) return null;
  const announcing = boss.encounterState === BOSS_STATE.ANNOUNCING;
  const earlyEntry = boss.encounterState === BOSS_STATE.ENTERING && boss.stateElapsed < 0.24;
  if ((!announcing || boss.stateElapsed < 0.3) && !earlyEntry) return null;
  const identity = BOSS_IDENTITY[stage] || BOSS_IDENTITY.stage1;
  const alpha = announcing ? Math.min(1, (boss.stateElapsed - 0.3) / 0.2)
    : Math.max(0, 1 - boss.stateElapsed / 0.24);
  return <View pointerEvents="none" style={[styles.wrap, { top, opacity: alpha }]}>
    <Text style={[styles.warning, { color: identity.color }]}>WARNING · STAGE GUARDIAN</Text>
    <Text style={styles.name}>{identity.name}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 28, right: 28, alignItems: 'center' },
  warning: { fontSize: 12, fontWeight: '800', letterSpacing: 2.4, textAlign: 'center' },
  name: { color: '#edf7ff', fontSize: 19, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginTop: 4 },
});
