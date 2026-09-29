/**
 * StarField - Skia Canvas component for parallax star background
 * Renders layered stars with twinkle effects
 */

import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import { getStarVisuals } from '../../engine/sceneVisuals';

/**
 * @typedef {Object} Star
 * @property {string} id - Unique identifier
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} size - Star size
 * @property {string} color - RGB color string
 * @property {number} twinkleOffset - Phase offset for twinkle
 * @property {number} twinkleSpeed - Twinkle animation speed
 * @property {'far'|'mid'|'near'} layer - Parallax layer
 */

/**
 * @param {Object} props
 * @param {Star[]} props.stars - Array of star objects
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 */
export default function StarField({ stars, time = 0, ox = 0, oy = 0 }) {
  return (
    <>
      {stars.map(star => {
        const { alpha, size: pulseSize, glow, glowAlpha } = getStarVisuals(star, time);
        
        return (
          <Group key={star.id}>
            {glow && (
              <Circle
                cx={star.x + ox}
                cy={star.y + oy}
                r={pulseSize * 2}
                color={`rgba(${star.color},${glowAlpha})`}
              />
            )}
            <Circle
              cx={star.x + ox}
              cy={star.y + oy}
              r={pulseSize}
              color={`rgba(${star.color},${alpha})`}
            />
          </Group>
        );
      })}
    </>
  );
}
