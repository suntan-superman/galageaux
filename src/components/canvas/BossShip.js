/** Three cached procedural guardians drawn inside the unchanged 80x60 AABB. */
import React from 'react';
import { Group, Circle, Rect, Path, LinearGradient, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import BossHealthBar from '../BossHealthBar';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';
import { BOSS_IDENTITY, BOSS_STATE } from '../../engine/bossEncounter';

const ART = {
  stage1: {
    hull: 'M 4 18 L 17 11 L 25 6 L 31 3 L 49 3 L 55 6 L 63 11 L 76 18 L 78 33 L 65 39 L 59 54 L 21 54 L 15 39 L 2 33 Z',
    panel: 'M 11 21 L 27 12 L 32 17 L 25 37 L 9 33 Z M 69 21 L 53 12 L 48 17 L 55 37 L 71 33 Z',
    spine: 'M 32 5 L 48 5 L 53 17 L 48 43 L 32 43 L 27 17 Z',
    armor: ['#426684', '#192f46', '#0b1728'], core: '#bff6ff', emitterX: [16, 64],
  },
  stage2: {
    hull: 'M 40 2 L 51 10 L 68 7 L 79 22 L 72 34 L 59 39 L 54 54 L 26 54 L 21 39 L 8 34 L 1 22 L 12 7 L 29 10 Z',
    panel: 'M 8 22 L 25 12 L 32 20 L 22 35 L 10 30 Z M 72 22 L 55 12 L 48 20 L 58 35 L 70 30 Z',
    spine: 'M 40 5 L 50 18 L 47 43 L 33 43 L 30 18 Z',
    armor: ['#644568', '#302344', '#120f25'], core: '#f4d5ff', emitterX: [14, 66],
  },
  stage3: {
    hull: 'M 4 11 L 16 4 L 64 4 L 76 11 L 79 31 L 69 48 L 57 49 L 53 58 L 27 58 L 23 49 L 11 48 L 1 31 Z',
    panel: 'M 9 14 L 25 10 L 29 22 L 24 43 L 10 39 Z M 71 14 L 55 10 L 51 22 L 56 43 L 70 39 Z',
    spine: 'M 26 7 L 54 7 L 58 23 L 52 49 L 28 49 L 22 23 Z',
    armor: ['#744d48', '#39272d', '#150f1a'], core: '#fff1d5', emitterX: [17, 63],
  },
};
for (const art of Object.values(ART)) {
  art.hull = Skia.Path.MakeFromSVGString(art.hull);
  art.panel = Skia.Path.MakeFromSVGString(art.panel);
  art.spine = Skia.Path.MakeFromSVGString(art.spine);
}
const clamp01 = value => Math.max(0, Math.min(1, value));

export default function BossShip({ boss, stage = 'stage1', ox = 0, oy = 0, screenWidth, hitFlash = 0, showHealthBar = true }) {
  if (!boss || (!boss.alive && boss.encounterState !== BOSS_STATE.DYING) || boss.encounterState === BOSS_STATE.ANNOUNCING) return null;
  const art = ART[stage] || ART.stage1, identity = BOSS_IDENTITY[stage] || BOSS_IDENTITY.stage1;
  const dying = boss.encounterState === BOSS_STATE.DYING;
  if (dying && boss.deathElapsed > 0.9) return null;
  const x = boss.x + ox, y = boss.y + oy;
  const charge = boss.encounterState === BOSS_STATE.TELEGRAPHING ? clamp01(boss.telegraph || 0) : 0;
  const phasePulse = boss.encounterState === BOSS_STATE.PHASE_TRANSITION
    ? Math.sin(Math.PI * clamp01((boss.stateElapsed || 0) / 0.9)) : 0;
  const deathPulse = dying ? Math.max(0, 1 - (boss.deathElapsed || 0) / 0.9) : 0;
  const opacity = dying ? clamp01((0.9 - boss.deathElapsed) / 0.38) : 1;
  const accent = boss.hp / boss.maxHp <= 0.25 && !dying ? PALETTE.hostile
    : identity.phaseColors[Math.min(boss.phaseIndex || 0, identity.phaseColors.length - 1)];
  const core = stage === 'stage3' && boss.phaseIndex >= 2 ? PALETTE.core : art.core;
  const emitterCharge = ['spread', 'aimed', 'burst'].includes(boss.attackFamily) ? charge : charge * 0.55;
  const coreCharge = ['radial', 'spiral'].includes(boss.attackFamily) ? charge : charge * 0.55;

  return <Group>
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={opacity}>
      <Circle cx={40} cy={28} r={42 + charge * 4} opacity={(0.28 + phasePulse * 0.18 + deathPulse * 0.15) * EFFECTS.glow}>
        <RadialGradient c={vec(40, 28)} r={46} colors={[identity.color + '66', identity.color + '00']} />
      </Circle>
      <Path path={art.hull}><LinearGradient start={vec(40, 2)} end={vec(40, 58)} colors={art.armor} /></Path>
      <Path path={art.hull} color={accent} style="stroke" strokeWidth={1.4 + phasePulse * 0.55} />
      <Path path={art.panel} color="#0a1321" opacity={0.83} />
      <Path path={art.panel} color={accent} style="stroke" strokeWidth={0.8} opacity={0.75} />
      <Path path={art.spine} color={art.armor[1]} />
      <Path path={art.spine} color={accent} style="stroke" strokeWidth={0.8} opacity={0.7} />
      {art.emitterX.map((emitterX, index) => <Group key={index}>
        <Rect x={emitterX - 5} y={33} width={10} height={7} color="#0b1425" />
        <Circle cx={emitterX} cy={38} r={2.8 + emitterCharge * 1.5} color={accent} opacity={0.6 + emitterCharge * 0.4} />
      </Group>)}
      <Circle cx={40} cy={27} r={11.5} color="#0b1425" />
      <Circle cx={40} cy={27} r={10.5} color={accent} style="stroke" strokeWidth={1.4} />
      <Circle cx={40} cy={27} r={5.8 + coreCharge * 2 + phasePulse * 1.4} color={core}
        opacity={0.78 + 0.22 * Math.max(coreCharge, phasePulse, deathPulse)} />
      <Rect x={27} y={50} width={8} height={3} color={accent} opacity={0.55} />
      <Rect x={45} y={50} width={8} height={3} color={accent} opacity={0.55} />
      {hitFlash > 0 && <Path path={art.hull} color={PALETTE.core} opacity={Math.min(1, hitFlash) * 0.5 * EFFECTS.impact} />}
    </Group>
    {showHealthBar && boss.alive && boss.encounterState !== BOSS_STATE.ENTERING &&
      <BossHealthBar health={boss.hp} maxHealth={boss.maxHp} x={screenWidth / 2 - 100} y={136}
        width={200} height={10} accent={accent} />}
  </Group>;
}
