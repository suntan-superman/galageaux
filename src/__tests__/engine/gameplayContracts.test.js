import enemiesConfig from '../../config/enemies.json';
import wavesConfig from '../../config/waves.json';
import bossConfig from '../../config/boss.json';
import { checkBulletEnemyCollisions } from '../../engine/collisionHandlers';
import { createEnemy, selectEnemyType, spawnFormation, spawnSingleEnemy, createEnemyBullet } from '../../engine/spawner';
import { createBoss, updateBoss, bossCurrentPattern } from '../../engine/boss';
import { createBossPatterns, getBossPattern, generateBossBullets } from '../../engine/boss-patterns';

const bulletAt = (x = 100, y = 100) => ({ x, y, width: 4, height: 14 });
const enemyAt = (type = 'grunt') => createEnemy({ type, x: 100, y: 100, baseSpeed: 100, pattern: 'line' });

describe('production enemy collision contracts', () => {
  it('awards finite configured points once for a normal kill', () => {
    const onEnemyDestroyed = jest.fn();
    const result = checkBulletEnemyCollisions([bulletAt()], [enemyAt()], { onEnemyDestroyed });
    expect(result.results.scoreGain).toBe(enemiesConfig.grunt.points);
    expect(Number.isFinite(result.results.scoreGain)).toBe(true);
    expect(result.results.killsEarned).toBe(1);
    expect(onEnemyDestroyed).toHaveBeenCalledTimes(1);
  });

  it('retains multi-HP enemies until the configured number of hits', () => {
    const original = enemyAt('tank');
    let enemies = [original];
    const onEnemyHit = jest.fn();
    const onEnemyDestroyed = jest.fn();
    for (let hit = 1; hit <= enemiesConfig.tank.hp; hit++) {
      const result = checkBulletEnemyCollisions([bulletAt()], enemies, { onEnemyHit, onEnemyDestroyed });
      expect(result.survivingBullets).toHaveLength(0);
      if (hit < enemiesConfig.tank.hp) {
        expect(result.survivingEnemies[0].hp).toBe(enemiesConfig.tank.hp - hit);
        expect(result.results.scoreGain).toBe(0);
        expect(result.results.explosions).toHaveLength(0);
        expect(result.results.killsEarned).toBe(0);
      } else {
        expect(result.survivingEnemies).toHaveLength(0);
        expect(result.results.scoreGain).toBe(enemiesConfig.tank.points);
      }
      enemies = result.survivingEnemies;
    }
    expect(original.hp).toBe(enemiesConfig.tank.hp);
    expect(onEnemyHit).toHaveBeenCalledTimes(enemiesConfig.tank.hp);
    expect(onEnemyDestroyed).toHaveBeenCalledTimes(1);
  });

  it('consumes one projectile only once across overlapping enemies', () => {
    const result = checkBulletEnemyCollisions([bulletAt()], [enemyAt(), enemyAt()], {});
    expect(result.survivingEnemies).toHaveLength(1);
    expect(result.survivingBullets).toHaveLength(0);
    expect(result.results.killsEarned).toBe(1);
  });

  it('applies simultaneous hits without consuming surplus bullets after a kill', () => {
    const result = checkBulletEnemyCollisions(
      Array.from({ length: 5 }, () => bulletAt()), [enemyAt('tank')], {}
    );
    expect(result.survivingEnemies).toHaveLength(0);
    expect(result.survivingBullets).toHaveLength(1);
    expect(result.results.killsEarned).toBe(1);
  });

  it('keeps configured point values and existing combo/bonus multipliers', () => {
    const result = checkBulletEnemyCollisions([bulletAt()], [enemyAt()], { comboCount: 2, bonusMultiplier: 1.5 });
    expect(result.results.scoreGain).toBe(Math.floor(enemiesConfig.grunt.points * 1.5 * 1.5));
    expect(result.results.newCombo).toBe(3);
  });
});

