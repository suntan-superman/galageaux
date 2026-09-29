import { MAX_PLAYER_BANK, updatePlayerMotion, getThrusterVisuals, getProjectileVisual } from '../../engine/shipVisuals';
import { createPlayerBullets } from '../../engine/projectiles';

describe('presentation-only ship motion', () => {
  it.each([-1000, -300, -10, 10, 300, 1000])('banks in movement direction for velocity %s without exceeding eight degrees', velocity => {
    const bank = updatePlayerMotion(0, velocity, 0.1);
    expect(Math.sign(bank)).toBe(Math.sign(velocity));
    expect(Math.abs(bank)).toBeLessThanOrEqual(MAX_PLAYER_BANK);
  });

  it.each([30, 60, 120])('returns toward neutral with the same elapsed-time envelope at %s Hz', hz => {
    let bank = MAX_PLAYER_BANK;
    for (let index = 0; index < hz; index++) {
      const next = updatePlayerMotion(bank, 0, 1 / hz);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(bank);
      bank = next;
    }
    expect(bank).toBeCloseTo(updatePlayerMotion(MAX_PLAYER_BANK, 0, 1), 12);
    expect(bank).toBeLessThan(0.00001);
  });

  it('does not advance on a stopped clock and sanitizes non-finite inputs', () => {
    expect(updatePlayerMotion(0.05, -300, 0)).toBe(0.05);
    expect(updatePlayerMotion(0.05, -300, -1)).toBe(0.05);
    expect(updatePlayerMotion(NaN, Infinity, NaN)).toBe(0);
  });

  it('bounds flame dimensions, intensity and short trailing falloff', () => {
    for (const velocity of [-10000, -300, 0, 300, 10000]) {
      for (const bonus of [false, true]) {
        for (let step = 0; step <= 100; step++) {
          const flame = getThrusterVisuals(velocity, step / 10, bonus);
          expect(flame.length).toBeGreaterThanOrEqual(12);
          expect(flame.length).toBeLessThanOrEqual(20);
          expect(flame.width).toBeGreaterThanOrEqual(6.15);
          expect(flame.width).toBeLessThanOrEqual(7.55);
          expect(Math.abs(flame.bias)).toBeLessThanOrEqual(2.5);
          expect(flame.intensity).toBeGreaterThanOrEqual(0.72);
          expect(flame.intensity).toBeLessThanOrEqual(1);
          expect(flame.trailLength).toBeGreaterThanOrEqual(4);
          expect(flame.trailLength).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it('keeps neutral flight powered and biases exhaust opposite lateral movement', () => {
    expect(getThrusterVisuals(0, 0).intensity).toBeGreaterThan(0);
    expect(getThrusterVisuals(-100, 0).bias).toBeGreaterThan(0);
    expect(getThrusterVisuals(100, 0).bias).toBeLessThan(0);
    expect(getThrusterVisuals(100, 0).intensity).toBeGreaterThan(getThrusterVisuals(0, 0).intensity);
    expect(getThrusterVisuals(100, 0, true).intensity).toBeGreaterThan(getThrusterVisuals(100, 0).intensity);
  });
});

describe('projectile presentation direction', () => {
  it.each([[0, -420], [0, 230], [200, 0], [-200, 0], [120, -300], [-120, 300]])(
    'aligns a short decorative tail opposite velocity (%s, %s) without changing the AABB', (vx, vy) => {
      const bullet = Object.freeze({ id: 'test', x: 100, y: 200, width: 4, height: 14, vx, vy });
      for (const friendly of [true, false]) {
        const visual = getProjectileVisual(bullet, friendly);
        expect(visual.center).toEqual({ x: 102, y: 207 });
        expect(Math.hypot(visual.direction.x, visual.direction.y)).toBeCloseTo(1);
        const tail = { x: visual.tailEnd.x - visual.tailStart.x, y: visual.tailEnd.y - visual.tailStart.y };
        expect(tail.x * vx + tail.y * vy).toBeLessThan(0);
        expect(tail.x * vy - tail.y * vx).toBeCloseTo(0);
        expect(Math.hypot(tail.x, tail.y)).toBeCloseTo(visual.tailLength);
        expect(visual.tailLength).toBeLessThanOrEqual(friendly ? 10 : 4);
      }
      expect(bullet).toEqual({ id: 'test', x: 100, y: 200, width: 4, height: 14, vx, vy });
    }
  );

  it('uses real spread velocities while leaving every authoritative shot unchanged', () => {
    const player = Object.freeze({ x: 100, y: 600, width: 40, weaponType: 'spread', weaponLevel: 3 });
    const shots = createPlayerBullets(player).map(Object.freeze);
    const before = JSON.stringify(shots);
    const visuals = shots.map(shot => getProjectileVisual(shot));
    expect(visuals[0].direction.x).toBeLessThan(0);
    expect(visuals[4].direction.x).toBeGreaterThan(0);
    expect(visuals.every(visual => visual.direction.y < 0)).toBe(true);
    expect(JSON.stringify(shots)).toBe(before);
  });

  it('handles stationary or legacy velocity data without NaN', () => {
    expect(getProjectileVisual({ x: 0, y: 0 }).direction).toEqual({ x: 0, y: -1 });
    expect(getProjectileVisual({ x: 0, y: 0 }, false).direction).toEqual({ x: 0, y: 1 });
    expect(getProjectileVisual({ speed: 200 }, false).direction).toEqual({ x: 0, y: 1 });
    expect(getProjectileVisual({ vx: NaN, vy: Infinity }).direction).toEqual({ x: 0, y: -1 });
  });
});
