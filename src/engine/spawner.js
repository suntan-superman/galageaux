/**
 * spawner.js - Enemy spawning logic for Galageaux
 * Handles wave spawning, formation creation, and individual enemy spawning
 */

import { ENEMY_SIZE } from '../entities/types';
import { getFormationOffsets } from './formations';
import enemiesConfig from '../config/enemies.json';

/**
 * @typedef {Object} EnemySpawnConfig
 * @property {number} width - Screen width
 * @property {number} enemySpeed - Base enemy speed for current level
 * @property {string[]} patterns - Available movement patterns for the stage
 */

/**
 * @typedef {Object} Enemy
 * @property {string} type - Enemy type key
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} baseX - Base X for pattern movement
 * @property {number} size - Enemy size
 * @property {number} speed - Movement speed
 * @property {number} hp - Hit points
 * @property {string} pattern - Movement pattern
 * @property {boolean} canShoot - Whether enemy can fire
 * @property {number} fireCooldown - Time until next shot
 * @property {string} behavior - Behavior type ('normal', 'chase', etc.)
 */

/**
 * Enemy type weights for random selection
 * Determines spawn probability for each enemy type
 */
const ENEMY_WEIGHTS = {
  elite: { threshold: 0.95, canShoot: true },     // 5% - rapid fire
  tank: { threshold: 0.90, canShoot: false },     // 5% - slow, high HP
  kamikaze: { threshold: 0.85, canShoot: false }, // 5% - chase player
  scout: { threshold: 0.75, canShoot: true },     // 10% - fast
  shooter: { threshold: 0.60, canShoot: true },   // 15% - shoots
  dive: { threshold: 0.40, canShoot: true },      // 20% - dive pattern
  grunt: { threshold: 0.00, canShoot: false }     // 40% - basic
};

/**
 * Select enemy type based on weighted random roll
 * @param {number} roll - Random number between 0-1
 * @returns {{ type: string, canShoot: boolean }}
 */
export function selectEnemyType(roll = Math.random()) {
  for (const [type, config] of Object.entries(ENEMY_WEIGHTS)) {
    if (roll > config.threshold) {
      return { type, canShoot: config.canShoot };
    }
  }
  return { type: 'grunt', canShoot: false };
}

/**
 * Create a single enemy entity
 * @param {Object} options - Enemy creation options
 * @param {string} options.type - Enemy type key
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.baseSpeed - Base enemy speed
 * @param {string} options.pattern - Movement pattern
 * @param {boolean} options.canShoot - Whether enemy can fire
 * @returns {Enemy}
 */
export function createEnemy({ type, x, y, baseSpeed, pattern, canShoot }) {
  const cfg = enemiesConfig[type] || enemiesConfig['grunt'];
  return {
    type,
    x,
    y,
    baseX: x,
    size: ENEMY_SIZE,
    speed: baseSpeed * (cfg.speedMultiplier || 1),
    hp: cfg.hp,
    pattern,
    canShoot,
    fireCooldown: Math.random() * 1.5 + 0.5,
    behavior: cfg.behavior || 'normal'
  };
}

/**
 * Spawn a wave of enemies - randomly picks formation or single enemy
 * @param {EnemySpawnConfig} config - Spawn configuration
 * @param {function} onSpawnCount - Callback to track spawn count
 * @returns {Enemy[]}
 */
export function spawnWave(config, onSpawnCount) {
  const roll = Math.random();
  if (roll < 0.3) return spawnFormation('v', config, onSpawnCount);
  if (roll < 0.6) return spawnFormation('line', config, onSpawnCount);
  return spawnSingleEnemy(config, onSpawnCount);
}

/**
 * Spawn a formation of enemies
 * @param {'v'|'line'|'arrow'|'diamond'} type - Formation type
 * @param {EnemySpawnConfig} config - Spawn configuration
 * @param {function} onSpawnCount - Callback to track spawn count
 * @returns {Enemy[]}
 */
export function spawnFormation(type, config, onSpawnCount) {
  const { width, enemySpeed } = config;
  const created = [];
  const count = 5;
  const offsets = getFormationOffsets(type, count);
  const baseX = width / 2;
  const yStart = -ENEMY_SIZE * 2;
  
  offsets.forEach((off, idx) => {
    const { type: enemyType, canShoot } = selectEnemyType();
    const x = baseX + off.dx - ENEMY_SIZE / 2;
    
    created.push(createEnemy({
      type: enemyType,
      x,
      y: yStart + off.dy - idx * 8,
      baseSpeed: enemySpeed,
      pattern: type === 'v' ? 'dive' : 'zigzag',
      canShoot
    }));
    
    onSpawnCount?.(1);
  });
  
  return created;
}

/**
 * Spawn a single enemy
 * @param {EnemySpawnConfig} config - Spawn configuration
 * @param {function} onSpawnCount - Callback to track spawn count
 * @returns {Enemy[]}
 */
export function spawnSingleEnemy(config, onSpawnCount) {
  const { width, enemySpeed, patterns } = config;
  const created = [];
  const pad = 20;
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const { type, canShoot } = selectEnemyType();
  const x = pad + Math.random() * (width - pad * 2 - ENEMY_SIZE);
  
  created.push(createEnemy({
    type,
    x,
    y: -ENEMY_SIZE,
    baseSpeed: enemySpeed,
    pattern,
    canShoot
  }));
  
  onSpawnCount?.(1);
  return created;
}

/**
 * Create an enemy bullet
 * @param {Enemy} enemy - Enemy that fires the bullet
 * @param {number} bulletWidth - Bullet width
 * @param {number} bulletHeight - Bullet height
 * @param {number} speed - Bullet speed
 * @returns {Object} Bullet entity
 */
export function createEnemyBullet(enemy, bulletWidth, bulletHeight, speed) {
  const cx = enemy.x + enemy.size / 2;
  const cy = enemy.y + enemy.size;
  return {
    x: cx - bulletWidth / 2,
    y: cy,
    width: bulletWidth,
    height: bulletHeight,
    speed
  };
}

/**
 * Check if wave should spawn
 * @param {number} timer - Current spawn timer
 * @param {number} interval - Spawn interval
 * @param {number} currentEnemyCount - Current number of enemies
 * @param {number} maxEnemies - Maximum enemies allowed
 * @param {boolean} bossSpawned - Whether boss is active
 * @returns {boolean}
 */
export function shouldSpawnWave(timer, interval, currentEnemyCount, maxEnemies, bossSpawned) {
  return !bossSpawned && timer >= interval && currentEnemyCount < maxEnemies;
}
