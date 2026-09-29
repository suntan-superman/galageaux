import React from 'react';
import { Group, Circle, Path } from '@shopify/react-native-skia';
import { PALETTE } from '../../constants/visualTheme';
import { getPowerupVisuals } from '../../engine/sceneVisuals';

// Chamfered collectible badge, unlike the small narrow hostile projectiles.
const BADGE = 'M4 0.75H16L19.25 4V16L16 19.25H4L0.75 16V4Z';

export default function Powerups({ powerups, time = 0, ox = 0, oy = 0 }) {
  return (
    <>
      {powerups.map((powerup, index) => {
        const visual = getPowerupVisuals(powerup.kind, time);
        return (
          <Group key={powerup.id ?? `powerup-${index}`}
            transform={[{ translateX: powerup.x + ox }, { translateY: powerup.y + oy }, { scale: powerup.size / 20 }]}>
            <Circle cx={10} cy={10} r={visual.glowRadius} color={visual.color} opacity={visual.glowOpacity} />
            <Path path={BADGE} color="#07121f" />
            <Path path={BADGE} color={visual.color} style="stroke" strokeWidth={1.25} opacity={visual.borderOpacity} />
            <Path path={visual.glyph} color={PALETTE.core} style={visual.glyphStyle}
              strokeWidth={1.4} strokeCap="round" strokeJoin="round" />
          </Group>
        );
      })}
    </>
  );
}
