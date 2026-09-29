import waves from '../../config/waves.json';
import enemyConfig from '../../config/enemies.json';
import { createGameSession, commandGameSession, stepGameSession } from '../../engine/gameSimulation';
import { calculateDifficultySettings, getLevelTarget } from '../../engine/difficulty';
import { createEnemy } from '../../engine/spawner';
import { createPowerup } from '../../engine/powerups';

const FRAME = 1 / 60;
const random = () => 0.65;
const tick = (state, dt = FRAME, rng = random) => stepGameSession(state, dt, {}, rng);
const quietSession = () => ({ ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true });
const target = (extra = {}) => ({ ...createEnemy({ type: 'grunt', x: 20, y: 100, baseSpeed: 0, pattern: 'line', random }), ...extra });
const shot = () => ({ x: 20, y: 100, width: 4, height: 14, vx: 0, vy: 0 });
const withKill = state => ({ ...state, enemies: [target()], bullets: [shot()] });
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

describe('opening pacing integrated with the preserved Phase 0 lifecycle', () => {
  it('progresses through levels 1–4 with one ten-second bonus per target and unchanged bonus scoring', () => {
    let state = quietSession();
    for (let completedLevel = 1; completedLevel <= 3; completedLevel++) {
      const levelUps = [];
      for (let kill = 0; kill < getLevelTarget(completedLevel); kill++) {
        const result = tick(withKill(state));
        state = result.state;
        levelUps.push(...result.events.filter(event => event.type === 'levelUp'));
      }
      expect(state.level).toBe(completedLevel + 1);
      expect(state.phase).toBe('bonus');
      expect(state.bonusTimeLeft).toBe(10);
      expect(levelUps).toHaveLength(1);

      for (let frame = 1; frame <= 600; frame++) {
        // Two seconds lets the ordinary combo expire before this bonus kill.
        if (frame === 121) state = withKill(state);
        const beforeScore = state.score;
        const result = tick(state);
        state = result.state;
        if (frame === 121) {
          expect(state.score - beforeScore).toBe(150);
          expect(result.events.filter(event => event.type === 'enemyKilled')).toHaveLength(1);
        }
        expect(state.level).toBe(completedLevel + 1);
        expect(state.levelKills).toBe(0);
        expect(result.events.filter(event => event.type === 'levelUp')).toHaveLength(0);
        expect(state.bonusTimeLeft > 0).toBe(frame < 600);
      }
      expect(state.phase).toBe('playing');
      expect(state.bonusTimeLeft).toBe(0);
    }
    expect(state.sessionStats.levelsCompleted).toBe(3);
  });

  it.each([2, 3, 4])('uses the new level %i bonus profile immediately and trims its first formation to free capacity', level => {
    let state = { ...quietSession(), level: level - 1, levelKills: getLevelTarget(level - 1) - 1 };
    state = tick(withKill(state)).state;
    const settings = calculateDifficultySettings(waves.stage1, level, true);
    state.bossSpawned = false;
    state.initialWaveSpawned = false;
    state.enemies = Array.from({ length: settings.maxEnemies - 2 }, (_, index) => target({ id: `resident-${index}` }));
    const result = tick(state, FRAME, () => 0.05);
    const entrants = result.state.enemies.filter(enemy => !String(enemy.id).startsWith('resident-'));
    expect(result.state.enemies).toHaveLength(settings.maxEnemies);
    expect(entrants).toHaveLength(2);
    expect(result.state.totalEnemiesSpawned).toBe(2);
    expect(new Set(result.state.enemies.map(enemy => enemy.id)).size).toBe(settings.maxEnemies);
    for (const enemy of entrants) {
      expect(enemy.speed).toBeCloseTo(settings.enemySpeed * enemyConfig[enemy.type].speed);
      expect(enemy.fireCooldown).toBeCloseTo((0.5 + 0.05 * 1.5) * settings.enemyFireCooldownMultiplier);
    }
    expect(result.state.bonusTimeLeft).toBeCloseTo(10 - FRAME);
  });

  it('does not despawn existing bonus residents when the ordinary opening cap resumes', () => {
    const bonusCap = calculateDifficultySettings(waves.stage1, 2, true).maxEnemies;
    const normal = calculateDifficultySettings(waves.stage1, 2, false);
    const state = { ...createGameSession(400, 800), level: 2, phase: 'bonus', bonusTimeLeft: FRAME,
      initialWaveSpawned: true, enemies: Array.from({ length: bonusCap }, (_, index) => target({ id: `resident-${index}` })) };
    let next = tick(state).state;
    expect(next.bonusTimeLeft).toBe(0);
    expect(next.enemies).toHaveLength(bonusCap);
    next.enemySpawnTimer = normal.spawnInterval;
    next = tick(next).state;
    expect(next.totalEnemiesSpawned).toBe(0);
    expect(next.enemies).toHaveLength(bonusCap);
    next.enemies = next.enemies.map((enemy, index) => index < bonusCap - normal.maxEnemies + 1 ? { ...enemy, y: 801 } : enemy);
    next = tick(next).state;
    expect(next.totalEnemiesSpawned).toBe(1);
    expect(next.enemies).toHaveLength(normal.maxEnemies);
  });

  it.each([1, 2, 3, 4])('restores a slowed new entrant to its own level %i spawn speed after exactly three active seconds', level => {
    let state = { ...createGameSession(400, 800), level, timers: { weapon: 0, rapid: 0, shield: 0, slow: 3 + FRAME } };
    state = tick(state).state;
    expect(state.enemies).toHaveLength(1);
    const id = state.enemies[0].id;
    const spawnSpeed = state.enemies[0].baseSpeed;
    expect(spawnSpeed).toBeCloseTo(calculateDifficultySettings(waves.stage1, level).enemySpeed * enemyConfig[state.enemies[0].type].speed);
    expect(state.enemies[0].speed).toBeCloseTo(spawnSpeed * 0.6);
    state.bossSpawned = true;
    const paused = commandGameSession(state, { type: 'pause' }).state;
    expect(tick(paused, 50).state.timers.slow).toBeCloseTo(3);
    state = commandGameSession(paused, { type: 'resume' }).state;
    for (let frame = 0; frame < 180; frame++) state = tick(state).state;
    expect(state.timers.slow).toBe(0);
    expect(state.enemies.find(enemy => enemy.id === id).speed).toBeCloseTo(spawnSpeed);
  });

  it('keeps weapon, rapid, shield and slow lifetimes independent of the opening bonus clock', () => {
    let state = { ...quietSession(), level: 2, phase: 'bonus', bonusTimeLeft: 10 + FRAME };
    state.powerups = ['double', 'rapid', 'shield', 'slow'].map(kind => createPowerup(state.player.x, state.player.y, kind));
    const collected = tick(state);
    state = collected.state;
    expect(collected.events.filter(event => event.type === 'powerupCollected')).toHaveLength(4);
    expect(state.timers).toEqual({ weapon: 10, rapid: 10, shield: 4, slow: 3 });
    for (let frame = 1; frame <= 600; frame++) {
      state = tick(state).state;
      if (frame === 180) expect(state.timers.slow).toBe(0);
      if (frame === 240) expect(state.player.shield).toBe(false);
      if (frame === 599) {
        expect(state.player.weaponLevel).toBe(2);
        expect(state.player.rapidFire).toBe(true);
        expect(state.bonusTimeLeft).toBeCloseTo(FRAME);
      }
    }
    expect(state.timers).toEqual({ weapon: 0, rapid: 0, shield: 0, slow: 0 });
    expect(state.player.weaponLevel).toBe(1);
    expect(state.player.rapidFire).toBe(false);
    expect(state.bonusTimeLeft).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it.each([7, 17, 12345])('restarts the same bounded opening pressure for seed %i without obsolete session mutations', seed => {
    let obsolete = { ...createGameSession(400, 800, false, 1), level: 4, phase: 'bonus', bonusTimeLeft: 8 };
    obsolete.timers = { weapon: 8, rapid: 6, shield: 3, slow: 2 };
    let fresh = createGameSession(400, 800, false, 2);
    const untouched = JSON.stringify(fresh);
    for (let frame = 0; frame < 120; frame++) obsolete = tick(obsolete).state;
    expect(JSON.stringify(fresh)).toBe(untouched);

    let comparison = createGameSession(400, 800, false, 2);
    const freshRng = seededRandom(seed), comparisonRng = seededRandom(seed);
    for (let frame = 0; frame < 600; frame++) {
      fresh = tick(fresh, FRAME, freshRng).state;
      comparison = tick(comparison, FRAME, comparisonRng).state;
      expect(fresh.enemies.length).toBeLessThanOrEqual(4);
      expect(fresh.totalEnemiesSpawned).toBeLessThanOrEqual(4);
    }
    // Compare gameplay pressure only: decorative particles/shake are not seeded.
    expect(fresh.enemies).toEqual(comparison.enemies);
    expect(fresh.enemyBullets).toEqual(comparison.enemyBullets);
    expect(fresh.totalEnemiesSpawned).toBe(comparison.totalEnemiesSpawned);
    expect(fresh.totalEnemiesSpawned).toBeGreaterThan(1);
    expect(fresh.level).toBe(1);
    expect(fresh.currentStage).toBe('stage1');
    expect(fresh.timers).toEqual({ weapon: 0, rapid: 0, shield: 0, slow: 0 });
  });
});
