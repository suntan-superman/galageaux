/**
 * @fileoverview Unit tests for entity limit enforcement
 */

import {
  enforceLimit,
  limitParticles,
  limitExplosions,
  limitPlayerBullets,
  limitEnemyBullets,
  limitEnemies,
  limitPowerups,
  limitScoreTexts,
  applyAllLimits,
  getLimits
} from '../../engine/entityLimits';
import { GAMEPLAY } from '../../constants/game';

describe('Entity Limits', () => {
  describe('enforceLimit', () => {
    it('should return same array if under limit', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = enforceLimit(arr, 10);
      
      expect(result).toBe(arr);
      expect(result.length).toBe(5);
    });

    it('should return same array if at limit', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = enforceLimit(arr, 5);
      
      expect(result).toBe(arr);
    });

    it('should remove oldest items when over limit', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = enforceLimit(arr, 5);
      
      expect(result.length).toBe(5);
      expect(result).toEqual([6, 7, 8, 9, 10]);
    });

    it('should handle empty array', () => {
      const result = enforceLimit([], 10);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined', () => {
      expect(enforceLimit(null, 10)).toBeNull();
      expect(enforceLimit(undefined, 10)).toBeUndefined();
    });

    it('should handle limit of 0', () => {
      const arr = [1, 2, 3];
      const result = enforceLimit(arr, 0);
      
      expect(result).toEqual([]);
    });

    it('should handle limit of 1', () => {
      const arr = [1, 2, 3];
      const result = enforceLimit(arr, 1);
      
      expect(result).toEqual([3]); // Keep newest
    });
  });

  describe('limitParticles', () => {
    it('should enforce MAX_PARTICLES limit', () => {
      const particles = Array.from({ length: GAMEPLAY.MAX_PARTICLES + 100 }, (_, i) => ({ id: i }));
      const result = limitParticles(particles);
      
      expect(result.length).toBe(GAMEPLAY.MAX_PARTICLES);
    });

    it('should keep newest particles', () => {
      const limit = GAMEPLAY.MAX_PARTICLES;
      const particles = Array.from({ length: limit + 10 }, (_, i) => ({ id: i }));
      const result = limitParticles(particles);
      
      // Should have kept the last MAX_PARTICLES items
      expect(result[0].id).toBe(10);
      expect(result[result.length - 1].id).toBe(limit + 9);
    });
  });

  describe('limitExplosions', () => {
    it('should enforce MAX_EXPLOSIONS limit', () => {
      const explosions = Array.from({ length: GAMEPLAY.MAX_EXPLOSIONS + 50 }, (_, i) => ({ id: i }));
      const result = limitExplosions(explosions);
      
      expect(result.length).toBe(GAMEPLAY.MAX_EXPLOSIONS);
    });
  });

  describe('limitPlayerBullets', () => {
    it('should enforce MAX_PLAYER_BULLETS limit', () => {
      const bullets = Array.from({ length: GAMEPLAY.MAX_PLAYER_BULLETS + 50 }, (_, i) => ({ id: i }));
      const result = limitPlayerBullets(bullets);
      
      expect(result.length).toBe(GAMEPLAY.MAX_PLAYER_BULLETS);
    });
  });

  describe('limitEnemyBullets', () => {
    it('should enforce MAX_ENEMY_BULLETS limit', () => {
      const bullets = Array.from({ length: GAMEPLAY.MAX_ENEMY_BULLETS + 50 }, (_, i) => ({ id: i }));
      const result = limitEnemyBullets(bullets);
      
      expect(result.length).toBe(GAMEPLAY.MAX_ENEMY_BULLETS);
    });
  });

  describe('limitEnemies', () => {
    it('should enforce MAX_ENEMIES limit', () => {
      const enemies = Array.from({ length: GAMEPLAY.MAX_ENEMIES + 20 }, (_, i) => ({ id: i }));
      const result = limitEnemies(enemies);
      
      expect(result.length).toBe(GAMEPLAY.MAX_ENEMIES);
    });
  });

  describe('applyAllLimits', () => {
    it('should limit all entity types', () => {
      const entities = {
        particles: Array.from({ length: 500 }, (_, i) => ({ id: i })),
        explosions: Array.from({ length: 50 }, (_, i) => ({ id: i })),
        bullets: Array.from({ length: 200 }, (_, i) => ({ id: i })),
        enemyBullets: Array.from({ length: 300 }, (_, i) => ({ id: i })),
        enemies: Array.from({ length: 100 }, (_, i) => ({ id: i })),
        powerups: Array.from({ length: 20 }, (_, i) => ({ id: i })),
        scoreTexts: Array.from({ length: 50 }, (_, i) => ({ id: i }))
      };

      const result = applyAllLimits(entities);

      expect(result.particles.length).toBeLessThanOrEqual(GAMEPLAY.MAX_PARTICLES);
      expect(result.explosions.length).toBeLessThanOrEqual(GAMEPLAY.MAX_EXPLOSIONS);
      expect(result.bullets.length).toBeLessThanOrEqual(GAMEPLAY.MAX_PLAYER_BULLETS);
      expect(result.enemyBullets.length).toBeLessThanOrEqual(GAMEPLAY.MAX_ENEMY_BULLETS);
      expect(result.enemies.length).toBeLessThanOrEqual(GAMEPLAY.MAX_ENEMIES);
      expect(result.powerups.length).toBeLessThanOrEqual(GAMEPLAY.MAX_POWERUPS);
      expect(result.scoreTexts.length).toBeLessThanOrEqual(GAMEPLAY.MAX_SCORE_TEXTS);
    });

    it('should handle empty entities', () => {
      const result = applyAllLimits({});
      
      expect(result.particles).toEqual([]);
      expect(result.explosions).toEqual([]);
      expect(result.bullets).toEqual([]);
    });
  });

  describe('getLimits', () => {
    it('should return all limit values', () => {
      const limits = getLimits();
      
      expect(limits.particles).toBe(GAMEPLAY.MAX_PARTICLES);
      expect(limits.explosions).toBe(GAMEPLAY.MAX_EXPLOSIONS);
      expect(limits.playerBullets).toBe(GAMEPLAY.MAX_PLAYER_BULLETS);
      expect(limits.enemyBullets).toBe(GAMEPLAY.MAX_ENEMY_BULLETS);
      expect(limits.enemies).toBe(GAMEPLAY.MAX_ENEMIES);
      expect(limits.powerups).toBe(GAMEPLAY.MAX_POWERUPS);
      expect(limits.scoreTexts).toBe(GAMEPLAY.MAX_SCORE_TEXTS);
    });
  });
});
