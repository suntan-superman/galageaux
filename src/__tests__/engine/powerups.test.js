/**
 * @fileoverview Unit tests for powerup system
 */

import {
  POWERUP_TYPES,
  createPowerup,
  updatePowerup,
  applyPowerupEffect
} from '../../engine/powerups';

describe('Powerup System', () => {
  describe('POWERUP_TYPES', () => {
    it('should define all expected powerup types', () => {
      expect(POWERUP_TYPES.SPREAD_SHOT).toBeDefined();
      expect(POWERUP_TYPES.DOUBLE_SHOT).toBeDefined();
      expect(POWERUP_TYPES.TRIPLE_SHOT).toBeDefined();
      expect(POWERUP_TYPES.RAPID_FIRE).toBeDefined();
    });
  });

  describe('createPowerup', () => {
    it('should create a powerup with correct position', () => {
      const powerup = createPowerup(100, 200, POWERUP_TYPES.SPREAD_SHOT);
      
      expect(powerup.x).toBe(100);
      expect(powerup.y).toBe(200);
    });

    it('should create a powerup with correct type', () => {
      const powerup = createPowerup(0, 0, POWERUP_TYPES.RAPID_FIRE);
      
      expect(powerup.kind).toBe(POWERUP_TYPES.RAPID_FIRE);
    });

    it('should set correct size (hardcoded to 20)', () => {
      const powerup = createPowerup(0, 0, POWERUP_TYPES.SPREAD_SHOT);
      
      expect(powerup.size).toBe(20);
    });

    it('should create random powerup type when kind is null', () => {
      const p1 = createPowerup(0, 0, null);
      
      expect(Object.values(POWERUP_TYPES)).toContain(p1.kind);
    });
    
    it('should have speed and rotation properties', () => {
      const powerup = createPowerup(0, 0, POWERUP_TYPES.SPREAD_SHOT);
      
      expect(powerup.speed).toBe(70);
      expect(powerup.rotation).toBe(0);
      expect(powerup.collected).toBe(false);
    });
  });

  describe('updatePowerup', () => {
    it('should move powerup downward', () => {
      const powerup = createPowerup(100, 100, POWERUP_TYPES.SPREAD_SHOT);
      const updated = updatePowerup(powerup, 0.1);
      
      expect(updated.y).toBeGreaterThan(powerup.y);
    });

    it('should update rotation animation', () => {
      const powerup = createPowerup(100, 100, POWERUP_TYPES.SPREAD_SHOT);
      const updated = updatePowerup(powerup, 0.1);
      
      expect(updated.rotation).toBeGreaterThan(powerup.rotation);
    });

    it('should preserve powerup properties', () => {
      const powerup = createPowerup(100, 100, POWERUP_TYPES.DOUBLE_SHOT);
      const updated = updatePowerup(powerup, 0.1);
      
      expect(updated.kind).toBe(POWERUP_TYPES.DOUBLE_SHOT);
      expect(updated.x).toBe(100);
      expect(updated.size).toBe(20);
    });
  });

  describe('applyPowerupEffect', () => {
    const basePlayer = {
      weaponLevel: 1,
      weaponType: null,
      rapidFire: false,
      fireCooldown: 0.22,
      shield: false
    };

    it('should upgrade weapon level for weapon powerups', () => {
      const updated = applyPowerupEffect({ ...basePlayer }, POWERUP_TYPES.SPREAD_SHOT);
      
      expect(updated.weaponLevel).toBeGreaterThan(basePlayer.weaponLevel);
    });

    it('should enable rapid fire for RAPID_FIRE powerup', () => {
      const updated = applyPowerupEffect({ ...basePlayer }, POWERUP_TYPES.RAPID_FIRE);
      
      expect(updated.rapidFire).toBe(true);
      expect(updated.fireCooldown).toBeLessThan(basePlayer.fireCooldown);
    });

    it('should set weapon type correctly', () => {
      const spreadPlayer = applyPowerupEffect({ ...basePlayer }, POWERUP_TYPES.SPREAD_SHOT);
      expect(spreadPlayer.weaponType).toBe(POWERUP_TYPES.SPREAD_SHOT);

      const doublePlayer = applyPowerupEffect({ ...basePlayer }, POWERUP_TYPES.DOUBLE_SHOT);
      expect(doublePlayer.weaponType).toBe(POWERUP_TYPES.DOUBLE_SHOT);
    });

    it('should not exceed max weapon level', () => {
      const maxLevelPlayer = { ...basePlayer, weaponLevel: 5 };
      const updated = applyPowerupEffect(maxLevelPlayer, POWERUP_TYPES.SPREAD_SHOT);
      
      expect(updated.weaponLevel).toBeLessThanOrEqual(5);
    });
  });
});
