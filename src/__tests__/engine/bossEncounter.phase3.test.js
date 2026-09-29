import bossConfig from '../../config/boss.json';
import { STAGES } from '../../constants/game';
import { createGameSession, commandGameSession, stepGameSession } from '../../engine/gameSimulation';
import { createBossEncounter, advanceBossEncounter, bossPhaseIndex, bossAttackFamily,
  bossTelegraphDuration, BOSS_IDENTITY, BOSS_STATE } from '../../engine/bossEncounter';

const FRAME = 1 / 60;
const player = { x: 180, y: 640, width: 40, height: 22 };
const rng = () => 0.65;
const tick = (state, dt = FRAME, input = {}) => stepGameSession(state, dt, input, rng);
const fixture = (stage = 'stage1', boss = createBossEncounter(stage, 400, 800)) => ({
  ...createGameSession(400, 800), phase: 'boss', currentStage: stage,
  bossSpawned: true, initialWaveSpawned: true, boss,
});
const bulletAt = boss => ({ x: boss.x + 8, y: boss.y + 8, width: 4, height: 14, vx: 0, vy: 0 });
function advanceFrames(state, count, input = {}) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const result = tick(state, FRAME, input);
    state = result.state; events.push(...result.events);
  }
  return { state, events };
}
function fastTelegraph(stage, phaseIndex = 0, attackIndex = 0) {
  const base = createBossEncounter(stage, 400, 800);
  const hp = bossConfig[stage].phases[phaseIndex].hpThreshold + 1;
  const boss = { ...base, x: 160, y: base.targetY, hp, phaseIndex, attackIndex,
    encounterState: BOSS_STATE.TELEGRAPHING, stateElapsed: 0,
    targetSnapshot: { x: 200, y: 651 } };
  const family = bossAttackFamily(boss, stage);
  return { ...boss, attackFamily: family, stateElapsed: bossTelegraphDuration(family, stage) - FRAME / 2 };
}
function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}

