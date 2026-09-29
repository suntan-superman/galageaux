import { checkBulletEnemyCollisions, checkBulletBossCollisions } from '../../engine/collisionHandlers';
import { createGameSession, stepGameSession } from '../../engine/gameSimulation';
import { spawnExplosion, spawnExplosionParticles, updateParticles, updateExplosion } from '../../engine/particles';
import { GAMEPLAY } from '../../constants/game';

const bullet = { x: 108, y: 125, width: 4, height: 14, vx: 0, vy: -420 };
const enemy = { id: 'enemy-1', type: 'tank', x: 100, y: 100, size: 32, hp: 4 };
const boss = { x: 100, y: 100, width: 80, height: 60, hp: 100, maxHp: 100, alive: true };
let random;
beforeEach(() => { random = jest.spyOn(Math, 'random').mockReturnValue(0.5); });
afterEach(() => jest.restoreAllMocks());

it('produces a brief nonfatal contact at the overlap without implying destruction', () => {
  const result = checkBulletEnemyCollisions([bullet], [enemy]);
  expect(result.survivingEnemies[0].hp).toBe(3);
  expect(result.survivingBullets).toHaveLength(0);
  expect(result.results.explosions).toHaveLength(0);
  expect(result.results.scoreGain).toBe(0);
  expect(result.results.particles).toHaveLength(4);
  const core = result.results.particles.find(p => p.type === 'contact');
  expect(core).toMatchObject({ x: 110, y: 128.5, target: 'enemy', targetId: 'enemy-1' });
  expect(core.maxLife).toBeLessThanOrEqual(0.09);
  expect(result.results.particles.filter(p => p.type === 'contactSpark').every(p => p.vy > 0)).toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(enemy.hp).toBe(4);
});

it('distinguishes simultaneous contacts and preserves one-consumer projectile ownership', () => {
  const result = checkBulletEnemyCollisions([bullet, { ...bullet, x: 116 }], [enemy]);
  expect(result.survivingEnemies[0].hp).toBe(2);
  expect(result.results.particles.filter(p => p.type === 'contact').map(p => p.x)).toEqual([110, 118]);
  expect(new Set(result.results.particles.map(p => p.id)).size).toBe(8);
  expect(random).not.toHaveBeenCalled();
});

it('keeps the legacy kill RNG sequence and reward while reducing death particle density', () => {
  const onEnemyDestroyed = jest.fn(() => expect(random).toHaveBeenCalledTimes(201));
  const result = checkBulletEnemyCollisions([bullet], [{ ...enemy, type: 'grunt', hp: 1 }], { onEnemyDestroyed });
  expect(random).toHaveBeenCalledTimes(201);
  expect(onEnemyDestroyed).toHaveBeenCalledTimes(1);
  expect(result.results.killsEarned).toBe(1);
  expect(result.results.scoreGain).toBe(100);
  expect(result.results.particles).toHaveLength(20);
  expect(result.results.explosions).toHaveLength(1);
  expect(result.results.explosions[0].life).toBe(0.25);
  expect(result.results.particles.some(p => p.visualKind === 'fragment')).toBe(true);
});

it('anchors boss contact to each consumed overlap while preserving its legacy RNG draws', () => {
  const result = checkBulletBossCollisions([bullet, { ...bullet, x: 150 }], boss);
  expect(random).toHaveBeenCalledTimes(52);
  expect(result.updatedBoss.hp).toBe(98);
  expect(result.results.scoreGain).toBe(0);
  expect(result.results.explosions).toHaveLength(0);
  const cores = result.results.particles.filter(p => p.type === 'contact');
  expect(cores.map(p => [p.x, p.y])).toEqual([[110, 132], [152, 132]]);
  expect(cores.every(p => p.target === 'boss')).toBe(true);
  expect(boss.hp).toBe(100);
});

it('preserves boss death duration, particle burst, score and RNG sequence', () => {
  const result = checkBulletBossCollisions([bullet], { ...boss, hp: 1 });
  expect(random).toHaveBeenCalledTimes(957); // 26 impact + 525 boss + 405 debris + score ID.
  expect(result.results.bossDefeated).toBe(true);
  expect(result.results.scoreGain).toBe(1000);
  expect(result.results.explosions[0]).toMatchObject({ maxRadius: 80, life: 0.6, maxLife: 0.6 });
  expect(result.results.particles.filter(p => p.type === 'boss')).toHaveLength(75);
  expect(result.results.particles.filter(p => p.type === 'debris')).toHaveLength(60);
});

