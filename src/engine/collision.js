/**
 * Collision Detection Engine
 * Provides efficient collision detection for game entities
 * @module engine/collision
 */

/**
 * @typedef {Object} Rectangle
 * @property {number} x - Left edge X position
 * @property {number} y - Top edge Y position
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 */

/**
 * Axis-Aligned Bounding Box (AABB) collision detection
 * Checks if two rectangles overlap
 * 
 * @param {Rectangle} a - First rectangle
 * @param {Rectangle} b - Second rectangle
 * @returns {boolean} True if rectangles overlap
 * 
 * @example
 * const player = { x: 100, y: 100, width: 32, height: 48 };
 * const bullet = { x: 110, y: 120, width: 8, height: 16 };
 * if (aabb(player, bullet)) {
 *   // Handle collision
 * }
 */
export function aabb(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {Rectangle} rect - Rectangle to check against
 * @returns {boolean} True if point is inside rectangle
 */
export function pointInRect(px, py, rect) {
  return px >= rect.x && 
         px <= rect.x + rect.width && 
         py >= rect.y && 
         py <= rect.y + rect.height;
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance in pixels
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Circle-circle collision detection
 * @param {number} x1 - First circle center X
 * @param {number} y1 - First circle center Y
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle center X
 * @param {number} y2 - Second circle center Y
 * @param {number} r2 - Second circle radius
 * @returns {boolean} True if circles overlap
 */
export function circleCollision(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) < r1 + r2;
}
