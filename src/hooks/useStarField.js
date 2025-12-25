/**
 * useStarField - Custom hook for parallax star field background
 * Creates and updates a layered star field with twinkle effects
 */

import { useState, useCallback } from 'react';
import { VISUAL } from '../constants/game';

const STAR_COLORS = VISUAL.STAR_COLORS;

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
export function createStarField(width, height, count = 100) {
  return Array.from({ length: count }).map((_, idx) => {
    const layer = Math.random();
    return {
      id: `star-${idx}-${Math.random()}`,
      x: Math.random() * width,
      y: Math.random() * height,
      size: layer < 0.3 ? 0.8 + Math.random() * 1 : 
            layer < 0.7 ? 1.2 + Math.random() * 1.5 : 
            2 + Math.random() * 2,
      speed: layer < 0.3 ? 15 + Math.random() * 25 : 
             layer < 0.7 ? 40 + Math.random() * 40 : 
             80 + Math.random() * 60,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 2,
      layer: layer < 0.3 ? 'far' : layer < 0.7 ? 'mid' : 'near'
    };
  });
}

/**
 * Custom hook for managing star field state
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} [count=100] - Number of stars
 */
export default function useStarField(width, height, count = 100) {
  const [stars, setStars] = useState(() => createStarField(width, height, count));

  /**
   * Update star positions - call in game loop
   * @param {number} dt - Delta time in seconds
   */
  const updateStars = useCallback((dt) => {
    setStars(prev => prev.map(star => {
      let nextY = star.y + star.speed * dt;
      let nextX = star.x;
      if (nextY > height) {
        nextY = -5;
        nextX = Math.random() * width;
      }
      const twinkle = 0.5 + 0.5 * Math.sin((Date.now() / 600) + star.twinkleOffset);
      return { ...star, y: nextY, x: nextX, twinkle };
    }));
  }, [width, height]);

  /**
   * Reset star field (e.g., on game reset)
   */
  const resetStars = useCallback(() => {
    setStars(createStarField(width, height, count));
  }, [width, height, count]);

  /**
   * Calculate star visual properties for rendering
   * @param {Star} star - Star object
   * @returns {{ alpha: number, size: number }} Visual properties
   */
  const getStarVisuals = useCallback((star) => {
    const twinkle = Math.sin(Date.now() * 0.001 * (star.twinkleSpeed || 1) + (star.twinkleOffset || 0));
    const alpha = star.layer === 'far' ? 0.2 + 0.15 * twinkle : 
                  star.layer === 'mid' ? 0.4 + 0.25 * twinkle : 
                  0.6 + 0.35 * twinkle;
    const size = star.layer === 'near' ? star.size * (1 + twinkle * 0.15) : star.size;
    return { alpha, size };
  }, []);

  return {
    stars,
    updateStars,
    resetStars,
    getStarVisuals
  };
}
