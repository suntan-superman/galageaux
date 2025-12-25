/**
 * @fileoverview Unit tests for object pooling system
 */

import {
  createPool,
  bulletPool,
  enemyBulletPool,
  particlePool,
  explosionPool,
  getAllPoolStats,
  clearAllPools,
  releaseEntities
} from '../../engine/objectPool';

describe('Object Pool', () => {
  describe('createPool', () => {
    it('should create pool with initial objects', () => {
      const factory = () => ({ value: 0 });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 10);
      
      const stats = pool.stats();
      expect(stats.available).toBe(10);
      expect(stats.active).toBe(0);
    });

    it('should acquire objects from pool', () => {
      const factory = () => ({ value: 0 });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 5);
      
      const obj = pool.acquire(42);
      
      expect(obj.value).toBe(42);
      expect(pool.stats().available).toBe(4);
      expect(pool.stats().active).toBe(1);
    });

    it('should release objects back to pool', () => {
      const factory = () => ({ value: 0 });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 5);
      
      const obj = pool.acquire(42);
      pool.release(obj);
      
      expect(pool.stats().available).toBe(5);
      expect(pool.stats().active).toBe(0);
    });

    it('should reuse released objects', () => {
      const factory = () => ({ id: Math.random() });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 1);
      
      const obj1 = pool.acquire(1);
      const id1 = obj1.id;
      pool.release(obj1);
      
      const obj2 = pool.acquire(2);
      
      expect(obj2.id).toBe(id1); // Same object reused
      expect(obj2.value).toBe(2); // But reset with new value
    });

    it('should create new objects when pool is empty', () => {
      const factory = () => ({ id: Math.random() });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 0);
      
      const obj = pool.acquire(42);
      
      expect(obj).toBeDefined();
      expect(obj.value).toBe(42);
    });

    it('should release many objects at once', () => {
      const factory = () => ({ value: 0 });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 10);
      
      const objects = [
        pool.acquire(1),
        pool.acquire(2),
        pool.acquire(3)
      ];
      
      expect(pool.stats().active).toBe(3);
      
      pool.releaseMany(objects);
      
      expect(pool.stats().active).toBe(0);
      expect(pool.stats().available).toBe(10);
    });

    it('should clear all objects', () => {
      const factory = () => ({ value: 0 });
      const reset = (obj, val) => { obj.value = val; return obj; };
      const pool = createPool(factory, reset, 10);
      
      pool.acquire(1);
      pool.acquire(2);
      pool.clear();
      
      expect(pool.stats().available).toBe(0);
      expect(pool.stats().active).toBe(0);
    });
  });

  describe('Global Pools', () => {
    beforeEach(() => {
      clearAllPools();
    });

    describe('bulletPool', () => {
      it('should acquire bullet with correct properties', () => {
        const bullet = bulletPool.acquire(100, 200, 4, 12, 800, 0);
        
        expect(bullet.x).toBe(100);
        expect(bullet.y).toBe(200);
        expect(bullet.width).toBe(4);
        expect(bullet.height).toBe(12);
        expect(bullet.speed).toBe(800);
        expect(bullet._pooled).toBe(true);
      });
    });

    describe('enemyBulletPool', () => {
      it('should acquire enemy bullet with correct properties', () => {
        const bullet = enemyBulletPool.acquire(50, 100, 250, 0, 1, '#f87171');
        
        expect(bullet.x).toBe(50);
        expect(bullet.y).toBe(100);
        expect(bullet.speed).toBe(250);
        expect(bullet.vx).toBe(0);
        expect(bullet.vy).toBe(1);
        expect(bullet.color).toBe('#f87171');
      });
    });

    describe('particlePool', () => {
      it('should acquire particle with correct properties', () => {
        const particle = particlePool.acquire(
          100, 200, // x, y
          10, -20,  // vx, vy
          1.0,      // life
          3,        // radius
          'energy', // type
          '#38bdf8' // color
        );
        
        expect(particle.x).toBe(100);
        expect(particle.y).toBe(200);
        expect(particle.vx).toBe(10);
        expect(particle.vy).toBe(-20);
        expect(particle.life).toBe(1.0);
        expect(particle.maxLife).toBe(1.0);
        expect(particle.radius).toBe(3);
        expect(particle.type).toBe('energy');
        expect(particle.color).toBe('#38bdf8');
      });
    });

    describe('explosionPool', () => {
      it('should acquire explosion with correct properties', () => {
        const explosion = explosionPool.acquire(150, 250, 30, 0.5, '#fbbf24');
        
        expect(explosion.x).toBe(150);
        expect(explosion.y).toBe(250);
        expect(explosion.radius).toBe(0); // Starts at 0
        expect(explosion.maxRadius).toBe(30);
        expect(explosion.life).toBe(0.5);
        expect(explosion.maxLife).toBe(0.5);
        expect(explosion.color).toBe('#fbbf24');
      });
    });
  });

  describe('getAllPoolStats', () => {
    beforeEach(() => {
      clearAllPools();
    });

    it('should return stats for all pools', () => {
      const stats = getAllPoolStats();
      
      expect(stats).toHaveProperty('bullets');
      expect(stats).toHaveProperty('enemyBullets');
      expect(stats).toHaveProperty('particles');
      expect(stats).toHaveProperty('explosions');
    });
  });

  describe('releaseEntities', () => {
    beforeEach(() => {
      clearAllPools();
    });

    it('should release pooled entities back to their pools', () => {
      const bullet = bulletPool.acquire(0, 0, 4, 12, 800, 0);
      const particle = particlePool.acquire(0, 0, 0, 0, 1, 3, 'default', '#fff');
      
      releaseEntities({
        bullets: [bullet],
        particles: [particle]
      });
      
      // Objects should be back in pools
      expect(bulletPool.stats().active).toBe(0);
      expect(particlePool.stats().active).toBe(0);
    });

    it('should not release non-pooled entities', () => {
      const regularBullet = { x: 0, y: 0, _pooled: false };
      
      releaseEntities({
        bullets: [regularBullet]
      });
      
      // Should not throw and should handle gracefully
      expect(bulletPool.stats().active).toBe(0);
    });
  });
});
