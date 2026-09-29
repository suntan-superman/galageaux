import waves from '../../config/waves.json';
import enemies from '../../config/enemies.json';
import { calculateDifficultySettings, calculateEnemyFireCooldown, calculateSpawnInterval, calculateMaxEnemies, calculateEnemySpeed } from '../../engine/difficulty';
import { spawnWave, createEnemy } from '../../engine/spawner';
import { createGameSession, stepGameSession } from '../../engine/gameSimulation';

const difficulty = (level, bonus = false, stage = 'stage1') => calculateDifficultySettings(waves[stage], level, bonus);
const spawnConfig = settings => ({ ...waves.stage1, ...settings, width: 400, fireCooldownMultiplier: settings.enemyFireCooldownMultiplier });

describe('Stage 1 opening pacing through production config and simulation', () => {
  it.each([
    [1, 3.2, 4, 54.6, 1.8, 0, 1],
    [2, 2.2737857142857143, 8, 83.538, 1.35, 0.2, 3],
    [3, 1.584, 16, 114.608, 1.1, 0.5, 5],
    [4, 1.2433333333333332, 42, 145.08, 1, 0.6, 5],
  ])('has explicit level %i spacing, residents, speed, fire and wave settings', (level, interval, cap, speed, cooldown, chance, size) => {
    const settings = difficulty(level);
    expect(settings.spawnInterval).toBeCloseTo(interval, 8);
    expect(settings.maxEnemies).toBe(cap);
    expect(settings.enemySpeed).toBeCloseTo(speed, 8);
    expect(settings.enemyFireCooldownMultiplier).toBe(cooldown);
    expect(settings.formationChance).toBe(chance);
    expect(settings.formationSize).toBe(size);
  });

  it('ramps pressure monotonically from levels 1 through 4', () => {
    const settings = [1, 2, 3, 4].map(level => difficulty(level));
    settings.slice(1).forEach((next, index) => {
      const previous = settings[index];
      expect(next.spawnInterval).toBeLessThan(previous.spawnInterval);
      expect(next.maxEnemies).toBeGreaterThan(previous.maxEnemies);
      expect(next.enemySpeed).toBeGreaterThan(previous.enemySpeed);
      expect(next.enemyFireCooldownMultiplier).toBeLessThan(previous.enemyFireCooldownMultiplier);
      expect(next.formationChance).toBeGreaterThan(previous.formationChance);
    });
  });

  it.each(['stage1', 'stage2', 'stage3'])('preserves the existing level 4–10 formulas in %s', stage => {
    for (let level = 4; level <= 10; level++) {
      for (const bonus of [false, true]) {
        const settings = difficulty(level, bonus, stage);
        expect(settings.spawnInterval).toBe(calculateSpawnInterval(waves[stage].spawnInterval, level, bonus));
        expect(settings.maxEnemies).toBe(calculateMaxEnemies(waves[stage].maxEnemies, level, bonus));
        expect(settings.enemySpeed).toBe(calculateEnemySpeed(waves[stage].enemySpeed, level, bonus));
        expect(settings.enemyFireCooldownMultiplier).toBe(1);
        expect(settings.formationChance).toBe(0.6);
        expect(settings.formationSize).toBe(5);
      }
    }
  });

  it.each(['stage2', 'stage3'])('does not reapply the opening slowdown on low-kill arrival at %s', stage => {
    for (const level of [1, 2, 3]) {
      const settings = difficulty(level, false, stage);
      expect(settings.spawnInterval).toBe(calculateSpawnInterval(waves[stage].spawnInterval, level));
      expect(settings.enemySpeed).toBe(calculateEnemySpeed(waves[stage].enemySpeed, level));
      expect(settings.maxEnemies).toBe(calculateMaxEnemies(waves[stage].maxEnemies, level));
      expect(settings.enemyFireCooldownMultiplier).toBe(1);
    }
  });

  it.each([1, 2, 3, 4])('retains bonus modifiers, targets and bullet speed at level %i', level => {
    const ordinary = difficulty(level), bonus = difficulty(level, true);
    expect(bonus.spawnInterval).toBeCloseTo(ordinary.spawnInterval * 0.6);
    expect(bonus.enemySpeed).toBeCloseTo(ordinary.enemySpeed * 1.25);
    expect(bonus.maxEnemies).toBe(ordinary.maxEnemies + 3);
    expect(bonus.enemyBulletSpeed).toBe(ordinary.enemyBulletSpeed);
    expect(bonus.bonusMultiplier).toBe(1.5);
    expect(bonus.levelTarget).toBe(ordinary.levelTarget);
  });

  it.each([1, 2, 3, 4])('uses the configured formation probability and size at level %i', level => {
    const settings = difficulty(level);
    const config = spawnConfig(settings);
    let formations = 0;
    for (let index = 0; index < 100; index++) {
      const roll = (index + 0.5) / 100;
      const batch = spawnWave({ ...config, random: () => roll });
      if (batch.length > 1) { formations++; expect(batch).toHaveLength(settings.formationSize); }
      for (const enemy of batch) {
        expect(waves.stage1.enemyTypes).toContain(enemy.type);
        expect(enemy.speed).toBeCloseTo(settings.enemySpeed * enemies[enemy.type].speed);
        expect(enemy.baseSpeed).toBe(enemy.speed);
        expect(enemy.hp).toBe(enemies[enemy.type].hp);
        expect(enemy.size).toBe(enemies[enemy.type].size);
      }
    }
    expect(formations).toBe(settings.formationChance * 100);
  });

  it.each([1, 2, 3, 4])('scales initial and repeat ordinary cooldowns exactly once at level %i', level => {
    const settings = difficulty(level);
    const config = { ...spawnConfig(settings), enemyTypes: ['shooter'], formationChance: 0, random: () => 0.5 };
    const [spawned] = spawnWave(config);
    expect(spawned.fireCooldown).toBeCloseTo(1.25 * settings.enemyFireCooldownMultiplier);
    const base = level <= 2 ? 3.25 : 2.4;
    expect(calculateEnemyFireCooldown(level, 'shooter', () => 0.5, settings.enemyFireCooldownMultiplier)).toBeCloseTo(base * settings.enemyFireCooldownMultiplier);
  });

  it.each([1, 2, 3, 4])('live repeat shooting consumes the level %i cooldown setting', level => {
    const settings = difficulty(level);
    const state = { ...createGameSession(400, 800), level, initialWaveSpawned: true, bossSpawned: true };
    state.enemies = [{ ...createEnemy({ type: 'shooter', x: 20, y: 100, baseSpeed: 0 }), fireCooldown: 0 }];
    const next = stepGameSession(state, 1 / 60, {}, () => 0.5).state;
    expect(next.enemyBullets).toHaveLength(1);
    expect(next.enemies[0].fireCooldown).toBeCloseTo((level <= 2 ? 3.25 : 2.4) * settings.enemyFireCooldownMultiplier);
  });

  it('spawns one target immediately and lets it enter view within one second', () => {
    for (const random of [() => 0.1, () => 0.45, () => 0.9]) {
      let state = stepGameSession(createGameSession(400, 800), 1 / 60, {}, random).state;
      expect(state.enemies).toHaveLength(1);
      expect(state.totalEnemiesSpawned).toBe(1);
      for (let frame = 0; frame < 60; frame++) state = stepGameSession(state, 1 / 60, {}, random).state;
      expect(state.enemies[0].y).toBeGreaterThan(0);
      expect(state.totalEnemiesSpawned).toBe(1);
    }
  });

  it('respects the calm resident cap during an unplayed opening and reclaims escaped enemies', () => {
    let state = createGameSession(400, 800);
    // Fixed RNG selects a non-shooting grunt, so incoming damage does not clear residents.
    for (let frame = 0; frame < 60 * 40; frame++) {
      state = stepGameSession(state, 1 / 60, {}, () => 0.1).state;
      expect(state.enemies.length).toBeLessThanOrEqual(4);
    }
    expect(state.totalEnemiesSpawned).toBeGreaterThan(4);
    expect(state.enemies.length).toBeGreaterThan(0);
    expect(state.level).toBe(1);
  });

  it('live spawning applies the initial firing slowdown and every type modifier', () => {
    for (const roll of [0.1, 0.45, 0.9]) {
      const state = stepGameSession(createGameSession(400, 800), 1 / 60, {}, () => roll).state;
      for (const enemy of state.enemies) {
        expect(enemy.fireCooldown).toBeCloseTo((0.5 + roll * 1.5) * 1.8);
        expect(enemy.speed).toBeCloseTo(54.6 * enemies[enemy.type].speed);
      }
    }
  });
});
