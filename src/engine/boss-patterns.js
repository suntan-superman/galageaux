/**
 * boss-patterns.js - Boss attack pattern generation
 * Handles bullet patterns: radial, spread, burst, spiral, aimed
 */

import bossConfig from '../config/boss.json';
import { BULLET_WIDTH, BULLET_HEIGHT } from '../entities/types';

/**
 * @typedef {Object} BossPatternState
 * @property {string} stageKey - Current stage key
 * @property {Object} config - Boss configuration from boss.json
 * @property {string[]} patternQueue - Queued patterns
 * @property {string|null} currentPattern - Active pattern
 * @property {number} patternTime - Time in current pattern
 */

/**
 * Create boss pattern state for a stage
 * @param {string} stageKey - Stage key ('stage1', 'stage2', 'stage3')
 * @returns {BossPatternState|null}
 */
export function createBossPatterns(stageKey) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return null;
  
  return {
    stageKey,
    config: cfg,
    patternQueue: [],
    currentPattern: null,
    patternTime: 0
  };
}

/**
 * Get boss's current attack pattern based on HP phase
 * @param {BossPatternState} state - Pattern state object
 * @param {Object} boss - Boss entity
 * @returns {'radial'|'spread'|'burst'|'spiral'|'aimed'}
 */
export function getBossPattern(state, boss) {
  if (!state || !boss) return 'radial';
  
  const hpRatio = boss.hp / boss.maxHp;
  const phases = state.config.phases || [];
  
  for (const phase of phases) {
    if (hpRatio * 100 > phase.hpThreshold) {
      return phase.pattern || 'radial';
    }
  }
  
  return phases[phases.length - 1]?.pattern || 'radial';
}

/**
 * Create a single boss bullet with velocity components
 * @param {number} cx - Center X position
 * @param {number} cy - Center Y position
 * @param {number} angle - Fire angle in radians
 * @param {number} speed - Bullet speed
 * @returns {Object} Bullet entity
 */
export function createBossBullet(cx, cy, angle, speed) {
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;
  return {
    x: cx - BULLET_WIDTH / 2,
    y: cy,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    speed: Math.abs(vy),
    vx,
    vy
  };
}

/**
 * Generate bullets for a boss attack pattern
 * @param {Object} boss - Boss entity with x, y, width, height
 * @param {'radial'|'spread'|'burst'|'spiral'|'aimed'} pattern - Attack pattern
 * @param {string} stageKey - Current stage key
 * @param {number} playerX - Player X position (for aimed attacks)
 * @param {number} playerY - Player Y position (for aimed attacks)
 * @returns {Object[]} Array of bullet entities
 * 
 * Pattern descriptions:
 * - radial: 12 bullets in a circle
 * - spread: 7 bullets in a forward arc
 * - burst: 8 bullets aimed at player spread
 * - spiral: 6 rotating bullets
 * - aimed: Single fast bullet at player
 */
export function generateBossBullets(boss, pattern, stageKey, playerX, playerY) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return [];
  
  const bullets = [];
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const bulletSpeed = cfg.bulletSpeed || 260;
  
  if (pattern === 'radial') {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.PI;
      bullets.push(createBossBullet(cx, cy, angle, bulletSpeed));
    }
  } else if (pattern === 'spread') {
    const angles = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
    angles.forEach(angle => {
      bullets.push(createBossBullet(cx, cy, angle + Math.PI, bulletSpeed));
    });
  } else if (pattern === 'burst') {
    const count = 8;
    const baseAngle = Math.atan2(playerY - cy, playerX - cx) + Math.PI;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - 0.3 + (i * 0.6) / (count - 1);
      bullets.push(createBossBullet(cx, cy, angle, bulletSpeed));
    }
  } else if (pattern === 'spiral') {
    const count = 6;
    const baseAngle = Date.now() / 1000 * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / count + Math.PI;
      bullets.push(createBossBullet(cx, cy, angle, bulletSpeed));
    }
  } else if (pattern === 'aimed') {
    const angle = Math.atan2(playerY - cy, playerX - cx) + Math.PI;
    bullets.push(createBossBullet(cx, cy, angle, bulletSpeed * 1.2));
  }
  
  return bullets;
}

export function shouldBossSwoop(boss, stageKey, screenWidth, screenHeight) {
  const cfg = bossConfig[stageKey];
  if (!cfg || !cfg.swoopEnabled) return false;
  
  const hpRatio = boss.hp / boss.maxHp;
  if (hpRatio > 0.5) return false;
  
  return Math.random() < 0.02;
}

export function createBossSwoop(boss, screenWidth, screenHeight) {
  return {
    active: true,
    startX: boss.x,
    startY: boss.y,
    targetX: screenWidth / 2,
    targetY: screenHeight * 0.6,
    time: 0,
    duration: 1.5
  };
}

export function updateBossSwoop(boss, swoopState, dt) {
  if (!swoopState || !swoopState.active) return boss;
  
  swoopState.time += dt;
  const progress = Math.min(swoopState.time / swoopState.duration, 1);
  
  if (progress < 0.5) {
    const t = progress * 2;
    boss.x = swoopState.startX + (swoopState.targetX - swoopState.startX) * t;
    boss.y = swoopState.startY + (swoopState.targetY - swoopState.startY) * t;
  } else {
    const t = (progress - 0.5) * 2;
    boss.x = swoopState.targetX + (swoopState.startX - swoopState.targetX) * t;
    boss.y = swoopState.targetY + (swoopState.startY - swoopState.targetY) * t;
  }
  
  if (progress >= 1) {
    swoopState.active = false;
  }
  
  return boss;
}

