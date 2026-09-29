import { createGameSession, stepGameSession, commandGameSession } from '../../engine/gameSimulation';
import { createBoss } from '../../engine/boss';
import { createEnemy } from '../../engine/spawner';
import { createPowerup } from '../../engine/powerups';
import { getLevelTarget } from '../../engine/difficulty';
import { STAGES } from '../../constants/game';

const random = () => 0.65;
const session = () => ({ ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true });
const tick = (state, dt = 1 / 60, input) => stepGameSession(state, dt, input, random);
const advance = (state, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) state = tick(state).state; return state; };
const pickup = (state, kind) => tick({ ...state, powerups: [createPowerup(state.player.x, state.player.y, kind)] }).state;
const bullet = (x, y) => ({ x, y, width: 4, height: 14, vx: 0, vy: 0 });
const enemy = (type = 'grunt', x = 20, y = 200) => createEnemy({ type, x, y, baseSpeed: 100, pattern: 'line' });

describe('authoritative production simulation', () => {
  it('keeps auto-fire shot, feedback and one event in the committed snapshot', () => {
    const result = tick({ ...session(), autoFire: true });
    expect(result.state.bullets).toHaveLength(1);
    expect(result.state.muzzleFlashes).toHaveLength(1);
    expect(result.events.filter(e => e.type === 'shotFired')).toHaveLength(1);
    expect(tick(result.state).events.filter(e => e.type === 'shotFired')).toHaveLength(0);
  });
  it('removes escaped enemies but retains above-screen entrants', () => {
    const result = tick({ ...session(), enemies: [enemy('grunt', 20, 801), enemy('grunt', 20, -100)] });
    expect(result.state.enemies).toHaveLength(1);
    expect(result.state.enemies[0].y).toBeLessThan(0);
  });
  it('uses current position and shield and consumes it exactly once', () => {
    const state = pickup(session(), 'shield');
    state.player.x = 250;
    state.enemyBullets = [bullet(251, state.player.y)];
    const result = tick(state);
    expect(result.state.player.lives).toBe(5);
    expect(result.state.player.shield).toBe(false);
    expect(result.state.timers.shield).toBe(0);
    expect(result.state.scoreTexts[0].x).toBe(270);
    expect(result.events.filter(e => e.type === 'shieldHit')).toHaveLength(1);
  });
  it('retains damage effects and hazard clears through the final commit', () => {
    const state = session();
    state.enemies = [enemy()]; state.bullets = [bullet(350, 400)];
    state.enemyBullets = [bullet(state.player.x, state.player.y), bullet(state.player.x, state.player.y)];
    const result = tick(state);
    expect(result.state.player.lives).toBe(4);
    expect(result.state.particles.length).toBeGreaterThan(0);
    expect(result.state.explosions).toHaveLength(1);
    expect(result.state.enemies).toHaveLength(0);
    expect(result.state.bullets).toHaveLength(0);
    expect(result.state.enemyBullets).toHaveLength(0);
    expect(result.events.filter(e => e.type === 'playerHit')).toHaveLength(1);
  });
  it('starts ten-second bonus after level target and advances its countdown', () => {
    const state = session(); state.levelKills = getLevelTarget(1) - 1;
    state.enemies = [enemy()]; state.bullets = [bullet(20, 201)];
    const result = tick(state);
    expect(result.state.level).toBe(2);
    expect(result.state.phase).toBe('bonus');
    expect(result.state.bonusTimeLeft).toBe(10);
    const later = advance(result.state, 0.5);
    expect(later.bonusTimeLeft).toBeCloseTo(9.5, 5);
    expect(later.levelKills).toBe(0);
  });
  it('does not count bonus kills toward another level', () => {
    const state = { ...session(), phase: 'bonus', bonusTimeLeft: 3, level: 2 };
    state.enemies = [enemy()]; state.bullets = [bullet(20, 201)];
    expect(tick(state).state.levelKills).toBe(0);
  });
  it('slow survives collection/commit and restores each original type speed', () => {
    let state = { ...session(), enemies: [enemy('tank'), enemy('scout', 200)] };
    const speeds = state.enemies.map(e => e.speed);
    state = pickup(state, 'slow');
    expect(state.enemies.map(e => e.speed)).toEqual(speeds.map(speed => speed * 0.6));
    state = advance(state, 3);
    expect(state.enemies.map(e => e.speed)).toEqual(speeds);
  });
  it('repeated slow refreshes without compounding', () => {
    let state = pickup({ ...session(), enemies: [enemy()] }, 'slow');
    state = advance(state, 1);
    state = pickup(state, 'slow');
    expect(state.enemies[0].speed).toBe(60);
    expect(state.timers.slow).toBe(3);
  });
  it('weapon pickups refresh or replace with one deterministic expiry', () => {
    let state = pickup(session(), 'double');
    state = pickup(advance(state, 1), 'double');
    expect(state.player.weaponLevel).toBe(2);
    expect(state.timers.weapon).toBe(10);
    state = pickup(advance(state, 1), 'spread');
    expect(state.player.weaponType).toBe('spread');
    state = advance(state, 9);
    expect(state.player.weaponType).toBe('spread');
    state = advance(state, 1);
    expect(state.player.weaponLevel).toBe(1);
    expect(state.player.weaponType).toBe(null);
  });
  it('rapid and weapon lifetimes are independent', () => {
    let state = pickup(session(), 'rapid');
    state = pickup(advance(state, 5), 'triple');
    state = advance(state, 5);
    expect(state.player.rapidFire).toBe(false);
    expect(state.player.weaponType).toBe('triple');
  });
  it('shield refreshes and expires on gameplay time', () => {
    let state = pickup(session(), 'shield');
    state = pickup(advance(state, 3), 'shield');
    state = advance(state, 3);
    expect(state.player.shield).toBe(true);
    expect(advance(state, 1).player.shield).toBe(false);
  });
  it.each(['tutorial', 'paused', 'won', 'lost'])('%s blocks movement, shots and gameplay timers', phase => {
    const state = { ...pickup(session(), 'shield'), phase, autoFire: true, enemies: [enemy()] };
    expect(tick(state, 100).state).toBe(state);
    expect(commandGameSession(state, { type: 'fire' }).events).toEqual([]);
  });
  it('pause/resume retains exact pickup time and does not run obsolete timers', () => {
    const state = pickup(session(), 'shield');
    const paused = commandGameSession(state, { type: 'pause' }).state;
    expect(advance(paused, 20).timers.shield).toBe(4);
    const resumed = commandGameSession(paused, { type: 'resume' }).state;
    expect(advance(resumed, 4).player.shield).toBe(false);
  });
  it('fresh session resets all session-specific state, independent of the old one', () => {
    const old = pickup(pickup(session(), 'shield'), 'slow');
    Object.assign(old, { level: 8, score: 900, bonusTimeLeft: 9, combo: 5, currentStage: 'stage3', autoFire: true });
    const fresh = createGameSession(400, 800, false, 2);
    advance(old, 20);
    expect(fresh).toEqual(createGameSession(400, 800, false, 2));
    expect(fresh.timers).toEqual({ weapon: 0, rapid: 0, shield: 0, slow: 0 });
    expect(fresh.sessionStats.enemiesKilled).toBe(0);
    expect(fresh.level).toBe(1); expect(fresh.bonusTimeLeft).toBe(0);
    expect(fresh.muzzleFlashes).toEqual([]); expect(fresh.screenOffset).toEqual({ ox: 0, oy: 0 });
  });
  it('boss cooldown advances only once in the live frame pipeline', () => {
    const state = { ...session(), boss: createBoss('stage1', 400), phase: 'boss' };
    const result = tick(state, 0.1);
    expect(result.state.boss.fireCooldown).toBeCloseTo(1.1, 8);
    expect(state.boss.fireCooldown).toBe(1.2);
  });
  it('preserves firing during boss entrance as explicit existing policy', () => {
    const boss = { ...createBoss('stage1', 400), fireCooldown: 0.01 };
    const result = tick({ ...session(), boss, phase: 'boss' });
    expect(result.state.boss.y).toBeLessThan(0);
    expect(result.state.enemyBullets.length).toBeGreaterThan(0);
    expect(result.events.filter(e => e.type === 'bossFired')).toHaveLength(1);
  });
  it('stage transition blocks hazards then requests the valid gameplay track', () => {
    const state = session();
    state.boss = { ...createBoss('stage1', 400), y: 100, hp: 1 };
    state.bullets = [bullet(state.boss.x, 101)];
    state.enemyBullets = [bullet(state.player.x, state.player.y)];
    const result = tick(state);
    expect(result.state.phase).toBe('transition');
    expect(result.state.player.lives).toBe(5);
    expect(result.events.filter(e => e.type === 'bossKilled')).toHaveLength(1);
    let next = result.state, events = [];
    for (let i = 0; i < 120; i++) { const r = tick(next); next = r.state; events.push(...r.events); }
    expect(next.currentStage).toBe('stage2');
    expect(events).toContainEqual(expect.objectContaining({ type: 'music', track: 'gameplay' }));
  });
  it('last boss produces a terminal victory exactly once', () => {
    const state = { ...session(), currentStage: STAGES[STAGES.length - 1] };
    state.boss = { ...createBoss(state.currentStage, 400), y: 100, hp: 1 };
    state.bullets = [bullet(state.boss.x, 101)];
    const result = tick(state);
    expect(result.state.phase).toBe('won');
    expect(tick(result.state, 100)).toEqual({ state: result.state, events: [] });
  });
  it('clamps a long frame to 100ms with bounded substeps', () => {
    const state = { ...session(), enemies: [enemy()] };
    expect(tick(state, 60).state.enemies[0].y).toBeCloseTo(210, 6);
  });
  it('does not mutate a previous snapshot or reuse event identities', () => {
    const state = session(); const serialized = JSON.stringify(state);
    const first = tick({ ...state, autoFire: true });
    expect(JSON.stringify(state)).toBe(serialized);
    const second = tick({ ...first.state, fireCooldown: 0 });
    expect(first.events[0].id).not.toBe(second.events[0].id);
  });
});
