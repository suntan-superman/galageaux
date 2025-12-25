/**
 * BossShip - Skia Canvas component for boss rendering
 * Renders the boss with health-based glow effects and details
 */

import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import BossHealthBar from '../BossHealthBar';

/**
 * @param {Object} props
 * @param {Object} props.boss - Boss state object
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 * @param {number} props.screenWidth - Screen width for health bar positioning
 */
export default function BossShip({ boss, ox, oy, screenWidth }) {
  if (!boss || !boss.alive) return null;

  const bossCenterX = boss.x + boss.width / 2 + ox;
  const bossCenterY = boss.y + boss.height / 2 + oy;
  const hpRatio = boss.hp / boss.maxHp;
  
  // Color changes based on health
  const bossGlowColor = hpRatio > 0.5 
    ? 'rgba(168,85,247,0.4)' 
    : hpRatio > 0.25 
      ? 'rgba(249,115,22,0.4)' 
      : 'rgba(239,68,68,0.5)';

  return (
    <Group>
      {/* Outer energy field */}
      <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width / 2 + 20} color="rgba(147,51,234,0.2)" />
      <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width / 2 + 14} color={bossGlowColor} />
      
      {/* Boss body with pattern */}
      <Rect x={boss.x + ox} y={boss.y + oy} width={boss.width} height={boss.height} color="#a855f7" />
      
      {/* Inner details */}
      <Rect 
        x={bossCenterX - boss.width * 0.3} 
        y={bossCenterY - boss.height * 0.15} 
        width={boss.width * 0.6} 
        height={boss.height * 0.3} 
        color="rgba(248,250,252,0.3)" 
      />
      <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width * 0.2} color="rgba(248,250,252,0.5)" />
      <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width * 0.12} color="rgba(15,23,42,0.8)" />
      
      {/* Corner details */}
      <Circle cx={boss.x + ox + boss.width * 0.15} cy={boss.y + oy + boss.height * 0.15} r={2} color="rgba(248,250,252,0.6)" />
      <Circle cx={boss.x + ox + boss.width * 0.85} cy={boss.y + oy + boss.height * 0.15} r={2} color="rgba(248,250,252,0.6)" />
      <Circle cx={boss.x + ox + boss.width * 0.15} cy={boss.y + oy + boss.height * 0.85} r={2} color="rgba(248,250,252,0.6)" />
      <Circle cx={boss.x + ox + boss.width * 0.85} cy={boss.y + oy + boss.height * 0.85} r={2} color="rgba(248,250,252,0.6)" />
      
      <BossHealthBar
        health={boss.hp}
        maxHealth={boss.maxHp}
        x={screenWidth / 2 - 100 + ox}
        y={40 + oy}
        width={200}
        height={16}
      />
    </Group>
  );
}