describe('three configured encounter identities and state machine', () => {
  it.each(STAGES)('%s starts in a protected announcement with the preserved 80x60 hitbox', stage => {
    const boss = createBossEncounter(stage, 400, 800);
    expect(boss).toMatchObject({ encounterState: BOSS_STATE.ANNOUNCING,
      width: 80, height: 60, x: 160, y: -120, hp: bossConfig[stage].hp,
      name: BOSS_IDENTITY[stage].name });
    expect(boss.targetY).toBeGreaterThan(bossConfig[stage].enterY);
  });

  it.each(STAGES)('%s reaches ready before any projectile, then telegraphs before its first volley', stage => {
    let state = fixture(stage), seen = [], firstVolley = null, appeared = 0;
    for (let i = 0; i < 60 * 6; i++) {
      const result = tick(state);
      state = result.state;
      const current = state.boss.encounterState;
      if (seen[seen.length - 1] !== current) seen.push(current);
      appeared += result.events.filter(event => event.type === 'bossAppeared').length;
      if (result.events.some(event => event.type === 'bossFired')) { firstVolley = result; break; }
      expect(state.enemyBullets).toHaveLength(0);
      expect(state.player.lives).toBe(5);
    }
    expect(seen).toEqual([BOSS_STATE.ANNOUNCING, BOSS_STATE.ENTERING,
      BOSS_STATE.READY, BOSS_STATE.TELEGRAPHING, BOSS_STATE.ATTACKING]);
    expect(appeared).toBe(1);
    expect(firstVolley).toBeTruthy();
    expect(state.boss.y).toBeCloseTo(state.boss.targetY);
    expect(state.boss.targetY).toBeLessThan(state.player.y - 300);
    expect(state.boss.encounterElapsed).toBeGreaterThan(3);
  });

  it('clears ordinary hazards on the unchanged quota and leaves the player safe through arrival', () => {
    const state = { ...createGameSession(400, 800), initialWaveSpawned: true,
      totalEnemiesSpawned: 40, enemyBullets: [{ x: 180, y: 640, width: 4, height: 14, vx: 0, vy: 0 }] };
    const result = tick(state);
    expect(result.state.phase).toBe('boss');
    expect(result.state.enemies).toHaveLength(0);
    expect(result.state.enemyBullets).toHaveLength(0);
    expect(result.state.player.lives).toBe(5);
    expect(result.events.filter(event => event.type === 'bossAppeared')).toHaveLength(0);
    const arrived = advanceFrames(result.state, 60 * 3);
    expect(arrived.state.player.lives).toBe(5);
    expect(arrived.events.filter(event => event.type === 'bossFired')).toHaveLength(0);
  });

  it('moves through attack, recovery and a new tell without double-emitting a volley', () => {
    let state = fixture('stage1', fastTelegraph('stage1'));
    const fired = tick(state); state = fired.state;
    expect(fired.events.filter(event => event.type === 'bossFired')).toHaveLength(1);
    expect(state.enemyBullets).toHaveLength(12);
    expect(state.boss.encounterState).toBe(BOSS_STATE.ATTACKING);
    const next = advanceFrames(state, 60 * 2);
    expect(next.events.filter(event => event.type === 'bossFired')).toHaveLength(0);
    expect(next.state.boss.encounterState).toBe(BOSS_STATE.TELEGRAPHING);
    expect(next.state.boss.attackIndex).toBe(1);
    expect(next.state.boss.x).not.toBe(160);
  });

  it('stores a target before the tell and uses it after the player moves', () => {
    const initial = fastTelegraph('stage2', 1);
    const result = tick(fixture('stage2', initial), FRAME, { playerX: 330 });
    expect(result.state.player.x).toBe(330);
    expect(result.state.boss.targetSnapshot).toEqual({ x: 200, y: 651 });
    expect(result.state.enemyBullets).toHaveLength(1);
    expect(Math.abs(result.state.enemyBullets[0].vx)).toBeLessThan(1);
    expect(result.state.enemyBullets[0].vy).toBeGreaterThan(0);
  });

  it.each(STAGES)('%s keeps motion bounded and continuous at 60Hz', stage => {
    let boss = createBossEncounter(stage, 400, 800), maxStep = 0, volleys = 0;
    for (let i = 0; i < 60 * 12; i++) {
      const before = boss;
      const next = advanceBossEncounter(boss, FRAME, { stageKey: stage, width: 400, height: 800, player });
      boss = next.boss; if (next.volley) volleys++;
      maxStep = Math.max(maxStep, Math.hypot(boss.x - before.x, boss.y - before.y));
      expect(boss.x).toBeGreaterThanOrEqual(16);
      expect(boss.x + boss.width).toBeLessThanOrEqual(400 - 16);
      expect(boss.y).toBeGreaterThanOrEqual(-120);
      expect(boss.y).toBeLessThanOrEqual(boss.targetY);
    }
    expect(volleys).toBeGreaterThan(1);
    expect(maxStep).toBeLessThan(8);
  });

  it('keeps equal-time 30/60/120 Hz encounter endpoints close', () => {
    const sample = dt => {
      let boss = createBossEncounter('stage2', 400, 800), volleys = 0;
      for (let i = 0; i < Math.round(5 / dt); i++) {
        const next = advanceBossEncounter(boss, dt, { stageKey: 'stage2', width: 400, height: 800, player });
        boss = next.boss; if (next.volley) volleys++;
      }
      return { boss, volleys };
    };
    const at60 = sample(1 / 60);
    for (const rate of [30, 120]) {
      const other = sample(1 / rate);
      expect(other.volleys).toBe(at60.volleys);
      expect(Math.hypot(other.boss.x - at60.boss.x, other.boss.y - at60.boss.y)).toBeLessThan(5);
    }
  });
});

