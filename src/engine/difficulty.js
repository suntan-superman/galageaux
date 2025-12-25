/**
 * difficulty.js - Difficulty scaling calculations
 * Centralizes all difficulty-related math for consistent game balance
 */

/**
 * Get the number of kills required to complete a level
 * @param {number} level - Current level (1-10)
 * @returns {number} Kill target for the level
 */
export function getLevelTarget(level) {
  if (level === 1) return 4;
  if (level === 2) return 6;
  if (level === 3) return 8;
  return 6 + level * 3;
}

/**
 * Get difficulty multiplier based on level
 * Early levels are easier, difficulty scales gradually
 * @param {number} level - Current level
 * @returns {number} Multiplier (0.6-1.0+)
 */
export function getDifficultyMultiplier(level) {
  if (level === 1) return 0.6;
  if (level === 2) return 0.7;
  if (level === 3) return 0.8;
  if (level === 4) return 0.9;
  return Math.min(1.0, 0.9 + (level - 4) * 0.05);
}

/**
 * Calculate spawn interval for enemies
 * @param {number} baseInterval - Stage base spawn interval
 * @param {number} level - Current level
 * @param {boolean} inBonusRound - Whether in bonus round
 * @returns {number} Spawn interval in seconds
 */
export function calculateSpawnInterval(baseInterval, level, inBonusRound = false) {
  const difficultyMult = getDifficultyMultiplier(level);
  const adjustedBase = baseInterval / difficultyMult;
  const levelAdjusted = adjustedBase - (level - 1) * 0.03;
  const bonusFactor = inBonusRound ? 0.6 : 1;
  return Math.max(0.5, levelAdjusted * bonusFactor);
}

/**
 * Calculate maximum enemies on screen
 * @param {number} baseMax - Stage base max enemies
 * @param {number} level - Current level
 * @param {boolean} inBonusRound - Whether in bonus round
 * @returns {number} Max enemies allowed
 */
export function calculateMaxEnemies(baseMax, level, inBonusRound = false) {
  const difficultyMult = getDifficultyMultiplier(level);
  const baseAdjusted = Math.floor(baseMax * difficultyMult);
  const levelBonus = Math.floor((level - 1) * 2);
  const bonusBonus = inBonusRound ? 3 : 0;
  return Math.max(3, baseAdjusted + levelBonus + bonusBonus);
}

/**
 * Calculate enemy movement speed
 * @param {number} baseSpeed - Stage base enemy speed
 * @param {number} level - Current level
 * @param {boolean} inBonusRound - Whether in bonus round
 * @returns {number} Enemy speed
 */
export function calculateEnemySpeed(baseSpeed, level, inBonusRound = false) {
  const difficultyMult = getDifficultyMultiplier(level);
  const levelMult = 1 + (level - 1) * 0.08;
  const bonusMult = inBonusRound ? 1.25 : 1;
  return baseSpeed * difficultyMult * levelMult * bonusMult;
}

/**
 * Calculate enemy bullet speed
 * @param {number} baseSpeed - Stage base bullet speed
 * @param {number} level - Current level
 * @returns {number} Enemy bullet speed
 */
export function calculateEnemyBulletSpeed(baseSpeed, level) {
  const difficultyMult = getDifficultyMultiplier(level);
  const levelMult = 1 + (level - 1) * 0.06;
  return baseSpeed * difficultyMult * levelMult;
}

/**
 * Calculate enemy fire cooldown
 * @param {number} level - Current level
 * @param {string} enemyType - Type of enemy
 * @returns {number} Fire cooldown in seconds
 */
export function calculateEnemyFireCooldown(level, enemyType = 'grunt') {
  if (enemyType === 'elite') {
    return 0.4 + Math.random() * 0.3; // 0.4-0.7s (much faster)
  }
  
  const baseCooldown = level <= 2 ? 2.5 : level <= 4 ? 1.8 : 1.2;
  const randomVariation = level <= 2 ? 1.5 : level <= 4 ? 1.2 : 1.3;
  return baseCooldown + Math.random() * randomVariation;
}

/**
 * Calculate combo score multiplier
 * @param {number} comboCount - Current combo count
 * @returns {number} Score multiplier
 */
export function getComboMultiplier(comboCount) {
  if (comboCount >= 5) return 2;
  if (comboCount >= 3) return 1.5;
  if (comboCount >= 2) return 1.25;
  return 1;
}

/**
 * Get combo display color
 * @param {number} comboCount - Current combo count
 * @returns {string} Hex color
 */
export function getComboColor(comboCount) {
  if (comboCount >= 5) return '#fbbf24'; // Gold
  if (comboCount >= 3) return '#fb923c'; // Orange
  return '#22c55e'; // Green
}

/**
 * Calculate all difficulty settings for a level
 * @param {Object} stageConfig - Stage configuration from waves.json
 * @param {number} level - Current level
 * @param {boolean} inBonusRound - Whether in bonus round
 * @returns {Object} All difficulty settings
 */
export function calculateDifficultySettings(stageConfig, level, inBonusRound = false) {
  return {
    spawnInterval: calculateSpawnInterval(stageConfig.spawnInterval, level, inBonusRound),
    maxEnemies: calculateMaxEnemies(stageConfig.maxEnemies, level, inBonusRound),
    enemySpeed: calculateEnemySpeed(stageConfig.enemySpeed, level, inBonusRound),
    enemyBulletSpeed: calculateEnemyBulletSpeed(stageConfig.enemyBulletSpeed, level),
    levelTarget: getLevelTarget(level),
    difficultyMultiplier: getDifficultyMultiplier(level),
    bonusMultiplier: inBonusRound ? 1.5 : 1
  };
}
