/**
 * Boss Engine
 * Handles boss creation, movement, and attack patterns
 * @module engine/boss
 */

import bossConfig from '../config/boss.json';

/**
 * @typedef {Object} Boss
 * @property {number} hp - Current hit points
 * @property {number} maxHp - Maximum hit points (for health bar)
 * @property {number} x - X position (top-left)
 * @property {number} y - Y position (top-left)
 * @property {number} width - Boss width in pixels
 * @property {number} height - Boss height in pixels
 * @property {number} targetY - Y position to stop at after entrance
 * @property {number} speed - Movement speed in pixels/second
 * @property {number} phaseIndex - Current attack phase index
 * @property {number} fireCooldown - Seconds until next attack
 * @property {boolean} alive - Whether boss is still alive
 */

/**
 * Creates a new boss for the specified stage
 * @param {string} stageKey - Stage identifier ('stage1', 'stage2', 'stage3')
 * @param {number} width - Screen width for positioning
 * @returns {Boss|null} New boss object or null if stage config not found
 */
export function createBoss(stageKey, width) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return null;
  return {
    hp: cfg.hp,
    maxHp: cfg.hp,
    x: width / 2 - 40,
    y: -120,
    width: 80,
    height: 60,
    targetY: cfg.enterY,
    speed: cfg.speed,
    phaseIndex: 0,
    fireCooldown: 1.2,
    alive: true
  };
}

/**
 * Updates boss position and state for one frame
 * @param {Boss} boss - The boss to update
 * @param {number} dt - Delta time in seconds
 * @param {string} stageKey - Current stage identifier
 * @returns {Boss|null} Updated boss or null if invalid
 */
export function updateBoss(boss, dt, stageKey) {
  if (!boss) return null;
  const cfg = bossConfig[stageKey];
  if (!cfg) return boss;

  // Entrance phase: move down to target position
  if (boss.y < boss.targetY) {
    boss.y += boss.speed * dt;
  } else {
    // Combat phase: oscillate horizontally
    boss.x += Math.sin(Date.now() / 600) * 20 * dt;
  }

  boss.fireCooldown -= dt;
  return boss;
}

/**
 * Gets the current attack pattern based on boss HP
 * Patterns change as boss takes damage (phase transitions)
 * @param {Boss} boss - The boss to check
 * @param {string} stageKey - Current stage identifier
 * @returns {string} Pattern name ('radial', 'spread', 'burst', 'spiral', 'aimed')
 */
export function bossCurrentPattern(boss, stageKey) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return 'radial';
  const hpRatio = boss.hp / boss.maxHp;
  for (const phase of cfg.phases) {
    if (hpRatio * 100 > phase.hpThreshold) {
      return phase.pattern;
    }
  }
  return cfg.phases[cfg.phases.length - 1].pattern;
}
