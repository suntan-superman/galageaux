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
 * @property {string[]} [enemyTypes] - Allowed types from the active stage
 * @property {function} [random] - Random source for repeatable simulation tests
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
  elite: { weight: 0.05, canShoot: true },
  tank: { weight: 0.05, canShoot: false },
  kamikaze: { weight: 0.05, canShoot: false },
  scout: { weight: 0.10, canShoot: true },
  shooter: { weight: 0.15, canShoot: true },
  dive: { weight: 0.20, canShoot: true },
  grunt: { weight: 0.40, canShoot: false }
};

/**
 * Select enemy type based on weighted random roll
 * @param {number} roll - Random number between 0-1
 * @returns {{ type: string, canShoot: boolean }}
 */
export function selectEnemyType(roll = Math.random(), enemyTypes) {
  // Restrict and renormalize the existing seven-type distribution. Merely
  // listing a dormant configured type does not activate its missing behavior.
  const choices = Object.entries(ENEMY_WEIGHTS)
    .filter(([type]) => !enemyTypes || enemyTypes.includes(type));
  const totalWeight = choices.reduce((sum, [, config]) => sum + config.weight, 0);
  let threshold = totalWeight;
  const target = Math.max(0, Math.min(1, roll)) * totalWeight;
  for (let index = 0; index < choices.length; index++) {
    const [type, config] = choices[index];
    threshold -= config.weight;
    if (target > threshold || index === choices.length - 1) {
      return { type, canShoot: enemiesConfig[type].canShoot ?? config.canShoot };
    }
  }
  return null;
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
export function createEnemy({ type, x, y, baseSpeed, pattern, canShoot, random = Math.random }) {
  const cfg = enemiesConfig[type] || enemiesConfig['grunt'];
  const speed = baseSpeed * (cfg.speed ?? 1);
  return {
    type,
    x,
    y,
    baseX: x,
    size: cfg.size ?? ENEMY_SIZE,
    speed,
    // Preserve the resolved per-type speed for temporary slow effects.
    baseSpeed: speed,
    hp: cfg.hp,
    pattern,
    // Explicit JSON flags win; omitted flags preserve the live type default.
    canShoot: cfg.canShoot ?? canShoot ?? ENEMY_WEIGHTS[type]?.canShoot ?? false,
    fireCooldown: random() * 1.5 + 0.5,
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
  const roll = (config.random || Math.random)();
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
  const { width, enemySpeed, enemyTypes, random = Math.random } = config;
  const created = [];
  const count = 5;
  const offsets = getFormationOffsets(type, count);
  const baseX = width / 2;
  const yStart = -ENEMY_SIZE * 2;
  
  offsets.forEach((off, idx) => {
    const selected = selectEnemyType(random(), enemyTypes);
    if (!selected) return;
    const { type: enemyType, canShoot } = selected;
    const size = enemiesConfig[enemyType].size ?? ENEMY_SIZE;
    const x = baseX + off.dx - size / 2;
    
    created.push(createEnemy({
      type: enemyType,
      x,
      y: yStart + off.dy - idx * 8,
      baseSpeed: enemySpeed,
      pattern: type === 'v' ? 'dive' : 'zigzag',
      canShoot,
      random
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
  const { width, enemySpeed, patterns = ['line'], enemyTypes, random = Math.random } = config;
  const created = [];
  const pad = 20;
  const pattern = patterns[Math.floor(random() * patterns.length)] || 'line';
  const selected = selectEnemyType(random(), enemyTypes);
  if (!selected) return created;
  const { type, canShoot } = selected;
  const size = enemiesConfig[type].size ?? ENEMY_SIZE;
  const x = pad + random() * Math.max(0, width - pad * 2 - size);
  
  created.push(createEnemy({
    type,
    x,
    y: -size,
    baseSpeed: enemySpeed,
    pattern,
    canShoot,
    random
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
    speed,
    vx: 0,
    vy: speed
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
