import waves from '../../config/waves.json';
import bossConfig from '../../config/boss.json';
import { createGameSession, commandGameSession, stepGameSession } from '../../engine/gameSimulation';
import { BOSS_IDENTITY, BOSS_STATE, bossPhaseIndex } from '../../engine/bossEncounter';
import { FLIGHT } from '../../engine/enemyFlight';
import { CAPTURE_SCENARIOS, createCaptureInitialState, createCaptureRng } from '../../dev/captureScenarios';

const FRAME = 1 / 60;
const make = (id, sessionId = 7) => createCaptureInitialState(id, 400, 800, sessionId);

describe('development capture scenario catalog', () => {
  it('has unique, complete descriptors in the four gameplay groups', () => {
    expect(CAPTURE_SCENARIOS).toHaveLength(33);
    expect(new Set(CAPTURE_SCENARIOS.map(item => item.id)).size).toBe(CAPTURE_SCENARIOS.length);
    expect(new Set(CAPTURE_SCENARIOS.map(item => item.group))).toEqual(
      new Set(['GAMEPLAY', 'POWERUPS', 'BOSSES', 'PRESENTATION']));
    for (const item of CAPTURE_SCENARIOS) {
      expect(item.label.trim()).toBeTruthy();
      expect(item.description.trim()).toBeTruthy();
    }
  });

  it.each(CAPTURE_SCENARIOS.map(item => item.id))('%s returns a valid production-compatible snapshot', id => {
    const { state, seed } = make(id);
    const phone = createCaptureInitialState(id, 390, 844, 19);
    expect(state.sessionId).toBe(7);
    expect(state.width).toBe(400);
    expect(state.height).toBe(800);
    expect(waves[state.currentStage]).toBeDefined();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(['playing', 'bonus', 'boss', 'bossDeath', 'lost']).toContain(state.phase);
    expect(state.player).toEqual(expect.objectContaining({ width: 40, height: 22 }));
    expect(state.timers).toEqual(expect.objectContaining({ weapon: expect.any(Number),
      rapid: expect.any(Number), shield: expect.any(Number), slow: expect.any(Number) }));
    expect(state.enemies).toEqual(expect.any(Array));
    expect(state.enemyBullets).toEqual(expect.any(Array));
    expect(state.sessionStats).toEqual(expect.objectContaining({ bossesDefeated: expect.any(Number) }));
    expect(new Set(state.enemies.map(enemy => enemy.id)).size).toBe(state.enemies.length);
    expect(() => stepGameSession(state, FRAME, {}, createCaptureRng(seed))).not.toThrow();
    expect(phone.state.width).toBe(390);
    expect(phone.state.height).toBe(844);
    expect(phone.state.sessionId).toBe(19);
    expect(phone.seed).toBe(seed);
    expect(() => stepGameSession(phone.state, FRAME, {}, createCaptureRng(phone.seed))).not.toThrow();
  });

  it('rejects unknown scenarios or invalid viewports instead of making fake states', () => {
    expect(() => make('boss4_arrival')).toThrow('Unknown capture scenario');
    expect(() => createCaptureInitialState('stage1_early', 0, 800)).toThrow('positive viewport');
  });

  it('keeps Stage 1 early exactly on the production opening snapshot', () => {
    expect(make('stage1_early').state).toEqual(createGameSession(400, 800, false, 7));
  });

  it.each([['stage2_action', 'stage2', 4], ['stage3_action', 'stage3', 6]])(
    '%s uses actual %s stage configuration and eligible enemies', (id, stageKey, level) => {
      const { state } = make(id);
      expect(state.currentStage).toBe(stageKey);
      expect(state.level).toBe(level);
      expect(state.enemies).toHaveLength(5);
      expect(state.enemies.every(enemy => waves[stageKey].enemyTypes.includes(enemy.type))).toBe(true);
      expect(state.enemies.every(enemy => enemy.path && enemy.formationId)).toBe(true);
      expect(state.totalEnemiesSpawned).toBe(5);
      expect(state.bossSpawned).toBe(false);
    });

  it.each(['stage2_action', 'stage3_action'])(
    '%s produces real hostile projectiles shortly after launch', id => {
      const capture = make(id);
      let state = capture.state;
      const random = createCaptureRng(capture.seed);
      let firstShot = null;
      for (let frame = 0; frame < 240 && !firstShot; frame++) {
        state = stepGameSession(state, FRAME, {}, random).state;
        if (state.enemyBullets.length) firstShot = state.enemyBullets[0];
      }
      expect(firstShot).toEqual(expect.objectContaining({
        width: expect.any(Number), height: expect.any(Number), vy: expect.any(Number),
      }));
      expect(firstShot.vy).toBeGreaterThan(0);
    });

  it('positions production formation, pair, mirror, leader and deep/targeted flights', () => {
    const entrance = make('formation_entrance').state.enemies;
    expect(entrance).toHaveLength(5);
    expect(entrance.every(enemy => enemy.flightState === FLIGHT.ENTERING)).toBe(true);

    const pair = make('breakaway_pair').state;
    expect(pair.level).toBe(2);
    expect(pair.enemies).toHaveLength(3);
    expect(pair.enemies.every(enemy => enemy.groupStyle === 'pair' && enemy.flightLevel === 2)).toBe(true);
    expect(pair.enemies.filter(enemy => [FLIGHT.BREAKAWAY, FLIGHT.ATTACKING].includes(enemy.flightState)).length)
      .toBeGreaterThanOrEqual(2);

    const mirror = make('mirror_attack').state.enemies;
    expect(mirror.every(enemy => enemy.groupStyle === 'mirror')).toBe(true);
    expect(mirror.filter(enemy => enemy.attackFamily === 'swing').length).toBeGreaterThanOrEqual(2);

    const leader = make('follow_the_leader').state.enemies;
    expect(leader.every(enemy => enemy.groupStyle === 'leader')).toBe(true);
    expect(leader.filter(enemy => [FLIGHT.BREAKAWAY, FLIGHT.ATTACKING].includes(enemy.flightState)).length)
      .toBeGreaterThanOrEqual(2);

    const deep = make('deep_dive_targeted').state.enemies;
    expect(deep.map(enemy => enemy.attackFamily)).toEqual(expect.arrayContaining(['deep', 'targeted']));
    expect(deep.find(enemy => enemy.attackFamily === 'targeted').targetSnapshot).toBeTruthy();
  });

  it.each([
    ['double', 2, 'double'], ['triple', 3, 'triple'], ['spread', 3, 'spread'],
    ['rapid', 1, null], ['shield', 1, null], ['slow', 1, null],
  ])('%s is collected by actual simulation and has the matching active state', (kind, weaponLevel, weaponType) => {
    const { state } = make(`powerup_${kind}`);
    expect(state.sessionStats.powerupsCollected).toBe(1);
    expect(state.powerups).toHaveLength(0);
    expect(state.player.weaponLevel).toBe(weaponLevel);
    expect(state.player.weaponType).toBe(weaponType);
    const timer = ['double', 'triple', 'spread'].includes(kind) ? 'weapon' : kind;
    expect(state.timers[timer]).toBeGreaterThan(0);
    if (kind === 'rapid') expect(state.player.rapidFire).toBe(true);
    if (kind === 'shield') {
      expect(state.player.shield).toBe(true);
      expect(state.enemyBullets).toHaveLength(1);
    }
    if (kind === 'slow') {
      expect(state.enemies.every(enemy => enemy.speed === enemy.baseSpeed * 0.6)).toBe(true);
    }
  });

  it('spread scenario fires the normal five-shot production pattern', () => {
    const state = make('powerup_spread').state;
    const fired = commandGameSession(state, { type: 'fire' });
    expect(fired.state.bullets).toHaveLength(5);
    expect(fired.events).toContainEqual(expect.objectContaining({ type: 'shotFired', cue: 'playerShootSpread' }));
  });

  it.each([['boss1', 'stage1'], ['boss2', 'stage2'], ['boss3', 'stage3']])(
    '%s uses its true identity and all configured phase thresholds', (prefix, stageKey) => {
      const phases = bossConfig[stageKey].phases;
      const arrival = make(`${prefix}_arrival`).state;
      expect(arrival.boss.name).toBe(BOSS_IDENTITY[stageKey].name);
      expect(arrival.boss.encounterState).toBe(BOSS_STATE.ANNOUNCING);
      expect(arrival.boss.maxHp).toBe(bossConfig[stageKey].hp);

      const first = make(`${prefix}_phase1`).state;
      expect(first.boss.phaseIndex).toBe(0);
      expect(first.boss.hp).toBe(first.boss.maxHp);
      expect(first.boss.encounterState).toBe(BOSS_STATE.READY);

      const second = make(`${prefix}_phase2`).state;
      expect(second.boss.hp).toBe(phases[0].hpThreshold);
      expect(second.boss.phaseIndex).toBe(1);
      expect(second.boss.phaseIndex).toBe(bossPhaseIndex(second.boss.hp, stageKey));
      expect(second.boss.encounterState).toBe(BOSS_STATE.READY);

      const last = make(`${prefix}_final`).state;
      expect(last.boss.hp).toBe(phases[phases.length - 2].hpThreshold);
      expect(last.boss.phaseIndex).toBe(phases.length - 1);
      expect(last.boss.phaseIndex).toBe(bossPhaseIndex(last.boss.hp, stageKey));
      expect(last.boss.encounterState).toBe(BOSS_STATE.READY);

      const death = make(`${prefix}_death`).state;
      expect(death.boss.hp).toBe(1);
      expect(death.boss.alive).toBe(true);
      expect(death.boss.phaseIndex).toBe(phases.length - 1);
      expect(death.autoFire).toBe(true);
    });

  it.each(['boss1_death', 'boss2_death', 'boss3_death'])(
    '%s enters staged destruction through real fire and boss collision', id => {
      const capture = make(id);
      let state = capture.state;
      let killed = false;
      const random = createCaptureRng(capture.seed);
      for (let frame = 0; frame < 180 && !killed; frame++) {
        const result = stepGameSession(state, FRAME, {}, random);
        state = result.state;
        killed = result.events.some(event => event.type === 'bossKilled');
      }
      expect(killed).toBe(true);
      expect(state.phase).toBe('bossDeath');
      expect(state.boss.encounterState).toBe(BOSS_STATE.DYING);
    });

  it('bonus mode runs the real bonus countdown and Stage-1 enemy rules', () => {
    const { state, seed } = make('bonus_mode');
    expect(state.phase).toBe('bonus');
    expect(state.bonusTimeLeft).toBe(10);
    expect(state.currentStage).toBe('stage1');
    const next = stepGameSession(state, FRAME, {}, createCaptureRng(seed)).state;
    expect(next.bonusTimeLeft).toBeLessThan(10);
    expect(next.phase).toBe('bonus');
  });

  it('game over is a real engine loss and final victory advances through staged Boss-3 death', () => {
    const loss = make('game_over').state;
    expect(loss.phase).toBe('lost');
    expect(loss.player.alive).toBe(false);
    expect(loss.player.lives).toBe(0);
    expect(loss.sessionStats.hitsTaken).toBe(1);

    let { state } = make('final_victory');
    expect(state.phase).toBe('bossDeath');
    expect(state.boss.encounterState).toBe(BOSS_STATE.DYING);
    expect(state.score).toBe(48750);
    let victoryEvents = [];
    for (let frame = 0; frame < 95; frame++) {
      const result = stepGameSession(state, FRAME, {}, createCaptureRng(12));
      state = result.state;
      victoryEvents.push(...result.events);
    }
    expect(state.phase).toBe('won');
    expect(victoryEvents.filter(event => event.type === 'victory')).toHaveLength(1);
  });

  it('resetting with a new session identity keeps the same seed and flight geometry', () => {
    const first = make('mirror_attack', 100);
    const reset = make('mirror_attack', 101);
    expect(reset.seed).toBe(first.seed);
    expect(reset.state.sessionId).not.toBe(first.state.sessionId);
    expect(reset.state.enemies.map(({ id, ...enemy }) => enemy))
      .toEqual(first.state.enemies.map(({ id, ...enemy }) => enemy));
    expect(Array.from({ length: 30 }, createCaptureRng(first.seed)))
      .toEqual(Array.from({ length: 30 }, createCaptureRng(reset.seed)));
  });

  it('seeded live stepping reproduces spawn, formation and enemy-fire decisions', () => {
    const replay = () => {
      const { state: initial, seed } = make('stage2_action');
      let state = initial;
      const random = createCaptureRng(seed);
      for (let frame = 0; frame < 180; frame++) state = stepGameSession(state, FRAME, {}, random).state;
      return { enemies: state.enemies, enemyBullets: state.enemyBullets,
        totalEnemiesSpawned: state.totalEnemiesSpawned, nextFormationId: state.nextFormationId };
    };
    expect(replay()).toEqual(replay());
  });
});
