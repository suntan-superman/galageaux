/** Familiar arcade bodies with restrained armor, type accents and local hit light. */
import React from 'react';
import { Group, Circle, Rect, Path, LinearGradient, vec } from '@shopify/react-native-skia';
import enemiesConfig from '../../config/enemies.json';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';

// Unit-square local geometry is reused at every configured enemy size. No bank,
// animation path or presentation position feeds back into the simulation.
const ARMOR = 'M .18 0 L .82 0 L 1 .18 L 1 .82 L .82 1 L .18 1 L 0 .82 L 0 .18 Z';
const SCOUT = 'M .5 0 L 1 .42 L .82 .85 L .5 1 L .18 .85 L 0 .42 Z';
const DIVE = 'M 0 0 L .3 .12 L .5 0 L .7 .12 L 1 0 L .92 .8 L .5 1 L .08 .8 Z';
const MATERIAL = ['#314962', PALETTE.metal, '#0a1423'];
const TOP = vec(0, 0), BOTTOM = vec(0, 1);

export default function Enemies({ enemies, ox = 0, oy = 0, hitFlashes = {} }) {
  return <>{enemies.map(enemy => {
    const size = enemy.size;
    const color = enemiesConfig[enemy.type]?.color || PALETTE.hostile;
    const path = enemy.type === 'scout' ? SCOUT : ['dive', 'kamikaze'].includes(enemy.type) ? DIVE : ARMOR;
    const flash = Math.max(0, Math.min(1, hitFlashes[enemy.id] || 0)) * EFFECTS.impact;
    return <Group key={enemy.id} transform={[{ translateX: enemy.x + ox }, { translateY: enemy.y + oy }, { scale: size }]}>
      <Path path={path}><LinearGradient start={TOP} end={BOTTOM} colors={MATERIAL} /></Path>
      <Path path={path} color={color} style="stroke" strokeWidth={1.2 / size} />
      <Rect x={0.12} y={0.22} width={0.12} height={0.45} color={color} opacity={0.72} />
      <Rect x={0.76} y={0.22} width={0.12} height={0.45} color={color} opacity={0.72} />
      {enemy.canShoot && <Path path="M .34 .36 L .5 .55 L .66 .36 M .5 .55 L .5 .8"
        color={PALETTE.hostile} style="stroke" strokeWidth={1.5 / size} />}
      <Circle cx={0.5} cy={0.3} r={0.085} color={color} />
      {enemy.type === 'tank' && <Rect x={0.28} y={0.65} width={0.44} height={0.12} color={color} opacity={0.8} />}
      {flash > 0 && <Path path={path} color={PALETTE.core} opacity={flash * 0.8} />}
    </Group>;
  })}</>;
}
