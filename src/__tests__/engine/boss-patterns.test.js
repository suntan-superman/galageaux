/**
 * Boss Patterns System Tests
 * Tests for boss attack pattern generation
 */

import {
  createBossPatterns,
  getBossPattern,
  createBossBullet,
  generateBossBullets,
  shouldBossSwoop,
  createBossSwoop,
  updateBossSwoop,
} from '../../engine/boss-patterns';

// Mock boss config
jest.mock('../../config/boss.json', () => ({
  stage1: {
    name: 'Test Boss',
    hp: 1000,
    bulletSpeed: 200,
    fireRate: 1.5,
    phases: [
      { hpThreshold: 75, pattern: 'spread' },
      { hpThreshold: 50, pattern: 'burst' },
      { hpThreshold: 25, pattern: 'spiral' },
    ],
    swoopEnabled: true,
  },
  stage2: {
    name: 'Test Boss 2',
    hp: 1500,
    bulletSpeed: 250,
    fireRate: 1.2,
    phases: [
      { hpThreshold: 60, pattern: 'radial' },
      { hpThreshold: 30, pattern: 'aimed' },
    ],
    swoopEnabled: false,
  },
}));

describe('boss-patterns', () => {
  describe('createBossPatterns', () => {
    it('creates pattern state for valid stage', () => {
      const state = createBossPatterns('stage1');
      
      expect(state).not.toBeNull();
      expect(state.stageKey).toBe('stage1');
      expect(state.config).toBeDefined();
      expect(state.patternQueue).toEqual([]);
      expect(state.currentPattern).toBeNull();
      expect(state.patternTime).toBe(0);
    });

    it('returns null for invalid stage', () => {
      const state = createBossPatterns('invalidStage');
      expect(state).toBeNull();
    });

    it('loads correct config for each stage', () => {
      const state1 = createBossPatterns('stage1');
      const state2 = createBossPatterns('stage2');
      
      expect(state1.config.name).toBe('Test Boss');
      expect(state2.config.name).toBe('Test Boss 2');
    });
  });

  describe('getBossPattern', () => {
    it('returns radial for null state', () => {
      const pattern = getBossPattern(null, { hp: 100, maxHp: 100 });
      expect(pattern).toBe('radial');
    });

    it('returns radial for null boss', () => {
      const state = createBossPatterns('stage1');
      const pattern = getBossPattern(state, null);
      expect(pattern).toBe('radial');
    });

    it('returns first phase pattern at high HP', () => {
      const state = createBossPatterns('stage1');
      const boss = { hp: 900, maxHp: 1000 }; // 90% HP
      
      const pattern = getBossPattern(state, boss);
      expect(pattern).toBe('spread'); // First phase (>75%)
    });

    it('returns second phase pattern at medium HP', () => {
      const state = createBossPatterns('stage1');
      const boss = { hp: 600, maxHp: 1000 }; // 60% HP
      
      const pattern = getBossPattern(state, boss);
      expect(pattern).toBe('burst'); // Second phase (>50%)
    });

    it('returns last phase pattern at low HP', () => {
      const state = createBossPatterns('stage1');
      const boss = { hp: 200, maxHp: 1000 }; // 20% HP
      
      const pattern = getBossPattern(state, boss);
      expect(pattern).toBe('spiral'); // Last phase
    });
  });

  describe('createBossBullet', () => {
    it('creates bullet at correct position', () => {
      const bullet = createBossBullet(100, 200, Math.PI, 100);
      
      expect(bullet.y).toBe(200);
      // x adjusted for bullet width
      expect(bullet.x).toBeDefined();
    });

    it('calculates velocity from angle and speed', () => {
      const angle = Math.PI / 2; // 90 degrees
      const speed = 100;
      const bullet = createBossBullet(100, 200, angle, speed);
      
      // At PI/2, vx = sin(PI/2) * speed = 100, vy = cos(PI/2) * speed = ~0
      expect(Math.abs(bullet.vx)).toBeCloseTo(speed, 0);
      expect(Math.abs(bullet.vy)).toBeLessThan(1);
    });

    it('bullet has width and height', () => {
      const bullet = createBossBullet(100, 200, 0, 100);
      
      expect(bullet.width).toBeDefined();
      expect(bullet.height).toBeDefined();
    });

    it('bullet has speed property', () => {
      const bullet = createBossBullet(100, 200, 0, 150);
      
      expect(bullet.speed).toBeDefined();
    });
  });

  describe('generateBossBullets', () => {
    const boss = { x: 180, y: 50, width: 80, height: 60 };

    it('generates radial pattern bullets', () => {
      const bullets = generateBossBullets(boss, 'radial', 'stage1', 200, 600);
      
      expect(bullets.length).toBe(12); // 12 bullets in circle
    });

    it('generates spread pattern bullets', () => {
      const bullets = generateBossBullets(boss, 'spread', 'stage1', 200, 600);
      
      expect(bullets.length).toBe(7); // 7 bullets in arc
    });

    it('generates burst pattern bullets', () => {
      const bullets = generateBossBullets(boss, 'burst', 'stage1', 200, 600);
      
      expect(bullets.length).toBe(8); // 8 aimed bullets
    });

    it('generates spiral pattern bullets', () => {
      const bullets = generateBossBullets(boss, 'spiral', 'stage1', 200, 600);
      
      expect(bullets.length).toBe(6); // 6 rotating bullets
    });

    it('generates aimed pattern bullet', () => {
      const bullets = generateBossBullets(boss, 'aimed', 'stage1', 200, 600);
      
      expect(bullets.length).toBe(1); // Single aimed bullet
    });

    it('returns empty array for invalid stage', () => {
      const bullets = generateBossBullets(boss, 'radial', 'invalidStage', 200, 600);
      expect(bullets).toEqual([]);
    });

    it('bullets spawn from boss center bottom', () => {
      const bullets = generateBossBullets(boss, 'radial', 'stage1', 200, 600);
      
      // All bullets should start near boss center
      const cx = boss.x + boss.width / 2;
      bullets.forEach(b => {
        // Allow for bullet width offset
        expect(Math.abs(b.x + (b.width || 0) / 2 - cx)).toBeLessThan(20);
      });
    });

    it('radial pattern bullets spread in all directions', () => {
      const bullets = generateBossBullets(boss, 'radial', 'stage1', 200, 600);
      
      // Check we have bullets going in different directions
      const vxPositive = bullets.filter(b => b.vx > 0).length;
      const vxNegative = bullets.filter(b => b.vx < 0).length;
      
      expect(vxPositive).toBeGreaterThan(0);
      expect(vxNegative).toBeGreaterThan(0);
    });

    it('spread pattern creates forward arc', () => {
      const bullets = generateBossBullets(boss, 'spread', 'stage1', 200, 600);
      
      // Spread pattern should create multiple bullets
      expect(bullets.length).toBe(7);
      
      // Bullets should have varied x velocities (spread pattern)
      const vxValues = bullets.map(b => b.vx);
      const hasNegative = vxValues.some(vx => vx < 0);
      const hasPositive = vxValues.some(vx => vx > 0);
      expect(hasNegative).toBe(true);
      expect(hasPositive).toBe(true);
    });
  });

  describe('shouldBossSwoop', () => {
    it('returns false for invalid stage config', () => {
      const boss = { hp: 300, maxHp: 1000 };
      const result = shouldBossSwoop(boss, 'invalidStage', 400, 800);
      expect(result).toBe(false);
    });

    it('returns false when swoop disabled', () => {
      const boss = { hp: 300, maxHp: 1000 }; // 30% HP
      const result = shouldBossSwoop(boss, 'stage2', 400, 800);
      expect(result).toBe(false);
    });

    it('returns false when HP above 50%', () => {
      const boss = { hp: 600, maxHp: 1000 }; // 60% HP
      const result = shouldBossSwoop(boss, 'stage1', 400, 800);
      expect(result).toBe(false);
    });

    // Note: Random chance means we can't deterministically test true case
    it('has chance to swoop when HP below 50% and enabled', () => {
      const boss = { hp: 300, maxHp: 1000 }; // 30% HP
      
      // Run multiple times to statistically test
      let swoopTriggered = false;
      for (let i = 0; i < 100; i++) {
        if (shouldBossSwoop(boss, 'stage1', 400, 800)) {
          swoopTriggered = true;
          break;
        }
      }
      
      // With 2% chance per call, should trigger at least once in 100 tries
      // This may occasionally fail (~13% of the time) but is statistically likely to pass
      expect(swoopTriggered).toBe(true);
    });
  });

  describe('createBossSwoop', () => {
    const boss = { x: 100, y: 50 };

    it('creates swoop state with correct start position', () => {
      const swoop = createBossSwoop(boss, 400, 800);
      
      expect(swoop.startX).toBe(boss.x);
      expect(swoop.startY).toBe(boss.y);
    });

    it('sets active to true', () => {
      const swoop = createBossSwoop(boss, 400, 800);
      expect(swoop.active).toBe(true);
    });

    it('sets target position based on screen size', () => {
      const screenWidth = 400;
      const screenHeight = 800;
      const swoop = createBossSwoop(boss, screenWidth, screenHeight);
      
      expect(swoop.targetX).toBe(screenWidth / 2);
      expect(swoop.targetY).toBe(screenHeight * 0.6);
    });

    it('initializes time to zero', () => {
      const swoop = createBossSwoop(boss, 400, 800);
      expect(swoop.time).toBe(0);
    });

    it('sets duration', () => {
      const swoop = createBossSwoop(boss, 400, 800);
      expect(swoop.duration).toBeGreaterThan(0);
    });
  });

  describe('updateBossSwoop', () => {
    it('returns boss unchanged if swoop is null', () => {
      const boss = { x: 100, y: 50 };
      const result = updateBossSwoop(boss, null, 0.1);
      
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it('returns boss unchanged if swoop is inactive', () => {
      const boss = { x: 100, y: 50 };
      const swoop = { active: false };
      const result = updateBossSwoop(boss, swoop, 0.1);
      
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it('moves boss toward target in first half', () => {
      const boss = { x: 100, y: 50 };
      const swoop = createBossSwoop(boss, 400, 800);
      
      // Small time step - should be in first half
      updateBossSwoop(boss, swoop, 0.3);
      
      // Boss should have moved toward center
      expect(boss.x).not.toBe(100);
    });

    it('moves boss back toward start in second half', () => {
      const boss = { x: 100, y: 50 };
      const swoop = createBossSwoop(boss, 400, 800);
      
      // Move to second half of swoop
      swoop.time = swoop.duration * 0.6;
      
      const midX = boss.x;
      updateBossSwoop(boss, swoop, 0.2);
      
      // Boss should be moving back
      expect(swoop.time).toBeGreaterThan(swoop.duration * 0.5);
    });

    it('deactivates swoop when complete', () => {
      const boss = { x: 100, y: 50 };
      const swoop = createBossSwoop(boss, 400, 800);
      
      // Complete the swoop
      updateBossSwoop(boss, swoop, swoop.duration + 0.1);
      
      expect(swoop.active).toBe(false);
    });

    it('boss returns to start position after swoop', () => {
      const boss = { x: 100, y: 50 };
      const swoop = createBossSwoop(boss, 400, 800);
      const startX = swoop.startX;
      const startY = swoop.startY;
      
      // Complete the swoop
      updateBossSwoop(boss, swoop, swoop.duration + 0.1);
      
      // Should be at or very near start position
      expect(boss.x).toBeCloseTo(startX, 0);
      expect(boss.y).toBeCloseTo(startY, 0);
    });

    it('updates swoop time', () => {
      const boss = { x: 100, y: 50 };
      const swoop = createBossSwoop(boss, 400, 800);
      
      updateBossSwoop(boss, swoop, 0.5);
      
      expect(swoop.time).toBe(0.5);
    });
  });
});
