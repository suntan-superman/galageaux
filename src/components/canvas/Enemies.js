/**
 * Enemies - Skia Canvas component for enemy rendering
 * Renders different enemy types with appropriate glows and details
 */

import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import enemiesConfig from '../../config/enemies.json';

/**
 * Get glow color based on enemy type
 * @param {string} type - Enemy type
 * @returns {string} RGBA color string
 */
function getEnemyGlow(type) {
  switch (type) {
    case 'shooter': return 'rgba(249,115,22,0.3)'; // orange
    case 'dive': return 'rgba(34,197,94,0.3)'; // green
    case 'scout': return 'rgba(168,85,247,0.3)'; // purple
    case 'tank': return 'rgba(239,68,68,0.4)'; // red (stronger)
    case 'elite': return 'rgba(251,191,36,0.4)'; // gold (stronger)
    case 'kamikaze': return 'rgba(236,72,153,0.3)'; // pink
    default: return 'rgba(56,189,248,0.3)'; // blue
  }
}

/**
 * Renders all enemies with type-specific styling
 * @param {Object} props
 * @param {Object[]} props.enemies - Array of enemy objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export default function Enemies({ enemies, ox, oy }) {
  return (
    <>
      {enemies.map((e, i) => {
        const enemyCenterX = e.x + e.size / 2 + ox;
        const enemyCenterY = e.y + e.size / 2 + oy;
        const enemyColor = enemiesConfig[e.type]?.color || '#38bdf8';
        const enemyGlow = getEnemyGlow(e.type);
        
        return (
          <Group key={`e-${i}`}>
            {/* Outer glow */}
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size / 2 + 8} color="rgba(15,23,42,0.6)" />
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size / 2 + 4} color={enemyGlow} />
            
            {/* Enemy body with pattern */}
            <Rect x={e.x + ox} y={e.y + oy} width={e.size} height={e.size} color={enemyColor} />
            
            {/* Inner detail - crosshair pattern for shooters */}
            {e.canShoot && (
              <>
                <Rect 
                  x={enemyCenterX - e.size * 0.15} 
                  y={enemyCenterY - e.size * 0.4} 
                  width={e.size * 0.3} 
                  height={e.size * 0.8} 
                  color="rgba(248,250,252,0.4)" 
                />
                <Rect 
                  x={enemyCenterX - e.size * 0.4} 
                  y={enemyCenterY - e.size * 0.15} 
                  width={e.size * 0.8} 
                  height={e.size * 0.3} 
                  color="rgba(248,250,252,0.4)" 
                />
              </>
            )}
            
            {/* Center core */}
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size * 0.15} color="rgba(248,250,252,0.6)" />
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size * 0.08} color="rgba(15,23,42,0.8)" />
            
            {/* Corner accents */}
            <Circle cx={e.x + ox + e.size * 0.2} cy={e.y + oy + e.size * 0.2} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.8} cy={e.y + oy + e.size * 0.2} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.2} cy={e.y + oy + e.size * 0.8} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.8} cy={e.y + oy + e.size * 0.8} r={1.5} color="rgba(248,250,252,0.5)" />
          </Group>
        );
      })}
    </>
  );
}
