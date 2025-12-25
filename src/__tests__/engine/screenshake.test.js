/**
 * @fileoverview Unit tests for screenshake system
 */

import {
  createScreenshake,
  triggerScreenshake,
  updateScreenshake
} from '../../engine/screenshake';

describe('Screenshake System', () => {
  describe('createScreenshake', () => {
    it('should create screenshake object with default values', () => {
      const shake = createScreenshake();
      
      expect(shake.intensity).toBe(0);
      expect(shake.duration).toBe(0);
      expect(shake.time).toBe(0);
    });
  });

  describe('triggerScreenshake', () => {
    it('should set intensity and duration', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 10, 0.5);
      
      expect(shake.intensity).toBe(10);
      expect(shake.duration).toBe(0.5);
    });

    it('should set time to duration (countdown timer)', () => {
      const shake = createScreenshake();
      shake.time = 0.3;
      triggerScreenshake(shake, 10, 0.5);
      
      // time is set to duration, then counts down
      expect(shake.time).toBe(0.5);
    });

    it('should handle zero intensity', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 0, 0.5);
      
      expect(shake.intensity).toBe(0);
    });
  });

  describe('updateScreenshake', () => {
    it('should return zero offset when not active', () => {
      const shake = createScreenshake();
      const { ox, oy } = updateScreenshake(shake, 0.016);
      
      expect(ox).toBe(0);
      expect(oy).toBe(0);
    });

    it('should return offset when shake is active', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 10, 0.5);
      
      const { ox, oy } = updateScreenshake(shake, 0.016);
      
      // At least one should be non-zero (random offset)
      // Since it's random, we check bounds
      expect(Math.abs(ox)).toBeLessThanOrEqual(10);
      expect(Math.abs(oy)).toBeLessThanOrEqual(10);
    });

    it('should decay shake over time', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 10, 0.5);
      
      // Initial time should be 0.5
      expect(shake.time).toBe(0.5);
      
      // Update multiple times (50 * 0.016 = 0.8s)
      for (let i = 0; i < 50; i++) {
        updateScreenshake(shake, 0.016);
      }
      
      // After ~0.8 seconds, shake time should be <= 0
      expect(shake.time).toBeLessThanOrEqual(0);
    });

    it('should return zero offset after duration expires', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 10, 0.1);
      
      // Update past duration
      for (let i = 0; i < 20; i++) {
        updateScreenshake(shake, 0.016);
      }
      
      const { ox, oy } = updateScreenshake(shake, 0.016);
      expect(ox).toBe(0);
      expect(oy).toBe(0);
    });

    it('should decrement time correctly', () => {
      const shake = createScreenshake();
      triggerScreenshake(shake, 10, 0.5);
      
      const dt = 0.016;
      updateScreenshake(shake, dt);
      
      // time counts down from 0.5
      expect(shake.time).toBeCloseTo(0.5 - dt, 5);
    });
  });
});
