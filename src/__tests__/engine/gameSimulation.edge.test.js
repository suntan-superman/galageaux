import { createGameSession, commandGameSession, stepGameSession } from '../../engine/gameSimulation';
import { createEnemy } from '../../engine/spawner';
import { createBoss } from '../../engine/boss';
import { createPowerup } from '../../engine/powerups';
import { calculateDifficultySettings } from '../../engine/difficulty';
import waves from '../../config/waves.json';
import enemyConfig from '../../config/enemies.json';
import { STAGES } from '../../constants/game';

const random = () => 0.65;
const session = () => ({ ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true });
const tick = (state, dt = 0.1, input = {}) => stepGameSession(state, dt, input, random);
const enemy = (type = 'grunt', extra = {}) => ({ ...createEnemy({ type, x: 100, y: 200, baseSpeed: 0, pattern: 'line', random }), id: 'existing-enemy', ...extra });
const bullet = (x = 100, y = 200) => ({ x, y, width: 4, height: 14, vx: 0, vy: 0 });
function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
  return value;
}

describe('live simulation edge contracts', () => {
  it('emits every multi-hit/kill event once across all bounded substeps', () => {
    const state = { ...session(), enemies: [enemy('tank')], bullets: Array.from({ length: 5 }, () => bullet()) };
    const result = tick(state);
    expect(result.events.filter(event => event.type === 'enemyHit')).toHaveLength(4);
    expect(result.events.filter(event => event.type === 'enemyKilled')).toHaveLength(1);
    expect(new Set(result.events.map(event => event.id)).size).toBe(result.events.length);
    expect(result.state.bullets).toHaveLength(1);
    expect(result.state.sessionStats.enemiesKilled).toBe(1);
    expect(result.state.score).toBe(300);
    expect(tick(result.state).events.filter(event => ['enemyHit', 'enemyKilled'].includes(event.type))).toHaveLength(0);
  });

  it('does not duplicate a powerup collection or level-up within a long frame', () => {
    const state = { ...session(), levelKills: 3, enemies: [enemy()], bullets: [bullet()] };
    state.powerups = [createPowerup(state.player.x, state.player.y, 'shield')];
    const result = tick(state);
    expect(result.events.filter(event => event.type === 'powerupCollected')).toHaveLength(1);
    expect(result.events.filter(event => event.type === 'levelUp')).toHaveLength(1);
    expect(result.state.level).toBe(2);
    expect(result.state.bonusTimeLeft).toBeCloseTo(10 - 5 / 60);
    expect(result.state.sessionStats.powerupsCollected).toBe(1);
  });

  it('applies simultaneous shield absorption and subsequent damage to distinct bullets', () => {
    const state = session();
    state.player.shield = true;
    state.timers.shield = 4;
    state.enemyBullets = [bullet(state.player.x, state.player.y), bullet(state.player.x, state.player.y)];
    const result = tick(state);
    expect(result.events.filter(event => event.type === 'shieldHit')).toHaveLength(1);
    expect(result.events.filter(event => event.type === 'playerHit')).toHaveLength(1);
    expect(result.state.player.lives).toBe(4);
    expect(result.state.enemyBullets).toHaveLength(0);
    expect(result.state.explosions).toHaveLength(1);
  });

  it('keeps an incoming entry volley while removing an outgoing upward bullet', () => {
    const state = session();
    state.enemyBullets = [{ ...bullet(10, -60), vy: 260 }, { ...bullet(20, -60), vy: -260 }];
    const result = tick(state);
    expect(result.state.enemyBullets).toHaveLength(1);
    expect(result.state.enemyBullets[0].x).toBe(10);
    expect(result.state.enemyBullets[0].y).toBeCloseTo(-34);
  });

  it('fires a single entry volley and applies only one cooldown per substep', () => {
    const state = { ...session(), phase: 'boss', boss: { ...createBoss('stage1', 400), fireCooldown: 0.01 } };
    const result = tick(state);
    expect(result.events.filter(event => event.type === 'bossFired')).toHaveLength(1);
    expect(result.state.boss.fireCooldown).toBeCloseTo(1.1 - 5 / 60);
    expect(result.state.enemyBullets.some(projectile => projectile.y < 0 && projectile.vy > 0)).toBe(true);
  });

  it('reclaims escaped residents and fills the available quota exactly once', () => {
    const state = { ...createGameSession(400, 800), initialWaveSpawned: true, enemySpawnTimer: 2 };
    const capacity = calculateDifficultySettings(waves.stage1, 1).maxEnemies;
    state.enemies = Array.from({ length: capacity }, (_, index) => enemy('grunt', { id: `old-${index}`, y: index ? 200 : 801 }));
    const result = tick(state, 1 / 60);
    expect(result.state.enemies).toHaveLength(capacity);
    expect(result.state.enemies.some(value => value.id === 'old-0')).toBe(false);
    expect(result.state.totalEnemiesSpawned).toBe(1);
    expect(new Set(result.state.enemies.map(value => value.id)).size).toBe(capacity);
  });

  it.each(STAGES)('passes %s allowed types and per-type speed through the live spawning boundary', currentStage => {
    for (const roll of [0.15, 0.45, 0.65, 0.99]) {
      const initial = { ...createGameSession(400, 800), currentStage };
      const result = stepGameSession(initial, 1 / 60, {}, () => roll);
      const settings = calculateDifficultySettings(waves[currentStage], 1);
      expect(result.state.enemies.length).toBeGreaterThan(0);
      expect(result.state.totalEnemiesSpawned).toBe(result.state.enemies.length);
      for (const spawned of result.state.enemies) {
        expect(waves[currentStage].enemyTypes).toContain(spawned.type);
        expect(spawned.speed).toBeCloseTo(settings.enemySpeed * enemyConfig[spawned.type].speed);
        expect(spawned.baseSpeed).toBe(spawned.speed);
      }
    }
  });

  it('crosses the arrival quota with one live spawn and one boss appearance event', () => {
    const state = { ...createGameSession(400, 800), initialWaveSpawned: true, enemySpawnTimer: 2,
      totalEnemiesSpawned: waves.stage1.maxEnemies - 1 };
    const result = tick(state);
    expect(result.state.totalEnemiesSpawned).toBe(waves.stage1.maxEnemies);
    expect(result.state.enemies).toHaveLength(1);
    expect(result.state.boss.alive).toBe(true);
    expect(result.state.phase).toBe('boss');
    expect(result.events.filter(event => event.type === 'bossAppeared')).toHaveLength(1);
    expect(result.events.filter(event => event.type === 'music')).toEqual([expect.objectContaining({ track: 'boss' })]);
    expect(tick(result.state).events.filter(event => event.type === 'bossAppeared')).toHaveLength(0);
  });

  it('freezes transition gameplay clocks and resumes the surviving bonus after stage advance', () => {
    const state = { ...session(), phase: 'transition', transitionTimeLeft: 0.1, bonusTimeLeft: 2 };
    state.timers.shield = 3; state.player.shield = true;
    state.enemies = [enemy()]; state.enemyBullets = [bullet(state.player.x, state.player.y)];
    const result = tick(state);
    expect(result.state.currentStage).toBe('stage2');
    expect(result.state.phase).toBe('bonus');
    expect(result.state.player.lives).toBe(5);
    expect(result.state.timers.shield).toBe(3);
    expect(result.state.bonusTimeLeft).toBe(2);
    expect(result.state.enemyBullets).toHaveLength(0);
    expect(result.events.filter(event => event.type === 'music')).toEqual([expect.objectContaining({ track: 'gameplay' })]);
    const next = tick(result.state, 1 / 60);
    expect(next.state.timers.shield).toBeCloseTo(3 - 1 / 60);
    expect(next.state.bonusTimeLeft).toBeCloseTo(2 - 1 / 60);
  });

  it('resumes a paused transition without skipping its remainder', () => {
    const initial = { ...session(), phase: 'transition', transitionTimeLeft: 1.25 };
    const paused = commandGameSession(initial, { type: 'pause' }).state;
    expect(tick(paused, 100).state.transitionTimeLeft).toBe(1.25);
    const resumed = commandGameSession(paused, { type: 'resume' }).state;
    expect(resumed.phase).toBe('transition');
    expect(tick(resumed).state.transitionTimeLeft).toBeCloseTo(1.15);
  });

  it('emits terminal victory only once even with spare shots and hostile overlaps', () => {
    const state = { ...session(), phase: 'boss', currentStage: 'stage3', boss: { ...createBoss('stage3', 400), y: 100, hp: 1 } };
    state.bullets = [bullet(state.boss.x, 101), bullet(state.boss.x, 101)];
    state.enemyBullets = [bullet(state.player.x, state.player.y)];
    const result = tick(state);
    expect(result.state.phase).toBe('won');
    expect(result.state.player.lives).toBe(5);
    expect(result.events.filter(event => event.type === 'bossKilled')).toHaveLength(1);
    expect(result.events.filter(event => event.type === 'sessionEnded')).toEqual([expect.objectContaining({ outcome: 'won' })]);
    expect(tick(result.state).events).toEqual([]);
    expect(commandGameSession(result.state, { type: 'resume' }).state.phase).toBe('won');
  });

  it('leaves every part of a populated prior snapshot unchanged', () => {
    const state = session();
    state.enemies = [enemy('shooter', { speed: 50, baseSpeed: 50, canShoot: true, fireCooldown: 0.01 })];
    state.boss = { ...createBoss('stage1', 400), y: 100 };
    state.particles = [{ x: 0, y: 0, vx: 1, vy: 1, life: 1, maxLife: 1, radius: 2, type: 'spark' }];
    state.explosions = [{ x: 0, y: 0, radius: 0, maxRadius: 20, life: 1, maxLife: 1 }];
    state.powerups = [createPowerup(10, 10, 'rapid')];
    state.scoreTexts = [{ x: 0, y: 0, life: 1 }];
    state.muzzleFlashes = [{ x: 0, y: 0, life: 0.1 }];
    state.shake = { time: 0.1, duration: 0.1, intensity: 2 };
    const saved = JSON.stringify(state);
    freezeDeep(state);
    expect(() => tick(state)).not.toThrow();
    expect(JSON.stringify(state)).toBe(saved);
    expect(() => commandGameSession(state, { type: 'fire' })).not.toThrow();
    expect(JSON.stringify(state)).toBe(saved);
  });

  it.each(['zigzag', 'dive'])('retains the configured %s position formula through substeps', pattern => {
    const state = { ...session(), enemies: [enemy('dive', { pattern, speed: 120, baseSpeed: 120, baseX: 140 })] };
    const result = tick(state);
    const moved = result.state.enemies[0];
    expect(moved.y).toBeCloseTo(212);
    expect(moved.x).toBeCloseTo(140 + Math.sin(212 / 800 * Math.PI * (pattern === 'zigzag' ? 4 : 2)) * (pattern === 'zigzag' ? 40 : 70));
  });

  it.each([false, true])('keeps equal-time autofire cadence at 30/60/120 updates (rapid=%s)', rapid => {
    const counts = [30, 60, 120].map(hz => {
      let state = session();
      state.autoFire = true;
      state.player.rapidFire = rapid;
      state.timers.rapid = rapid ? 20 : 0;
      const initial = commandGameSession(state, { type: 'fire' });
      state = initial.state;
      let shots = initial.events.filter(event => event.type === 'shotFired').length;
      for (let frame = 0; frame < hz * 10; frame++) {
        const result = tick(state, 1 / hz);
        state = result.state;
        shots += result.events.filter(event => event.type === 'shotFired').length;
      }
      return shots;
    });
    expect(counts).toEqual(counts.map(() => 1 + Math.floor(10 / (rapid ? 0.12 : 0.22))));
  });
});
