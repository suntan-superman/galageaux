/**
 * Object Pool Implementation
 * Reuses objects to avoid garbage collection pressure
 * 
 * Each pool maintains a collection of "dead" objects that can be reused
 * instead of allocating new objects each frame.
 * 
 * @module engine/objectPool
 */

/**
 * Creates a new object pool
 * @param {Function} factory - Function to create new objects
 * @param {Function} reset - Function to reset an object for reuse
 * @param {number} [initialSize=50] - Initial pool capacity
 * @returns {Object} Pool interface
 */
export function createPool(factory, reset, initialSize = 50) {
  const pool = [];
  const active = new Set();
  
  // Pre-populate pool
  for (let i = 0; i < initialSize; i++) {
    pool.push(factory());
  }
  
  return {
    /**
     * Get an object from the pool (or create new if empty)
     * @param {...any} args - Arguments to pass to reset function
     * @returns {Object} Pooled or new object
     */
    acquire(...args) {
      let obj;
      if (pool.length > 0) {
        obj = pool.pop();
      } else {
        obj = factory();
      }
      reset(obj, ...args);
      active.add(obj);
      return obj;
    },
    
    /**
     * Return an object to the pool for reuse
     * @param {Object} obj - Object to release
     */
    release(obj) {
      if (active.has(obj)) {
        active.delete(obj);
        pool.push(obj);
      }
    },
    
    /**
     * Release multiple objects at once
     * @param {Object[]} objects - Array of objects to release
     */
    releaseMany(objects) {
      for (const obj of objects) {
        if (active.has(obj)) {
          active.delete(obj);
          pool.push(obj);
        }
      }
    },
    
    /**
     * Get pool statistics
     * @returns {Object} Pool stats
     */
    stats() {
      return {
        available: pool.length,
        active: active.size,
        total: pool.length + active.size
      };
    },
    
    /**
     * Clear all objects from pool
     */
    clear() {
      pool.length = 0;
      active.clear();
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// BULLET POOLS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Factory for player bullet objects
 */
function createBulletObject() {
  return {
    id: 0,
    x: 0,
    y: 0,
    width: 4,
    height: 12,
    speed: 800,
    angle: 0,
    _pooled: true
  };
}

/**
 * Reset a bullet object for reuse
 */
function resetBullet(bullet, x, y, width, height, speed, angle = 0) {
  bullet.id = Date.now() + Math.random();
  bullet.x = x;
  bullet.y = y;
  bullet.width = width;
  bullet.height = height;
  bullet.speed = speed;
  bullet.angle = angle;
  return bullet;
}

/**
 * Factory for enemy bullet objects
 */
function createEnemyBulletObject() {
  return {
    id: 0,
    x: 0,
    y: 0,
    width: 6,
    height: 6,
    speed: 250,
    vx: undefined,
    vy: undefined,
    color: '#f87171',
    _pooled: true
  };
}

/**
 * Reset an enemy bullet object for reuse
 */
function resetEnemyBullet(bullet, x, y, speed, vx, vy, color = '#f87171') {
  bullet.id = Date.now() + Math.random();
  bullet.x = x;
  bullet.y = y;
  bullet.speed = speed;
  bullet.vx = vx;
  bullet.vy = vy;
  bullet.color = color;
  return bullet;
}

// ═══════════════════════════════════════════════════════════════════════
// PARTICLE POOLS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Factory for particle objects
 */
function createParticleObject() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    radius: 0,
    type: 'default',
    color: '#ffffff',
    rotation: 0,
    rotationSpeed: 0,
    _pooled: true
  };
}

/**
 * Reset a particle object for reuse
 */
function resetParticle(particle, x, y, vx, vy, life, radius, type, color) {
  particle.x = x;
  particle.y = y;
  particle.vx = vx;
  particle.vy = vy;
  particle.life = life;
  particle.maxLife = life;
  particle.radius = radius;
  particle.type = type || 'default';
  particle.color = color || '#ffffff';
  particle.rotation = 0;
  particle.rotationSpeed = (Math.random() - 0.5) * 10;
  return particle;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPLOSION POOLS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Factory for explosion objects
 */
function createExplosionObject() {
  return {
    x: 0,
    y: 0,
    radius: 0,
    maxRadius: 0,
    life: 0,
    maxLife: 0,
    color: '#fbbf24',
    _pooled: true
  };
}

/**
 * Reset an explosion object for reuse
 */
function resetExplosion(explosion, x, y, radius, life, color) {
  explosion.x = x;
  explosion.y = y;
  explosion.radius = 0;
  explosion.maxRadius = radius;
  explosion.life = life;
  explosion.maxLife = life;
  explosion.color = color || '#fbbf24';
  return explosion;
}

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL POOL INSTANCES
// ═══════════════════════════════════════════════════════════════════════

/** Player bullet pool */
export const bulletPool = createPool(createBulletObject, resetBullet, 100);

/** Enemy bullet pool */
export const enemyBulletPool = createPool(createEnemyBulletObject, resetEnemyBullet, 150);

/** Particle pool */
export const particlePool = createPool(createParticleObject, resetParticle, 300);

/** Explosion pool */
export const explosionPool = createPool(createExplosionObject, resetExplosion, 30);

// ═══════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get combined stats from all pools
 * @returns {Object} Stats for each pool
 */
export function getAllPoolStats() {
  return {
    bullets: bulletPool.stats(),
    enemyBullets: enemyBulletPool.stats(),
    particles: particlePool.stats(),
    explosions: explosionPool.stats()
  };
}

/**
 * Clear all pools (useful for game reset)
 */
export function clearAllPools() {
  bulletPool.clear();
  enemyBulletPool.clear();
  particlePool.clear();
  explosionPool.clear();
}

/**
 * Release arrays of objects back to their respective pools
 * @param {Object} entities - Object containing arrays to release
 */
export function releaseEntities(entities) {
  if (entities.bullets) {
    bulletPool.releaseMany(entities.bullets.filter(b => b._pooled));
  }
  if (entities.enemyBullets) {
    enemyBulletPool.releaseMany(entities.enemyBullets.filter(b => b._pooled));
  }
  if (entities.particles) {
    particlePool.releaseMany(entities.particles.filter(p => p._pooled));
  }
  if (entities.explosions) {
    explosionPool.releaseMany(entities.explosions.filter(e => e._pooled));
  }
}