describe('production enemy configuration and spawning', () => {
  it.each(['grunt', 'shooter', 'dive', 'scout', 'tank', 'elite', 'kamikaze'])('honors %s HP, size and speed scalar', type => {
    const enemy = enemyAt(type);
    expect(enemy.hp).toBe(enemiesConfig[type].hp);
    expect(enemy.size).toBe(enemiesConfig[type].size);
    expect(enemy.speed).toBe(100 * enemiesConfig[type].speed);
    expect(enemy.baseSpeed).toBe(enemy.speed);
  });

  it('honors explicit shooting flags while preserving omitted dive behavior', () => {
    expect(createEnemy({ type: 'tank', x: 0, y: 0, baseSpeed: 100, canShoot: false }).canShoot).toBe(true);
    expect(createEnemy({ type: 'scout', x: 0, y: 0, baseSpeed: 100, canShoot: true }).canShoot).toBe(false);
    expect(enemyAt('dive').canShoot).toBe(true);
    expect(enemyAt('grunt').canShoot).toBe(false);
  });

  it.each(['stage1', 'stage2', 'stage3'])('restricts single and formation spawns to %s types', stage => {
    const stageConfig = wavesConfig[stage];
    for (const roll of [0, 0.2, 0.5, 0.8, 0.99]) {
      const config = { width: 400, enemySpeed: 100, ...stageConfig, random: () => roll };
      for (const enemy of [...spawnSingleEnemy(config), ...spawnFormation('v', config)]) {
        expect(stageConfig.enemyTypes).toContain(enemy.type);
        expect(enemy.x).toBeGreaterThanOrEqual(0);
        expect(enemy.x + enemy.size).toBeLessThanOrEqual(400);
      }
    }
  });

  it('renormalizes existing weights without activating dormant enemy types', () => {
    const types = Array.from({ length: 100 }, (_, index) => selectEnemyType((index + 0.5) / 100, ['grunt', 'shooter']).type);
    expect(types.filter(type => type === 'grunt')).toHaveLength(73);
    expect(types.filter(type => type === 'shooter')).toHaveLength(27);
    expect(selectEnemyType(0.99, ['swarm', 'grunt']).type).toBe('grunt');
  });

  it('uses injected randomness for repeatable spawn positions and cooldowns', () => {
    const config = { width: 400, enemySpeed: 100, patterns: ['line'], enemyTypes: ['tank'], random: () => 0.5 };
    expect(spawnSingleEnemy(config)).toEqual(spawnSingleEnemy(config));
    expect(spawnFormation('line', config)).toEqual(spawnFormation('line', config));
  });

  it('ordinary enemy projectiles use positive-down velocity', () => {
    const bullet = createEnemyBullet(enemyAt(), 4, 14, 138);
    expect(bullet.vx).toBe(0);
    expect(bullet.vy).toBe(138);
  });
});

describe('boss contracts with real production configuration', () => {
  afterEach(() => jest.restoreAllMocks());

  it('owns exactly one elapsed-time cooldown decrement', () => {
    const boss = createBoss('stage1', 400);
    const result = updateBoss(boss, 0.2, 'stage1');
    expect(result.fireCooldown).toBeCloseTo(1.0);
  });

  it('preserves firing during entrance and clamps the entrance endpoint', () => {
    const boss = createBoss('stage1', 400);
    updateBoss(boss, 1.2, 'stage1');
    expect(boss.y).toBeLessThan(boss.targetY);
    expect(boss.fireCooldown).toBeLessThanOrEqual(0);
    updateBoss(boss, 10, 'stage1');
    expect(boss.y).toBe(boss.targetY);
  });

  it.each(['stage1', 'stage2', 'stage3'])('reaches every %s phase and changes at its absolute HP threshold', stage => {
    const boss = createBoss(stage, 400);
    const phases = bossConfig[stage].phases;
    const patternState = createBossPatterns(stage);
    phases.forEach((phase, index) => {
      boss.hp = phase.hpThreshold + 1;
      expect(bossCurrentPattern(boss, stage)).toBe(phase.pattern);
      expect(getBossPattern(patternState, boss)).toBe(phase.pattern);
      boss.hp = phase.hpThreshold;
      expect(bossCurrentPattern(boss, stage)).toBe(phases[Math.min(index + 1, phases.length - 1)].pattern);
    });
  });

  it.each([[100, 100], [-100, 100], [100, -100], [-100, -100], [0, 100]])('aims at target delta (%s,%s)', (dx, dy) => {
    const boss = { ...createBoss('stage1', 400), y: 100 };
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height;
    const [bullet] = generateBossBullets(boss, 'aimed', 'stage1', cx + dx, cy + dy);
    expect(bullet.vx * dx + bullet.vy * dy).toBeGreaterThan(0);
    expect(bullet.vx * dy - bullet.vy * dx).toBeCloseTo(0);
    expect(Math.hypot(bullet.vx, bullet.vy)).toBeCloseTo(bossConfig.stage1.bulletSpeed * 1.2);
  });

  it('spread and aimed burst travel toward a player below the boss', () => {
    const boss = { ...createBoss('stage1', 400), y: 100 };
    const playerX = boss.x + boss.width / 2;
    for (const pattern of ['spread', 'burst']) {
      const bullets = generateBossBullets(boss, pattern, 'stage1', playerX, 600);
      expect(bullets.every(bullet => bullet.vy > 0)).toBe(true);
      expect(bullets.reduce((sum, bullet) => sum + bullet.vx, 0)).toBeCloseTo(0);
    }
  });

  it('drives movement and spiral heading from simulation time, not wall time', () => {
    const first = { ...createBoss('stage2', 400), y: 100 };
    const second = { ...first };
    const clock = jest.spyOn(Date, 'now').mockReturnValue(0);
    updateBoss(first, 0.5, 'stage2');
    const firstVolley = generateBossBullets(first, 'spiral', 'stage2', 200, 600);
    clock.mockReturnValue(123456789);
    updateBoss(second, 0.5, 'stage2');
    expect(second.x).toBeCloseTo(first.x);
    expect(second.elapsedTime).toBeCloseTo(0.5);
    expect(generateBossBullets(second, 'spiral', 'stage2', 200, 600)).toEqual(firstVolley);
  });
});
