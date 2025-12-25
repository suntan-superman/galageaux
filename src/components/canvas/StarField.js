/**
 * StarField - Skia Canvas component for parallax star background
 * Renders layered stars with twinkle effects
 */

import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';

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
export default function StarField({ stars, ox, oy }) {
  return (
    <>
      {stars.map(star => {
        const twinkle = Math.sin(Date.now() * 0.001 * (star.twinkleSpeed || 1) + (star.twinkleOffset || 0));
        const alpha = star.layer === 'far' ? 0.2 + 0.15 * twinkle : 
                      star.layer === 'mid' ? 0.4 + 0.25 * twinkle : 
                      0.6 + 0.35 * twinkle;
        const pulseSize = star.layer === 'near' ? star.size * (1 + twinkle * 0.15) : star.size;
        
        return (
          <Group key={star.id}>
            {star.layer === 'near' && (
              <Circle
                cx={star.x + ox}
                cy={star.y + oy}
                r={pulseSize * 2}
                color={`rgba(${star.color},${alpha * 0.2})`}
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