describe('phase, volley and collision contracts through the live session', () => {
  const cases = STAGES.flatMap(stage => bossConfig[stage].phases.map((phase, phaseIndex) => ({
    stage, phaseIndex, pattern: phase.pattern, count: { radial: 12, spread: 7, burst: 8, spiral: 6, aimed: 1 }[phase.pattern],
  })));

  it.each(cases)('$stage phase $phaseIndex emits one existing $pattern volley of $count projectiles', ({ stage, phaseIndex, pattern, count }) => {
    const result = tick(fixture(stage, fastTelegraph(stage, phaseIndex)));
    expect(result.events.filter(event => event.type === 'bossFired')).toEqual([
      expect.objectContaining({ pattern, phaseIndex })]);
    expect(result.state.enemyBullets).toHaveLength(count);
    if (['spread', 'aimed', 'burst'].includes(pattern)) expect(result.state.enemyBullets.every(shot => shot.vy > 0)).toBe(true);
    expect(tick(result.state).events.filter(event => event.type === 'bossFired')).toHaveLength(0);
  });

  it('combines final-stage familiar burst and radial volleys with recovery between them', () => {
    expect(bossAttackFamily({ phaseIndex: 3, attackIndex: 0 }, 'stage3')).toBe('burst');
    expect(bossAttackFamily({ phaseIndex: 3, attackIndex: 1 }, 'stage3')).toBe('radial');
    const second = tick(fixture('stage3', fastTelegraph('stage3', 3, 1)));
    expect(second.state.enemyBullets).toHaveLength(12);
    expect(second.events.filter(event => event.type === 'bossFired')).toEqual([
      expect.objectContaining({ pattern: 'radial' })]);
  });

  it.each(STAGES)('%s exposes every absolute-HP phase boundary', stage => {
    bossConfig[stage].phases.slice(0, -1).forEach((phase, index) => {
      expect(bossPhaseIndex(phase.hpThreshold + 1, stage)).toBe(index);
      expect(bossPhaseIndex(phase.hpThreshold, stage)).toBe(index + 1);
    });
  });

  it.each(STAGES)('%s supersedes a due volley on a threshold hit, once, without invulnerability', stage => {
    const threshold = bossConfig[stage].phases[0].hpThreshold;
    const boss = { ...fastTelegraph(stage), hp: threshold + 1 };
    const snapshot = fixture(stage, { ...boss, phaseIndex: 0 });
    snapshot.bullets = [bulletAt(boss)];
    const first = tick(snapshot);
    expect(first.state.boss.hp).toBe(threshold);
    expect(first.state.boss.encounterState).toBe(BOSS_STATE.PHASE_TRANSITION);
    expect(first.events.filter(event => event.type === 'bossPhaseChanged')).toHaveLength(1);
    expect(first.events.filter(event => event.type === 'bossFired')).toHaveLength(0);
    expect(first.state.enemyBullets).toHaveLength(0);
    expect(tick(first.state).events.filter(event => event.type === 'bossPhaseChanged')).toHaveLength(0);
    const during = { ...first.state, bullets: [bulletAt(first.state.boss)] };
    expect(tick(during).state.boss.hp).toBe(threshold - 1);
  });

  it('counts multiple distinct valid bullet contacts once and retains actual contact positions', () => {
    const boss = { ...createBossEncounter('stage1', 400, 800), encounterState: BOSS_STATE.READY, y: 178 };
    const snapshot = fixture('stage1', boss);
    snapshot.bullets = [bulletAt(boss), { ...bulletAt(boss), x: boss.x + 55 }];
    const result = tick(snapshot);
    expect(result.state.boss.hp).toBe(98);
    expect(result.events.filter(event => event.type === 'bossHit')).toEqual([expect.objectContaining({ count: 2 })]);
    const contacts = result.state.particles.filter(part => part.type === 'contact' && part.target === 'boss');
    expect(contacts.map(part => part.x)).toEqual([boss.x + 10, boss.x + 57]);
    expect(snapshot.boss.hp).toBe(100);
  });

  it('replays the same boss state and projectile sequence with the same seed and input schedule', () => {
    const replay = seed => {
      let state = fixture('stage2'), random = seeded(seed);
      for (let i = 0; i < 60 * 8; i++) {
        state = stepGameSession(state, FRAME, { playerX: 180 + Math.sin(i / 35) * 80 }, random).state;
      }
      return { boss: state.boss, enemyBullets: state.enemyBullets, nextEntityId: state.nextEntityId };
    };
    expect(replay(51)).toEqual(replay(51));
  });
});

