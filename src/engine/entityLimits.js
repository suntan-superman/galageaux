/**
 * Entity Limit Enforcement
 * Prevents memory growth by capping entity counts
 * Uses oldest-first removal when limits are exceeded
 * @module engine/entityLimits
 */

import { GAMEPLAY } from '../constants/game';

/**
 * Enforces a maximum count on an array, removing oldest items first
 * @param {Array} arr - Array to limit
 * @param {number} maxCount - Maximum allowed items
 * @returns {Array} Limited array (may be same reference if no change)
 */
export function enforceLimit(arr, maxCount) {
  if (!arr || arr.length <= maxCount) {
    return arr;
  }
  // Remove oldest (first) items to get under limit
  return arr.slice(arr.length - maxCount);
}

/**
 * Enforces limit on particles array
 * @param {Array} particles - Current particles
 * @returns {Array} Limited particles
 */
export function limitParticles(particles) {
  return enforceLimit(particles, GAMEPLAY.MAX_PARTICLES);
}

/**
 * Enforces limit on explosions array
 * @param {Array} explosions - Current explosions
 * @returns {Array} Limited explosions
 */
export function limitExplosions(explosions) {
  return enforceLimit(explosions, GAMEPLAY.MAX_EXPLOSIONS);
}

/**
 * Enforces limit on player bullets array
 * @param {Array} bullets - Current player bullets
 * @returns {Array} Limited bullets
 */
export function limitPlayerBullets(bullets) {
  return enforceLimit(bullets, GAMEPLAY.MAX_PLAYER_BULLETS);
}

/**
 * Enforces limit on enemy bullets array
 * @param {Array} bullets - Current enemy bullets
 * @returns {Array} Limited bullets
 */
export function limitEnemyBullets(bullets) {
  return enforceLimit(bullets, GAMEPLAY.MAX_ENEMY_BULLETS);
}

/**
 * Enforces limit on enemies array
 * @param {Array} enemies - Current enemies
 * @returns {Array} Limited enemies
 */
export function limitEnemies(enemies) {
  return enforceLimit(enemies, GAMEPLAY.MAX_ENEMIES);
}

/**
 * Enforces limit on powerups array
 * @param {Array} powerups - Current powerups
 * @returns {Array} Limited powerups
 */
export function limitPowerups(powerups) {
  return enforceLimit(powerups, GAMEPLAY.MAX_POWERUPS);
}

/**
 * Enforces limit on score texts array
 * @param {Array} scoreTexts - Current score texts
 * @returns {Array} Limited score texts
 */
export function limitScoreTexts(scoreTexts) {
  return enforceLimit(scoreTexts, GAMEPLAY.MAX_SCORE_TEXTS);
}

/**
 * Apply all entity limits at once
 * Useful for batch limiting during state commit
 * @param {Object} entities - Object containing all entity arrays
 * @returns {Object} Object with all arrays limited
 */
export function applyAllLimits(entities) {
  return {
    particles: entities.particles ? limitParticles(entities.particles) : [],
    explosions: entities.explosions ? limitExplosions(entities.explosions) : [],
    bullets: entities.bullets ? limitPlayerBullets(entities.bullets) : [],
    enemyBullets: entities.enemyBullets ? limitEnemyBullets(entities.enemyBullets) : [],
    enemies: entities.enemies ? limitEnemies(entities.enemies) : [],
    powerups: entities.powerups ? limitPowerups(entities.powerups) : [],
    scoreTexts: entities.scoreTexts ? limitScoreTexts(entities.scoreTexts) : []
  };
}

/**
 * Get current limits for debugging/display
 * @returns {Object} Current limit values
 */
export function getLimits() {
  return {
    particles: GAMEPLAY.MAX_PARTICLES,
    explosions: GAMEPLAY.MAX_EXPLOSIONS,
    playerBullets: GAMEPLAY.MAX_PLAYER_BULLETS,
    enemyBullets: GAMEPLAY.MAX_ENEMY_BULLETS,
    enemies: GAMEPLAY.MAX_ENEMIES,
    powerups: GAMEPLAY.MAX_POWERUPS,
    scoreTexts: GAMEPLAY.MAX_SCORE_TEXTS
  };
}
