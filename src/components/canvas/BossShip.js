/** Phase 1 material only: original rectangular boss bounds and silhouette. */
import React from 'react';
import { Group, Circle, Rect, LinearGradient, RadialGradient, vec } from '@shopify/react-native-skia';
import BossHealthBar from '../BossHealthBar';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';

const BODY_COLORS = ['#735087', '#392944', '#1c172d'];
const GLOW_COLORS = ['#bd86d92b', '#bd86d910', '#bd86d900'];
export default function BossShip({ boss, ox = 0, oy = 0, screenWidth, hitFlash = 0, showHealthBar = true }) {
  if (!boss?.alive) return null;
  const x = boss.x + ox, y = boss.y + oy, w = boss.width, h = boss.height;
  const cx = x + w / 2, cy = y + h / 2;
  const accent = boss.hp / boss.maxHp > 0.25 ? PALETTE.boss : PALETTE.hostile;
  return <Group>
    <Circle cx={cx} cy={cy} r={w * 0.66} opacity={EFFECTS.glow}>
      <RadialGradient c={vec(cx, cy)} r={w * 0.66} colors={GLOW_COLORS} />
    </Circle>
    <Rect x={x} y={y} width={w} height={h}>
      <LinearGradient start={vec(x, y)} end={vec(x, y + h)} colors={BODY_COLORS} />
    </Rect>
    <Rect x={x + 0.75} y={y + 0.75} width={w - 1.5} height={h - 1.5} color={accent} style="stroke" strokeWidth={1.5} />
    <Rect x={x + w * 0.1} y={y + h * 0.18} width={w * 0.14} height={h * 0.64} color="#110f23" />
    <Rect x={x + w * 0.76} y={y + h * 0.18} width={w * 0.14} height={h * 0.64} color="#110f23" />
    <Rect x={x + w * 0.12} y={y + h * 0.2} width={w * 0.1} height={2} color={accent} />
    <Rect x={x + w * 0.78} y={y + h * 0.2} width={w * 0.1} height={2} color={accent} />
    <Circle cx={cx} cy={cy} r={w * 0.17} color="#171426" />
    <Circle cx={cx} cy={cy} r={w * 0.17} color={accent} style="stroke" strokeWidth={1.5} />
    <Circle cx={cx} cy={cy} r={w * 0.085} color={accent} opacity={0.8} />
    {hitFlash > 0 && <Rect x={x} y={y} width={w} height={h} color={PALETTE.core}
      opacity={Math.min(1, hitFlash) * 0.75 * EFFECTS.impact} />}
    {showHealthBar && <BossHealthBar health={boss.hp} maxHealth={boss.maxHp}
      x={screenWidth / 2 - 100} y={112} width={200} height={10} />}
  </Group>;
}
