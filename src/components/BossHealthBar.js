import React from 'react';
import { Rect, Group } from '@shopify/react-native-skia';

export default function BossHealthBar({ health, maxHealth, x, y, width = 200, height = 16 }) {
  if (!health || !maxHealth || health <= 0) return null;
  
  const healthPercent = Math.max(0, Math.min(1, health / maxHealth));
  const barWidth = Math.max(0, (width - 4) * healthPercent);
  
  const barColor = healthPercent > 0.6 ? '#22c55e' : 
                   healthPercent > 0.3 ? '#fbbf24' : 
                   '#ef4444';
  
  return (
    <Group>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        color="rgba(30,41,59,0.8)"
      />
      {barWidth > 0 && (
        <Rect
          x={x + 2}
          y={y + 2}
          width={barWidth}
          height={height - 4}
          color={barColor}
        />
      )}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        color="rgba(255,255,255,0.3)"
        style="stroke"
      />
    </Group>
  );
}

