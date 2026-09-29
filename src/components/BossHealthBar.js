import React from 'react';
import { Rect, Group } from '@shopify/react-native-skia';
import { PALETTE } from '../constants/visualTheme';

export default function BossHealthBar({ health, maxHealth, trailingHealth = health, x, y, width = 200, height = 10,
  accent = PALETTE.boss, phaseThresholds = [], phasePulse = 0 }) {
  if (!health || !maxHealth || health <= 0) return null;
  
  const healthPercent = Math.max(0, Math.min(1, health / maxHealth));
  const barWidth = Math.max(0, (width - 4) * healthPercent);
  const trailingWidth = (width - 4) * Math.max(healthPercent, Math.min(1, (trailingHealth ?? health) / maxHealth));
  
  const barColor = healthPercent > 0.3 ? accent : PALETTE.hostile;
  
  return (
    <Group>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        color="rgba(30,41,59,0.8)"
      />
      <Rect x={x + 2} y={y + 2} width={trailingWidth} height={height - 4} color={PALETTE.core} opacity={0.45} />
      {barWidth > 0 && (
        <Rect
          x={x + 2}
          y={y + 2}
          width={barWidth}
          height={height - 4}
          color={barColor}
        />
      )}
      {phaseThresholds.filter(value => value > 0 && value < maxHealth).map(value => (
        <Rect key={value} x={x + 2 + (width - 4) * value / maxHealth - 0.5}
          y={y + 1} width={1} height={height - 2} color={PALETTE.core} opacity={0.44} />
      ))}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        color="rgba(255,255,255,0.3)"
        style="stroke"
        opacity={Math.min(1, 0.7 + phasePulse * 0.3)}
      />
    </Group>
  );
}

