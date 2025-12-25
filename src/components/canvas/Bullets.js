/**
 * Bullets - Skia Canvas components for bullet rendering
 * Includes player bullets and enemy bullets with trail effects
 */

import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';

/**
 * Player bullet with glowing trail effect
 * @param {Object} props
 * @param {Object[]} props.bullets - Array of bullet objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function PlayerBullets({ bullets, ox, oy }) {
  return (
    <>
      {bullets.map((b, i) => {
        const bulletCenterX = b.x + b.width / 2 + ox;
        const bulletCenterY = b.y + b.height / 2 + oy;
        return (
          <Group key={`pb-${i}`}>
            {/* Extended bullet trail */}
            <Circle cx={bulletCenterX} cy={bulletCenterY + 6} r={2.5} color="rgba(56,189,248,0.5)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY + 10} r={2} color="rgba(56,189,248,0.35)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY + 14} r={1.5} color="rgba(56,189,248,0.2)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY + 18} r={1} color="rgba(56,189,248,0.1)" />
            {/* Outer glow */}
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={7} color="rgba(139,92,246,0.3)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={5} color="rgba(56,189,248,0.4)" />
            {/* Main bullet body */}
            <Rect x={b.x + ox} y={b.y + oy} width={b.width} height={b.height} color="#f8fafc" />
            {/* Energy core */}
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={3} color="rgba(56,189,248,0.95)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={1.5} color="rgba(255,255,255,0.9)" />
          </Group>
        );
      })}
    </>
  );
}

/**
 * Enemy bullet with orange glow
 * @param {Object} props
 * @param {Object[]} props.bullets - Array of enemy bullet objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function EnemyBullets({ bullets, ox, oy }) {
  return (
    <>
      {bullets.map((b, i) => (
        <Group key={`eb-${i}`}>
          <Circle cx={(b.x || 0) + b.width / 2 + ox} cy={(b.y || 0) + oy} r={5} color="rgba(249,115,22,0.25)" />
          <Rect x={(b.x || 0) + ox} y={(b.y || 0) + oy} width={b.width} height={b.height} color="#fb923c" />
        </Group>
      ))}
    </>
  );
}

/**
 * Muzzle flash effect at bullet spawn point
 * @param {Object} props
 * @param {Object[]} props.flashes - Array of muzzle flash objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export function MuzzleFlashes({ flashes, ox, oy }) {
  return (
    <>
      {flashes.map((mf, i) => {
        const alpha = Math.max(0, mf.life / 0.1);
        const scale = 1 + (1 - alpha) * 0.5; // Expanding effect
        return (
          <Group key={`muzzle-${mf.id}`}>
            {/* Outer blast wave */}
            <Circle cx={mf.x + ox} cy={mf.y + oy} r={18 * alpha * scale} color={`rgba(248,250,252,${alpha * 0.3})`} />
            {/* Bright flash */}
            <Circle cx={mf.x + ox} cy={mf.y + oy} r={12 * alpha} color={`rgba(248,250,252,${alpha * 0.9})`} />
            {/* Blue energy */}
            <Circle cx={mf.x + ox} cy={mf.y + oy} r={8 * alpha} color={`rgba(56,189,248,${alpha})`} />
            {/* Purple core */}
            <Circle cx={mf.x + ox} cy={mf.y + oy} r={5 * alpha} color={`rgba(139,92,246,${alpha})`} />
            {/* White hot center */}
            <Circle cx={mf.x + ox} cy={mf.y + oy} r={2 * alpha} color={`rgba(255,255,255,${alpha})`} />
          </Group>
        );
      })}
    </>
  );
}
