/**
 * Background - Skia Canvas component for space background
 * Renders the dark space background with animated nebula effects
 */

import React from 'react';
import { Rect, Circle, LinearGradient, RadialGradient, vec } from '@shopify/react-native-skia';
import { getStageTheme, getNebulaVisuals } from '../../engine/sceneVisuals';

/**
 * @param {Object} props
 * @param {number} props.width - Screen width
 * @param {number} props.height - Screen height
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 * @param {string} props.stage - Active stage palette
 * @param {number} props.time - Shared presentation seconds
 */
export default function Background({ width, height, stage = 'stage1', time = 0, ox = 0, oy = 0 }) {
  const theme = getStageTheme(stage);
  return (
    <>
      {/* Fixed full coverage: camera shake must never expose canvas edges. */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={theme.space} positions={[0, 0.48, 1]} />
      </Rect>
      {getNebulaVisuals(stage, width, height, time).map((nebula, index) => (
        <Circle key={`nebula-${index}`} cx={nebula.x + ox} cy={nebula.y + oy} r={nebula.radius} opacity={nebula.opacity}>
          <RadialGradient c={vec(nebula.x + ox, nebula.y + oy)} r={nebula.radius}
            colors={[nebula.color, `${nebula.color}80`, `${nebula.color}00`]} positions={[0, 0.42, 1]} />
        </Circle>
      ))}
    </>
  );
}
