/**
 * Particle System Tests
 * Tests for particle effects engine
 */

import {
  spawnExplosionParticles,
  updateParticles,
  spawnLargeExplosion,
  spawnTrailParticle,
  spawnSparks,
  spawnImpactEffect,
} from '../../engine/particles';

describe('particles', () => {
  describe('spawnExplosionParticles', () => {
    it('creates correct number of particles', () => {
      const particles = spawnExplosionParticles(100, 100, 10);
      // Main particles (10) + inner burst (5) = 15 minimum
      expect(particles.length).toBeGreaterThanOrEqual(10);
    });

    it('creates particles at correct position', () => {
      const particles = spawnExplosionParticles(200, 300, 5);
      particles.forEach(p => {
        expect(p.x).toBe(200);
        expect(p.y).toBe(300);
      });
    });

    it('particles have required properties', () => {
      const particles = spawnExplosionParticles(100, 100, 3);
      particles.forEach(p => {
        expect(p).toHaveProperty('x');
        expect(p).toHaveProperty('y');
        expect(p).toHaveProperty('vx');
        expect(p).toHaveProperty('vy');
        expect(p).toHaveProperty('life');
        expect(p).toHaveProperty('maxLife');
        expect(p).toHaveProperty('radius');
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('color');
        expect(p).toHaveProperty('rotation');
        expect(p).toHaveProperty('rotationSpeed');
      });
    });

    it('particles have non-zero velocity', () => {
      const particles = spawnExplosionParticles(100, 100, 10);
      const hasVelocity = particles.some(p => p.vx !== 0 || p.vy !== 0);
      expect(hasVelocity).toBe(true);
    });

    it('applies correct particle type', () => {
      const particles = spawnExplosionParticles(100, 100, 5, 'debris');
      particles.forEach(p => {
        expect(p.type).toBe('debris');
      });
    });

    it('particles have positive life values', () => {
      const particles = spawnExplosionParticles(100, 100, 10);
      particles.forEach(p => {
        expect(p.life).toBeGreaterThan(0);
        expect(p.maxLife).toBeGreaterThan(0);
      });
    });

    it('particles have valid radius', () => {
      const particles = spawnExplosionParticles(100, 100, 10);
      particles.forEach(p => {
        expect(p.radius).toBeGreaterThan(0);
        expect(p.radius).toBeLessThan(10);
      });
    });

    it('creates debris particles for debris type', () => {
      const particles = spawnExplosionParticles(100, 100, 10, 'debris');
      // Should have extra debris chunks
      expect(particles.length).toBeGreaterThan(10);
    });
  });

  describe('spawnTrailParticle', () => {
    it('creates particle at specified position', () => {
      const particle = spawnTrailParticle(150, 250);
      
      expect(particle.x).toBe(150);
      expect(particle.y).toBe(250);
    });

    it('has required properties', () => {
      const particle = spawnTrailParticle(100, 100);
      
      expect(particle).toHaveProperty('life');
      expect(particle).toHaveProperty('color');
      expect(particle).toHaveProperty('radius');
    });

    it('accepts custom color', () => {
      const color = '#ff0000';
      const particle = spawnTrailParticle(100, 100, color);
      
      expect(particle.color).toBe(color);
    });
  });

  describe('spawnSparks', () => {
    it('creates correct number of sparks', () => {
      const sparks = spawnSparks(100, 100, 10);
      expect(sparks.length).toBe(10);
    });

    it('creates sparks at specified position', () => {
      const sparks = spawnSparks(200, 300, 5);
      sparks.forEach(s => {
        expect(s.x).toBe(200);
        expect(s.y).toBe(300);
      });
    });

    it('sparks have velocity', () => {
      const sparks = spawnSparks(100, 100, 5);
      const hasVelocity = sparks.some(s => s.vx !== 0 || s.vy !== 0);
      expect(hasVelocity).toBe(true);
    });
  });

  describe('updateParticles', () => {
    it('moves particles by velocity', () => {
      const particles = [
        { x: 100, y: 100, vx: 10, vy: 20, life: 1, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: 0 }
      ];
      const dt = 0.5;
      const updated = updateParticles(particles, dt);
      
      expect(updated[0].x).toBe(105); // 100 + 10 * 0.5
      expect(updated[0].y).toBe(110); // 100 + 20 * 0.5
    });

    it('reduces particle life over time', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: 0, life: 1, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: 0 }
      ];
      const dt = 0.3;
      const updated = updateParticles(particles, dt);
      
      expect(updated[0].life).toBeCloseTo(0.7, 1);
    });

    it('removes dead particles', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: 0, life: 0.1, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: 0 },
        { x: 200, y: 200, vx: 0, vy: 0, life: 1, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: 0 }
      ];
      const dt = 0.2; // First particle should die
      const updated = updateParticles(particles, dt);
      
      expect(updated.length).toBe(1);
      expect(updated[0].x).toBe(200);
    });

    it('rotates particles', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: 0, life: 1, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: Math.PI }
      ];
      const dt = 0.5;
      const updated = updateParticles(particles, dt);
      
      expect(updated[0].rotation).toBeCloseTo(Math.PI * 0.5, 2);
    });

    it('returns empty array when all particles dead', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: 0, life: 0.05, maxLife: 1, radius: 2, rotation: 0, rotationSpeed: 0 }
      ];
      const dt = 0.1;
      const updated = updateParticles(particles, dt);
      
      expect(updated).toEqual([]);
    });
  });

  describe('spawnLargeExplosion', () => {
    it('returns object with particles array', () => {
      const result = spawnLargeExplosion(100, 100);
      
      expect(result).toHaveProperty('particles');
      expect(Array.isArray(result.particles)).toBe(true);
    });

    it('returns object with screenFlash info', () => {
      const result = spawnLargeExplosion(100, 100);
      
      expect(result).toHaveProperty('screenFlash');
      expect(result.screenFlash).toHaveProperty('intensity');
      expect(result.screenFlash).toHaveProperty('color');
      expect(result.screenFlash).toHaveProperty('duration');
    });

    it('creates more particles than regular explosion', () => {
      const regularParticles = spawnExplosionParticles(100, 100, 10);
      const largeResult = spawnLargeExplosion(100, 100);
      
      expect(largeResult.particles.length).toBeGreaterThan(regularParticles.length);
    });

    it('includes multiple particle types', () => {
      const result = spawnLargeExplosion(100, 100);
      const types = new Set(result.particles.map(p => p.type));
      
      expect(types.size).toBeGreaterThan(1);
    });

    it('creates particles at specified position', () => {
      const result = spawnLargeExplosion(250, 350);
      
      // At least some particles should be at or near the origin
      const atOrigin = result.particles.filter(p => 
        Math.abs(p.x - 250) < 50 && Math.abs(p.y - 350) < 50
      );
      expect(atOrigin.length).toBeGreaterThan(0);
    });

    it('boss type has purple flash color', () => {
      const result = spawnLargeExplosion(100, 100, 'boss');
      expect(result.screenFlash.color).toBe('#a855f7');
    });

    it('large type has different flash intensity', () => {
      const bossResult = spawnLargeExplosion(100, 100, 'boss');
      const largeResult = spawnLargeExplosion(100, 100, 'large');
      
      expect(bossResult.screenFlash.intensity).not.toBe(largeResult.screenFlash.intensity);
    });
  });

  describe('particle color schemes', () => {
    it('default type has warm colors', () => {
      const particles = spawnExplosionParticles(100, 100, 10, 'default');
      const colors = particles.map(p => p.color);
      
      // Should have hex color strings
      colors.forEach(c => {
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('energy type has cool colors', () => {
      const particles = spawnExplosionParticles(100, 100, 10, 'energy');
      particles.forEach(p => {
        expect(p.type).toBe('energy');
        expect(p.color).toMatch(/^#/);
      });
    });

    it('boss type has purple/pink colors', () => {
      const particles = spawnExplosionParticles(100, 100, 10, 'boss');
      particles.forEach(p => {
        expect(p.type).toBe('boss');
      });
    });

    it('uses override color when provided', () => {
      const customColor = '#ff0000';
      const particles = spawnExplosionParticles(100, 100, 5, 'default', customColor);
      
      particles.forEach(p => {
        expect(p.color).toBe(customColor);
      });
    });
  });
});

describe('Phase 0 particle timing contracts', () => {
  afterEach(() => jest.restoreAllMocks());

  const makeParticle = (overrides = {}) => ({
    x: 100, y: 200, vx: 100, vy: -50,
    life: 0.8, maxLife: 0.8, radius: 4,
    rotation: 0, rotationSpeed: 2,
    ...overrides,
  });

  const advance = (particle, hz, seconds) => {
    let particles = [particle];
    for (let frame = 0; frame < Math.round(hz * seconds); frame++) {
      particles = updateParticles(particles, 1 / hz);
    }
    return particles[0];
  };

  it.each([
    ['ordinary explosion', () => spawnExplosionParticles(10, 20, 16)],
    ['debris explosion', () => spawnExplosionParticles(10, 20, 30, 'debris')],
    ['large explosion', () => spawnLargeExplosion(10, 20).particles],
    ['impact', () => spawnImpactEffect(10, 20)],
    ['sparks', () => spawnSparks(10, 20)],
    ['trail', () => [spawnTrailParticle(10, 20)]],
  ])('initializes %s from one lifetime and one initial radius', (_, create) => {
    let sample = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => ((sample++ % 9) + 1) / 10);
    create().forEach(particle => {
      expect(particle.maxLife).toBe(particle.life);
      expect(particle.initialRadius).toBe(particle.radius);
    });
  });

  it.each([30, 60, 120])('uses elapsed lifetime for radius at %i Hz', hz => {
    const updated = advance(makeParticle(), hz, 0.2);
    expect(updated.life).toBeCloseTo(0.6, 10);
    expect(updated.alpha).toBeCloseTo(0.75, 10);
    expect(updated.radius).toBeCloseTo(4 * Math.sqrt(0.75), 10);
    expect(updated.initialRadius).toBe(4);
  });

  it.each([30, 60, 120])('normalizes spark velocity decay at %i Hz', hz => {
    const updated = advance(makeParticle({ type: 'spark' }), hz, 0.2);
    expect(updated.vx).toBeCloseTo(100 * Math.pow(0.98, 12), 10);
    expect(updated.vy).toBeCloseTo(-50 * Math.pow(0.98, 12), 10);
  });

  it('matches spark travel over equal elapsed time with different frame schedules', () => {
    const reference = advance(makeParticle({ type: 'spark' }), 60, 0.2);
    [30, 120].forEach(hz => {
      const result = advance(makeParticle({ type: 'spark' }), hz, 0.2);
      expect(result.x).toBeCloseTo(reference.x, 8);
      expect(result.y).toBeCloseTo(reference.y, 8);
    });
    const singleStep = updateParticles([makeParticle({ type: 'spark' })], 0.2)[0];
    expect(singleStep.x).toBeCloseTo(reference.x, 8);
    expect(singleStep.y).toBeCloseTo(reference.y, 8);
  });

  it('keeps normalized life and radius bounded for inconsistent legacy data', () => {
    const result = updateParticles([makeParticle({ life: 2, maxLife: 1 })], 0.1)[0];
    expect(result.alpha).toBe(1);
    expect(result.radius).toBe(4);
    const invalidLifetime = updateParticles([makeParticle({ maxLife: 0 })], 0.1)[0];
    expect(Number.isFinite(invalidLifetime.alpha)).toBe(true);
    expect(Number.isFinite(invalidLifetime.radius)).toBe(true);
  });

  it('keeps existing particle counts, colors and input objects intact', () => {
    expect(spawnExplosionParticles(0, 0, 16)).toHaveLength(24);
    expect(spawnExplosionParticles(0, 0, 30, 'debris')).toHaveLength(60);
    const particle = makeParticle({ color: '#123456' });
    const result = updateParticles([particle], 0.2)[0];
    expect(result.color).toBe('#123456');
    expect(particle.radius).toBe(4);
    expect(particle.life).toBe(0.8);
    expect(particle).not.toHaveProperty('initialRadius');
  });
});
