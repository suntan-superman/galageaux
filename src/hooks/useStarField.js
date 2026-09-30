/**
 * useStarField - Custom hook for parallax star field background
 * Creates and updates a layered star field with twinkle effects
 */

import { useState, useCallback } from 'react';
import { STAR_COLORS, getStarVisuals } from '../engine/sceneVisuals';

/**
 * @typedef {Object} Star
 * @property {string} id - Unique identifier
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} size - Star size
 * @property {number} speed - Scroll speed
 * @property {string} color - RGB color string (e.g., "255,255,255")
 * @property {number} twinkleOffset - Phase offset for twinkle
 * @property {number} twinkleSpeed - Twinkle animation speed
 * @property {'far'|'mid'|'near'} layer - Parallax layer
 */

/**
 * Create a star field with multiple parallax layers
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} [count=100] - Number of stars
 * @returns {Star[]}
 */
export function createStarField(width, height, count = 100, random = Math.random) {
  return Array.from({ length: count }).map((_, idx) => {
    const layer = random();
    return {
      id: `star-${idx}-${random()}`,
      x: random() * width,
      y: random() * height,
      size: layer < 0.3 ? 0.8 + random() * 1 :
            layer < 0.7 ? 1.2 + random() * 1.5 :
            2 + random() * 2,
      speed: layer < 0.3 ? 15 + random() * 25 :
             layer < 0.7 ? 40 + random() * 40 :
             80 + random() * 60,
      color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
      twinkleOffset: random() * Math.PI * 2,
      twinkleSpeed: 0.5 + random() * 2,
      layer: layer < 0.3 ? 'far' : layer < 0.7 ? 'mid' : 'near',
      // Rare, stable glows without another random sample or more stars.
      glow: layer >= 0.7 && idx % 11 === 0,
    };
  });
}

export function advanceStarField(stars, dt, width, height, random = Math.random) {
  return stars.map(star => {
    let nextY = star.y + star.speed * dt;
    let nextX = star.x;
    if (nextY > height) {
      nextY = -5;
      nextX = random() * width;
    }
    return { ...star, y: nextY, x: nextX };
  });
}

/**
 * Custom hook for managing star field state
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} [count=100] - Number of stars
 */
export default function useStarField(width, height, count = 100, random = Math.random) {
  const [stars, setStars] = useState(() => createStarField(width, height, count, random));

  /**
   * Update star positions - call in game loop
   * @param {number} dt - Delta time in seconds
   */
  const updateStars = useCallback((dt) => {
    setStars(prev => advanceStarField(prev, dt, width, height, random));
  }, [width, height, random]);

  /**
   * Reset star field (e.g., on game reset)
   */
  const resetStars = useCallback(() => {
    setStars(createStarField(width, height, count, random));
  }, [width, height, count, random]);

  return {
    stars,
    updateStars,
    resetStars,
    getStarVisuals
  };
}
