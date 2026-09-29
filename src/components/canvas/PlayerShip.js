import React from 'react';
import { Group, Circle, Path, Rect, LinearGradient, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';
import { MAX_PLAYER_BANK, getThrusterVisuals } from '../../engine/shipVisuals';

// Parsed once in a 40x22 local coordinate system, never transformed/mutated.
// Preserve the interceptor silhouette; only drawing groups move or bank it.
const HULL = Skia.Path.MakeFromSVGString('M0 -11 L-6 -5.5 L-18 2.2 L-10 7.7 L-6 11 L6 11 L10 7.7 L18 2.2 L6 -5.5 Z');
const WINGS = Skia.Path.MakeFromSVGString('M-18 2.2 L-20 1.1 L-16.2 4.4 Z M18 2.2 L20 1.1 L16.2 4.4 Z');
const PANELS = Skia.Path.MakeFromSVGString('M-5 -2.2 L-5 8.8 M5 -2.2 L5 8.8 M-14.4 0 L-19.2 .44 L-13.5 3.3 M14.4 0 L19.2 .44 L13.5 3.3');
const CANOPY = Skia.Path.MakeFromSVGString('M0 -8 L-3 -3 L0 .5 L3 -3 Z');
const FLAME = Skia.Path.MakeFromSVGString('M-.5 0 Q-.68 .35 0 1 Q.68 .35 .5 0 Z');
const ORIGIN = vec(0, 0);
const FLAME_END = vec(0, 1);
const HULL_TOP = vec(-5, -11);
const HULL_BOTTOM = vec(8, 11);
const HULL_COLORS = [PALETTE.core, PALETTE.player, PALETTE.playerDeep, PALETTE.metal];
const FLAME_COLORS = [PALETTE.core, PALETTE.player, PALETTE.player + '00'];
const SOFT_FLAME_COLORS = [PALETTE.player, PALETTE.playerDeep + '00'];

/** Presentation-only banking/thrust. Player coordinates remain authoritative. */
export default function PlayerShip({
  player, ox = 0, oy = 0, bank = 0, velocityX = 0, time = 0,
  inBonusRound = false, hitFlash = 0
}) {
  const centerX = player.x + player.width / 2 + ox;
  const centerY = player.y + player.height / 2 + oy;
  const rotation = Number.isFinite(bank) ? Math.max(-MAX_PLAYER_BANK, Math.min(MAX_PLAYER_BANK, bank)) : 0;
  const flame = getThrusterVisuals(velocityX, time, inBonusRound);
  const shieldRadius = player.width / 2 + 6;
  const pulse = 0.78 + Math.sin(time * 2.4) * 0.08;
  const flash = Math.max(0, Math.min(1, hitFlash));

  return (
    <Group transform={[{ translateX: centerX }, { translateY: centerY }]}>
      <Circle cx={0} cy={0} r={player.width * 0.62} opacity={(inBonusRound ? 0.15 : 0.09) * EFFECTS.glow}>
        <RadialGradient c={ORIGIN} r={player.width * 0.62} colors={[PALETTE.player, PALETTE.player + '00']} />
      </Circle>
      <Group transform={[{ rotate: rotation }, { scaleX: player.width / 40 }, { scaleY: player.height / 22 }]}>
        {/* A short continuous tapered tail, not a particle emitter/history. */}
        <Group transform={[{ translateY: 11 }, { skewX: Math.atan2(flame.bias, flame.length) }]}>
          <Group transform={[{ translateY: flame.length * 0.75 }, { scaleX: flame.width * 0.55 }, { scaleY: flame.trailLength + flame.length * 0.25 }]}>
            <Path path={FLAME} opacity={flame.intensity * 0.18}>
              <LinearGradient start={ORIGIN} end={FLAME_END} colors={SOFT_FLAME_COLORS} />
            </Path>
          </Group>
          <Group transform={[{ scaleX: flame.width * 1.45 }, { scaleY: flame.length }]}>
            <Path path={FLAME} opacity={flame.intensity * 0.24}>
              <LinearGradient start={ORIGIN} end={FLAME_END} colors={SOFT_FLAME_COLORS} />
            </Path>
          </Group>
          <Group transform={[{ scaleX: flame.width }, { scaleY: flame.length * 0.78 }]}>
            <Path path={FLAME} opacity={0.55 + flame.intensity * 0.25}>
              <LinearGradient start={ORIGIN} end={FLAME_END} colors={FLAME_COLORS} positions={[0, 0.25, 1]} />
            </Path>
          </Group>
          <Circle cx={0} cy={0.8} r={2.1} color={PALETTE.core} opacity={0.8} />
        </Group>
        {[-12, 12].map(x => (
          <Group key={x} transform={[{ translateX: x }, { translateY: 5 }, { scaleX: 3 }, { scaleY: flame.length * 0.4 }]}>
            <Path path={FLAME} opacity={flame.intensity * 0.38}>
              <LinearGradient start={ORIGIN} end={FLAME_END} colors={FLAME_COLORS} />
            </Path>
          </Group>
        ))}

        <Path path={WINGS} color={PALETTE.playerDeep} />
        <Path path={HULL}>
          <LinearGradient start={HULL_TOP} end={HULL_BOTTOM} colors={HULL_COLORS} positions={[0, 0.28, 0.72, 1]} />
        </Path>
        <Path path={HULL} style="stroke" strokeWidth={0.7} color={PALETTE.player} opacity={0.8} />
        <Path path={PANELS} style="stroke" strokeWidth={0.7} color={PALETTE.core} opacity={0.48} />
        <Path path={CANOPY} color={PALETTE.metal} />
        <Path path={CANOPY} style="stroke" strokeWidth={0.7} color={PALETTE.core} opacity={0.7} />
        <Circle cx={-0.7} cy={-5.5} r={0.8} color={PALETTE.core} />
        <Circle cx={-18} cy={1.1} r={1.7} color={PALETTE.core} />
        <Circle cx={18} cy={1.1} r={1.7} color={PALETTE.core} />
        <Rect x={-7.2} y={9.2} width={3.2} height={1.8} color={PALETTE.metal} />
        <Rect x={4} y={9.2} width={3.2} height={1.8} color={PALETTE.metal} />
        {flash > 0 && <Path path={HULL} color={PALETTE.core} opacity={flash * 0.85 * EFFECTS.impact} />}
      </Group>

      {/* Boundaries remain thin and transparent, independent of hull banking. */}
      {player.shield && (
        <Group>
          <Circle cx={0} cy={0} r={shieldRadius + 3} opacity={0.12 * EFFECTS.glow}>
            <RadialGradient c={ORIGIN} r={shieldRadius + 3} colors={[PALETTE.shield + '00', PALETTE.shield + '00', PALETTE.shield]} positions={[0, 0.8, 1]} />
          </Circle>
          <Circle cx={0} cy={0} r={shieldRadius} color={PALETTE.shield} style="stroke" strokeWidth={1.1} opacity={pulse} />
        </Group>
      )}
      {inBonusRound && (
        <Circle cx={0} cy={0} r={shieldRadius + 4} color={PALETTE.bonus} style="stroke" strokeWidth={0.9} opacity={0.38 * EFFECTS.glow} />
      )}
    </Group>
  );
}