it('gives particle and explosion records stable IDs without consuming extra randomness', () => {
  const particles = spawnExplosionParticles(10, 20, 4);
  expect(random).toHaveBeenCalledTimes(42);
  const explosion = spawnExplosion(10, 20);
  expect(random).toHaveBeenCalledTimes(42);
  expect(particles.every(p => typeof p.id === 'string')).toBe(true);
  expect(new Set([...particles.map(p => p.id), explosion.id]).size).toBe(7);
  expect(updateParticles(particles, 0.01).map(p => p.id)).toEqual(particles.map(p => p.id));
  expect(updateExplosion(explosion, 0.01).id).toBe(explosion.id);
});

const session = () => {
  const state = createGameSession(400, 800);
  state.initialWaveSpawned = true; state.bossSpawned = true;
  state.enemyBullets = [{ x: state.player.x + 2, y: state.player.y, width: 4, height: 14, vx: 0, vy: 0 }];
  return state;
};

it('uses a shield ripple and dispersion without player damage or extra RNG', () => {
  const state = session(); state.player.shield = true; state.timers.shield = 2;
  const result = stepGameSession(state, 1 / 60, {}, () => 0.65);
  expect(result.state.player).toMatchObject({ lives: 5, shield: false });
  expect(result.state.playerHitFlash).toBe(0);
  expect(result.state.explosions).toHaveLength(0);
  expect(result.events.map(event => event.type)).toEqual(['shieldHit']);
  expect(result.state.particles).toHaveLength(5);
  expect(result.state.particles.find(p => p.type === 'shieldRipple')).toMatchObject({ x: 200, y: 651, maxLife: 0.28 });
  expect(random).not.toHaveBeenCalled();
  expect(updateParticles(result.state.particles, 0.3)).toEqual([]);
});

it('freezes shield ripple while paused and discards it on a new session', () => {
  const state = session(); state.player.shield = true; state.timers.shield = 2;
  const hit = stepGameSession(state, 1 / 60, {}, () => 0.65).state;
  expect(hit.particles.some(p => p.type === 'shieldRipple')).toBe(true);
  const paused = { ...hit, phase: 'paused' };
  expect(stepGameSession(paused, 0.1).state).toBe(paused);
  expect(createGameSession(400, 800, false, 2).particles).toEqual([]);
});

it('keeps contacts and ripples inside the existing particle and explosion budgets', () => {
  const state = session(); state.player.shield = true; state.timers.shield = 2;
  state.particles = Array.from({ length: GAMEPLAY.MAX_PARTICLES }, (_, index) => ({
    id: `old-${index}`, x: 0, y: 0, vx: 0, vy: 0, radius: 1, life: 1, maxLife: 1,
  }));
  state.explosions = Array.from({ length: GAMEPLAY.MAX_EXPLOSIONS }, (_, index) => ({
    id: `old-ex-${index}`, x: 0, y: 0, radius: 1, maxRadius: 20, life: 1, maxLife: 1,
  }));
  const next = stepGameSession(state, 1 / 60, {}, () => 0.65).state;
  expect(next.particles).toHaveLength(GAMEPLAY.MAX_PARTICLES);
  expect(next.explosions).toHaveLength(GAMEPLAY.MAX_EXPLOSIONS);
  expect(next.particles.some(p => p.type === 'shieldRipple')).toBe(true);
});

it('makes large-enemy shake slightly stronger without changing duration or random draw count', () => {
  const outcomes = [24, 32].map(size => {
    const state = createGameSession(400, 800);
    state.initialWaveSpawned = true; state.bossSpawned = true;
    state.enemies = [{ ...enemy, size, hp: 1, speed: 0, baseSpeed: 0, canShoot: false, pattern: 'line' }];
    state.bullets = [{ ...bullet, y: 110, vx: 0, vy: 0 }];
    return stepGameSession(state, 1 / 60, {}, () => 0.65).state;
  });
  expect(outcomes[0].shake).toEqual({ intensity: 4.5, time: 0.15, duration: 0.15 });
  expect(outcomes[1].shake).toEqual({ intensity: 6, time: 0.15, duration: 0.15 });
  expect(outcomes[0].score).toBe(outcomes[1].score);
  expect(outcomes[0].sessionStats.enemiesKilled).toBe(1);
  expect(outcomes[1].sessionStats.enemiesKilled).toBe(1);
  expect(random).toHaveBeenCalledTimes(402);
});
