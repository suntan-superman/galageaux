/**
 * @fileoverview Unit tests for difficulty scaling module
 */

import {
  getLevelTarget,
  getDifficultyMultiplier,
  calculateSpawnInterval,
  calculateMaxEnemies,
  calculateEnemySpeed,
  calculateEnemyBulletSpeed,
  calculateDifficultySettings
} from '../../engine/difficulty';

describe('Difficulty System', () => {
  describe('getLevelTarget', () => {
    it('should return correct kill targets for each level', () => {
      // Based on actual implementation:
      // Level 1: 4, Level 2: 6, Level 3: 8, Level 4+: 6 + level * 3
      expect(getLevelTarget(1)).toBe(4);
      expect(getLevelTarget(2)).toBe(6);
      expect(getLevelTarget(3)).toBe(8);
      expect(getLevelTarget(5)).toBe(21); // 6 + 5*3
      expect(getLevelTarget(10)).toBe(36); // 6 + 10*3
    });

    it('should scale linearly after level 3', () => {
      expect(getLevelTarget(4)).toBe(18); // 6 + 4*3
      expect(getLevelTarget(5)).toBe(21); // 6 + 5*3
    });

    it('should handle level 0 gracefully', () => {
      // Level 0 falls through to formula: 6 + 0*3 = 6
      expect(getLevelTarget(0)).toBe(6);
    });
  });

  describe('getDifficultyMultiplier', () => {
    it('should return lower multiplier for early levels', () => {
      expect(getDifficultyMultiplier(1)).toBe(0.6);
      expect(getDifficultyMultiplier(2)).toBe(0.7);
      expect(getDifficultyMultiplier(3)).toBe(0.8);
      expect(getDifficultyMultiplier(4)).toBe(0.9);
    });

    it('should cap at 1.0 for higher levels', () => {
      // Formula caps at min(1.0, 0.9 + (level-4)*0.05)
      expect(getDifficultyMultiplier(5)).toBeCloseTo(0.95, 5);
      expect(getDifficultyMultiplier(6)).toBe(1.0);
      expect(getDifficultyMultiplier(10)).toBe(1.0);
    });

    it('should scale progressively', () => {
      const m1 = getDifficultyMultiplier(1);
      const m3 = getDifficultyMultiplier(3);
      const m5 = getDifficultyMultiplier(5);
      
      expect(m1).toBeLessThan(m3);
      expect(m3).toBeLessThan(m5);
    });
  });

  describe('calculateSpawnInterval', () => {
    it('should decrease spawn interval with higher difficulty', () => {
      // Higher levels have higher difficulty multiplier, which decreases interval
      const interval1 = calculateSpawnInterval(2, 1);
      const interval5 = calculateSpawnInterval(2, 5);
      
      expect(interval5).toBeLessThan(interval1);
    });

    it('should have minimum spawn interval of 0.5', () => {
      const interval = calculateSpawnInterval(0.1, 10);
      expect(interval).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('calculateMaxEnemies', () => {
    it('should allow more enemies at higher levels', () => {
      // Needs baseMax parameter
      const max1 = calculateMaxEnemies(10, 1);
      const max10 = calculateMaxEnemies(10, 10);
      
      expect(max10).toBeGreaterThan(max1);
    });

    it('should return at least 3 enemies', () => {
      const maxEarly = calculateMaxEnemies(10, 1);
      expect(maxEarly).toBeGreaterThanOrEqual(3);
    });
    
    it('should add bonus enemies in bonus round', () => {
      const normal = calculateMaxEnemies(10, 5, false);
      const bonus = calculateMaxEnemies(10, 5, true);
      
      expect(bonus).toBeGreaterThan(normal);
    });
  });

  describe('calculateEnemySpeed', () => {
    it('should increase enemy speed with level', () => {
      const baseSpeed = 100;
      // Function signature: calculateEnemySpeed(baseSpeed, level)
      const speed1 = calculateEnemySpeed(baseSpeed, 1);
      const speed10 = calculateEnemySpeed(baseSpeed, 10);
      
      expect(speed10).toBeGreaterThan(speed1);
    });

    it('should not exceed reasonable max speed', () => {
      const speed = calculateEnemySpeed(100, 10);
      expect(speed).toBeLessThan(300); // Reasonable upper bound
    });
    
    it('should increase speed in bonus round', () => {
      const normalSpeed = calculateEnemySpeed(100, 5, false);
      const bonusSpeed = calculateEnemySpeed(100, 5, true);
      
      expect(bonusSpeed).toBeGreaterThan(normalSpeed);
    });
  });

  describe('calculateDifficultySettings', () => {
    it('should return all required settings', () => {
      const settings = calculateDifficultySettings(5, 2, 100);
      
      expect(settings).toHaveProperty('spawnInterval');
      expect(settings).toHaveProperty('maxEnemies');
      expect(settings).toHaveProperty('enemySpeed');
      expect(settings).toHaveProperty('enemyBulletSpeed');
      expect(settings).toHaveProperty('difficultyMultiplier');
    });

    it('should return consistent values', () => {
      const settings1 = calculateDifficultySettings(5, 2, 100);
      const settings2 = calculateDifficultySettings(5, 2, 100);
      
      expect(settings1).toEqual(settings2);
    });
  });
});
