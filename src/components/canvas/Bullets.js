import React from 'react';
import { Group, Circle, Rect, Line, LinearGradient, RadialGradient, vec } from '@shopify/react-native-skia';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';
import { getProjectileVisual } from '../../engine/shipVisuals';

const ORIGIN = vec(0, 0);
const FRIENDLY_CORE = [PALETTE.friendly, PALETTE.core, PALETTE.friendly];
const HOSTILE_CORE = [PALETTE.hostileEdge, PALETTE.hostile, PALETTE.core, PALETTE.hostile, PALETTE.hostileEdge];

/** AABB-aligned core plus a short velocity-aligned decorative streak. */
export function PlayerBullets({ bullets, ox = 0, oy = 0, rapidFire = false }) {
  return (
    <>
      {bullets.map((bullet, index) => {
        const visual = getProjectileVisual(bullet);
        const width = bullet.width ?? 4;
        const height = bullet.height ?? 14;
        return (
          <Group key={bullet.id ?? ('pb-' + index)} transform={[{ translateX: visual.center.x + ox }, { translateY: visual.center.y + oy }]}>
            <Line p1={visual.tailStart} p2={visual.tailEnd} strokeWidth={Math.max(1, width * 0.65)} strokeCap="round" opacity={(rapidFire ? 0.25 : 0.42) * EFFECTS.glow}>
              <LinearGradient start={visual.tailStart} end={visual.tailEnd} colors={[PALETTE.friendly, PALETTE.friendly + '00']} />
            </Line>
            <Circle cx={0} cy={0} r={4.5} opacity={(rapidFire ? 0.1 : 0.16) * EFFECTS.glow}>
              <RadialGradient c={ORIGIN} r={4.5} colors={[PALETTE.friendly, PALETTE.friendly + '00']} />
            </Circle>
            <Rect x={-width / 2} y={-height / 2} width={width} height={height}>
              <LinearGradient start={vec(-width / 2, 0)} end={vec(width / 2, 0)} colors={FRIENDLY_CORE} positions={[0, 0.5, 1]} />
            </Rect>
          </Group>
        );
      })}
    </>
  );
}

/** Warm defined edges; radial/aimed volleys retain their original AABB core. */
export function EnemyBullets({ bullets, ox = 0, oy = 0 }) {
  return (
    <>
      {bullets.map((bullet, index) => {
        const visual = getProjectileVisual(bullet, false);
        const width = bullet.width ?? 4;
        const height = bullet.height ?? 14;
        return (
          <Group key={bullet.id ?? ('eb-' + index)} transform={[{ translateX: visual.center.x + ox }, { translateY: visual.center.y + oy }]}>
            <Line p1={visual.tailStart} p2={visual.tailEnd} strokeWidth={1.5} strokeCap="round" opacity={0.34 * EFFECTS.glow}>
              <LinearGradient start={visual.tailStart} end={visual.tailEnd} colors={[PALETTE.hostile, PALETTE.hostile + '00']} />
            </Line>
            <Circle cx={0} cy={0} r={5} opacity={0.2 * EFFECTS.glow}>
              <RadialGradient c={ORIGIN} r={5} colors={[PALETTE.hostile, PALETTE.hostile + '00']} />
            </Circle>
            <Rect x={-width / 2} y={-height / 2} width={width} height={height}>
              <LinearGradient start={vec(-width / 2, 0)} end={vec(width / 2, 0)} colors={HOSTILE_CORE} positions={[0, 0.25, 0.5, 0.75, 1]} />
            </Rect>
          </Group>
        );
      })}
    </>
  );
}

/** The existing 100ms muzzle lifetime, with three restrained cool layers. */
export function MuzzleFlashes({ flashes, ox = 0, oy = 0 }) {
  return (
    <>
      {flashes.map((flash, index) => {
        const alpha = Math.max(0, Math.min(1, flash.life / 0.1));
        const radius = 3 + (1 - alpha) * 4;
        return (
          <Group key={flash.id ?? ('muzzle-' + index)} transform={[{ translateX: flash.x + ox }, { translateY: flash.y + oy }]}>
            <Circle cx={0} cy={0} r={8} opacity={alpha * 0.18 * EFFECTS.glow}>
              <RadialGradient c={ORIGIN} r={8} colors={[PALETTE.friendly, PALETTE.friendly + '00']} />
            </Circle>
            <Circle cx={0} cy={0} r={radius} style="stroke" strokeWidth={0.8} color={PALETTE.friendly} opacity={alpha * 0.55 * EFFECTS.glow} />
            <Circle cx={0} cy={0} r={2} color={PALETTE.core} opacity={alpha * 0.85} />
          </Group>
        );
      })}
    </>
  );
}
