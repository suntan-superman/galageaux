/**
 * Effects - Skia Canvas components for visual effects
 * Includes explosions, particles, powerups, and screen effects
 */

import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { getPowerupColor } from '../../engine/powerups';

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
      {explosions.map((ex, i) => {
        if (!ex || ex.life <= 0) return null;
        const progress = 1 - (ex.life / ex.maxLife);
        const alpha = 0.85 * (1 - progress);
        const outerAlpha = 0.5 * (1 - progress);
        
        // Parse color or use default
        const explosionColor = ex.color || '#fbbf24';
        
        return (
          <Group key={`ex-${i}`}>
            {/* Outer shockwave */}
            <Circle
              cx={ex.x + ox}
              cy={ex.y + oy}
              r={ex.radius * 1.5}
              color={`rgba(248,250,252,${outerAlpha * 0.3})`}
            />
            {/* Main explosion with color */}
            <Circle
              cx={ex.x + ox}
              cy={ex.y + oy}
              r={ex.radius}
              color={`${explosionColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`}
            />
            {/* Inner bright core */}
            <Circle
              cx={ex.x + ox}
              cy={ex.y + oy}
              r={ex.radius * 0.5}
              color={`rgba(248,250,252,${alpha})`}
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
      {particles.map((p, i) => (
        <Circle 
          key={`p-${i}`} 
          cx={p.x + ox} 
          cy={p.y + oy} 
          r={p.radius} 
          color={p.color || "rgba(248,250,252,0.8)"} 
        />
      ))}
    </>
  );
}

/**
 * Powerup items
 * @param {Object} props
 * @param {Object[]} props.powerups - Array of powerup objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function Powerups({ powerups, ox, oy }) {
  return (
    <>
      {powerups.map((p, i) => {
        const px = p.x + p.size / 2 + ox;
        const py = p.y + p.size / 2 + oy;
        return (
          <Group key={`pw-${i}`}>
            <Circle
              cx={px}
              cy={py}
              r={p.size / 2 + 2}
              color="rgba(30,41,59,0.5)"
            />
            <Circle
              cx={px}
              cy={py}
              r={p.size / 2}
              color={p.kind === 'shield' ? '#a855f7' : p.kind === 'slow' ? '#f97316' : getPowerupColor(p.kind)}
            />
          </Group>
        );
      })}
    </>
  );
}
