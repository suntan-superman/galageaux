/**
 * @fileoverview Unit tests for collision detection module
 */

import { aabb, circleCollision, pointInRect } from '../../engine/collision';

describe('Collision Detection', () => {
  describe('aabb (Axis-Aligned Bounding Box)', () => {
    it('should detect collision when boxes overlap', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 };
      const rect2 = { x: 5, y: 5, width: 10, height: 10 };
      
      expect(aabb(rect1, rect2)).toBe(true);
    });

    it('should not detect collision when boxes are separate', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 };
      const rect2 = { x: 20, y: 20, width: 10, height: 10 };
      
      expect(aabb(rect1, rect2)).toBe(false);
    });

    it('should detect collision when boxes touch at edge', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 };
      const rect2 = { x: 10, y: 0, width: 10, height: 10 };
      
      // Edge touching IS a collision in this implementation (uses < not <=)
      expect(aabb(rect1, rect2)).toBe(true);
    });

    it('should detect collision when one box contains another', () => {
      const outer = { x: 0, y: 0, width: 100, height: 100 };
      const inner = { x: 25, y: 25, width: 10, height: 10 };
      
      expect(aabb(outer, inner)).toBe(true);
      expect(aabb(inner, outer)).toBe(true);
    });

    it('should handle zero-size boxes', () => {
      const rect1 = { x: 5, y: 5, width: 0, height: 0 };
      const rect2 = { x: 0, y: 0, width: 10, height: 10 };
      
      // A point inside a rect should collide
      expect(aabb(rect1, rect2)).toBe(true);
    });

    it('should handle negative positions', () => {
      const rect1 = { x: -10, y: -10, width: 20, height: 20 };
      const rect2 = { x: 5, y: 5, width: 10, height: 10 };
      
      expect(aabb(rect1, rect2)).toBe(true);
    });
  });
});
