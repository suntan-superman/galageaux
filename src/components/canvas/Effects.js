/**
 * Effects - Skia Canvas components for visual effects
 * Includes explosions, particles, powerups, and screen effects
 */

import React from 'react';
import { Group, Circle, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import { GAMEPLAY } from '../../constants/game';
import { PALETTE, EFFECTS } from '../../constants/visualTheme';
import { getExplosionVisual, getParticleVisual } from '../../engine/effectVisuals';

export { default as Powerups } from './Powerups';

/**
 * Screen flash effect for big explosions
 * @param {Object} props
 * @param {Object|null} props.flash - Screen flash state
 * @param {number} props.width - Screen width
 * @param {number} props.height - Screen height
 */
export function ScreenFlash({ flash, width, height }) {
  if (!flash || flash.life <= 0) return null;
  
  const progress = flash.life / flash.maxLife;
  const alpha = flash.intensity * progress;
  
  // Convert color to rgba
  const color = flash.color || '#ffffff';
  const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
  
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      color={`${color}${alphaHex}`}
    />
  );
}
/**
 * Explosion effects with shockwave
 * @param {Object} props
 * @param {Object[]} props.explosions - Array of explosion objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function Explosions({ explosions, ox, oy }) {
  return (
    <>
      {explosions.slice(-GAMEPLAY.MAX_EXPLOSIONS).map((ex, i) => {
        if (!ex || ex.life <= 0) return null;
        const visual = getExplosionVisual(ex);
        const x = ex.x + ox, y = ex.y + oy;
        const color = ex.color || PALETTE.hostile;
        
        return (
          <Group key={ex.id || `ex-${i}`}>
            {/* Local energy release; no opaque expanding disk. */}
            <Circle
              cx={x} cy={y} r={visual.energyRadius}
              opacity={visual.energyAlpha * EFFECTS.glow}
            >
              <RadialGradient c={vec(x, y)} r={visual.energyRadius} colors={[color, `${color}55`, `${color}00`]} positions={[0, 0.4, 1]} />
            </Circle>
            {/* Thin, fast-fading shockwave retains the existing lifetime/budget. */}
            <Circle
              cx={x} cy={y} r={visual.radius}
              style="stroke" strokeWidth={visual.ringWidth}
              color={color} opacity={visual.ringAlpha}
            />
            {/* Inner bright core */}
            <Circle
              cx={x} cy={y} r={visual.coreRadius}
              color={PALETTE.core} opacity={visual.coreAlpha}
            />
          </Group>
        );
      })}
    </>
  );
}

/**
 * Particle effects
 * @param {Object} props
 * @param {Object[]} props.particles - Array of particle objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function Particles({ particles, ox, oy }) {
  return (
    <>
      {particles.slice(-GAMEPLAY.MAX_PARTICLES).map((p, i) => {
        if (!p || p.life <= 0) return null;
        const visual = getParticleVisual(p);
        const x = p.x + ox, y = p.y + oy;
        const key = p.id || `p-${i}`;
        if (visual.kind === 'fragment' || visual.kind === 'spark') {
          return (
            <Group key={key} origin={vec(x, y)} transform={[{ rotate: visual.rotation }]} opacity={visual.opacity}>
              <Rect x={x - visual.width / 2} y={y - visual.height / 2} width={visual.width} height={visual.height} color={visual.color} />
              {visual.kind === 'fragment' && <Rect x={x - visual.width / 2} y={y - visual.height / 2} width={visual.width} height={0.6} color={PALETTE.core} opacity={0.5} />}
            </Group>
          );
        }
        if (visual.kind === 'ring') {
          return (
            <Group key={key} opacity={visual.opacity}>
              <Circle cx={x} cy={y} r={visual.radius} style="stroke" strokeWidth={4} color={visual.color} opacity={0.12 * EFFECTS.glow} />
              <Circle cx={x} cy={y} r={visual.radius} style="stroke" strokeWidth={1.2} color={visual.color} opacity={0.8} />
            </Group>
          );
        }
        return <Circle key={key} cx={x} cy={y} r={visual.radius} color={visual.color} opacity={visual.opacity * (visual.kind === 'energy' ? 0.72 : 1)} />;
      })}
    </>
  );
}
