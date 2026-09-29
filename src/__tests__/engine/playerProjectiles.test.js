const player = { x: 180, y: 640, width: 40, height: 22, weaponLevel: 1, weaponType: null };

describe('production player projectile velocity contract', () => {
  it('creates a restrained, symmetric five-projectile upward spread', () => {
    const { createPlayerBullets } = require('../../engine/projectiles');
    const bullets = createPlayerBullets({ ...player, weaponType: 'spread', weaponLevel: 3 });
    expect(bullets).toHaveLength(5);
    expect(bullets.every(bullet => bullet.vy < 0)).toBe(true);
    expect(bullets.map(bullet => bullet.vx)).toEqual([...bullets.map(bullet => bullet.vx)].sort((a, b) => a - b));
    expect(bullets[0].vx).toBeLessThan(0);
    expect(bullets[4].vx).toBeGreaterThan(0);
    bullets.forEach((bullet, index) => {
      const other = bullets[4 - index];
      expect(bullet.vx + other.vx).toBeCloseTo(0);
      expect(bullet.vy).toBeCloseTo(other.vy);
      expect(Math.hypot(bullet.vx, bullet.vy)).toBeCloseTo(370);
      expect(Math.abs(Math.atan2(bullet.vx, -bullet.vy))).toBeLessThanOrEqual(0.200001);
    });
    expect(bullets[0].x + bullets[0].vx).toBeLessThan(bullets[0].x);
    expect(bullets[4].x + bullets[4].vx).toBeGreaterThan(bullets[4].x);
  });

  it.each([[1, [420]], [2, [430, 430]], [3, [440, 430, 430]]])('preserves parallel level %s shot count and speeds', (weaponLevel, speeds) => {
    const { createPlayerBullets } = require('../../engine/projectiles');
    const bullets = createPlayerBullets({ ...player, weaponLevel });
    expect(bullets.map(bullet => bullet.speed)).toEqual(speeds);
    expect(bullets.every(bullet => bullet.vx === 0 && bullet.vy === -bullet.speed)).toBe(true);
    expect(bullets.every(bullet => bullet.y === player.y - 14)).toBe(true);
  });
});