describe('staged destruction and lifecycle', () => {
  const lethal = stage => {
    const boss = { ...createBossEncounter(stage, 400, 800), encounterState: BOSS_STATE.READY,
      x: 160, y: 178, hp: 1 };
    const state = fixture(stage, boss);
    state.bullets = [bulletAt(boss)];
    return tick(state);
  };

  it.each(STAGES)('%s clears hazards at zero HP, then cues localized effects before overlay', stage => {
    const first = lethal(stage);
    expect(first.state.phase).toBe('bossDeath');
    expect(first.state.boss).toMatchObject({ hp: 0, alive: false, encounterState: BOSS_STATE.DYING });
    expect(first.state.enemyBullets).toHaveLength(0);
    expect(first.events.filter(event => event.type === 'bossKilled')).toHaveLength(1);
    expect(first.state.explosions).toHaveLength(0);
    let state = first.state;
    const expectations = [[6, 1], [17, 2], [32, 3], [44, 4]];
    for (const [frame, cues] of expectations) {
      const current = Math.round(state.boss.deathElapsed / FRAME);
      ({ state } = advanceFrames(state, frame - current));
      expect(state.boss.deathCueIndex).toBe(cues);
      expect(state.phase).toBe('bossDeath');
      expect(state.enemyBullets).toHaveLength(0);
      if (frame === 32) {
        expect(state.explosions).toHaveLength(3);
        expect(state.particles.filter(part => part.type === 'boss' || part.type === 'debris'))
          .toHaveLength(stage === 'stage3' ? 44 : 34);
      }
      if (frame === 44) expect(state.explosions).toHaveLength(2);
    }
    const finishFrames = stage === 'stage3' ? 90 : 81;
    const current = Math.round(state.boss.deathElapsed / FRAME);
    const ended = advanceFrames(state, finishFrames - current);
    expect(ended.state.boss.encounterState).toBe(BOSS_STATE.DEFEATED);
    expect(ended.state.phase).toBe(stage === 'stage3' ? 'won' : 'transition');
    expect(ended.events.filter(event => event.type === 'bossKilled')).toHaveLength(0);
    expect(ended.events.filter(event => event.type === 'sessionEnded')).toHaveLength(stage === 'stage3' ? 1 : 0);
    expect(ended.state.score).toBe(1000);
  });

  it('pauses and resumes the death clock without stale effects or damage', () => {
    const first = lethal('stage1').state;
    const paused = commandGameSession(first, { type: 'pause' }).state;
    expect(paused.resumePhase).toBe('bossDeath');
    expect(tick(paused, 100).state).toEqual(paused);
    const resumed = commandGameSession(paused, { type: 'resume' }).state;
    const next = tick(resumed).state;
    expect(next.boss.deathElapsed).toBeCloseTo(FRAME);
    expect(next.player.lives).toBe(5);
  });

  it('delays both stage handoff and final victory, with a clean retry session', () => {
    for (const stage of STAGES) {
      const first = lethal(stage);
      expect(first.state.phase).toBe('bossDeath');
      const after = advanceFrames(first.state, stage === 'stage3' ? 90 : 81);
      if (stage === 'stage3') {
        expect(after.state.phase).toBe('won');
        expect(after.events.filter(event => event.type === 'victory')).toHaveLength(1);
      } else {
        expect(after.state.phase).toBe('transition');
        const next = advanceFrames(after.state, 120);
        expect(next.state.currentStage).toBe(STAGES[STAGES.indexOf(stage) + 1]);
        expect(next.events.filter(event => event.type === 'music')).toEqual([
          expect.objectContaining({ track: 'gameplay' })]);
      }
      const fresh = createGameSession(400, 800, false, 2);
      expect(fresh).toMatchObject({ sessionId: 2, phase: 'playing', boss: null,
        bossSpawned: false, score: 0, nextEventId: 1 });
      expect(tick(fresh).events.filter(event => event.type === 'bossKilled')).toHaveLength(0);
    }
  });
});
