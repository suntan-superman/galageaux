/**
 * Development-only entry snapshots for Capture Studio. This module is imported
 * only behind the app's explicit development/opt-in gate; it does not change
 * production simulation, pacing, scoring, or encounter rules.
 */
import waves from '../config/waves.json';
import bossConfig from '../config/boss.json';
import enemiesConfig from '../config/enemies.json';
import { BULLET_HEIGHT, BULLET_WIDTH, ENEMY_SIZE } from '../entities/types';
import { createGameSession, stepGameSession } from '../engine/gameSimulation';
import { calculateDifficultySettings } from '../engine/difficulty';
import { getFormationOffsets } from '../engine/formations';
import { createEnemy, createEnemyBullet } from '../engine/spawner';
import { prepareFlightWave, advanceEnemyFlight } from '../engine/enemyFlight';
import { createPowerup } from '../engine/powerups';
import { BOSS_IDENTITY, BOSS_STATE, createBossEncounter, resolveBossPhase,
  advanceBossEncounter, beginBossDeath } from '../engine/bossEncounter';

const scenario = (id, group, label, description) => ({ id, group, label, description });

export const CAPTURE_SCENARIOS = Object.freeze([
  scenario('stage1_early', 'GAMEPLAY', 'STAGE 1 — EARLY', 'Production opening pace and first enemy entrance.'),
  scenario('stage1_choreography', 'GAMEPLAY', 'STAGE 1 — CHOREOGRAPHY', 'Stage-1 formation breaking into a real coordinated attack.'),
  scenario('stage2_action', 'GAMEPLAY', 'STAGE 2 — ACTION', 'Nebula Assault enemies and stage-specific combat.'),
  scenario('stage3_action', 'GAMEPLAY', 'STAGE 3 — ACTION', 'Asteroid Field enemies and stage-specific combat.'),
  scenario('formation_entrance', 'GAMEPLAY', 'FORMATION ENTRANCE', 'Production V formation arriving on authored flight paths.'),
  scenario('breakaway_pair', 'GAMEPLAY', 'BREAKAWAY PAIR', 'Staggered Level-2 pair breaking from formation.'),
  scenario('mirror_attack', 'GAMEPLAY', 'MIRROR ATTACK', 'Paired wing attackers swing toward mirrored lanes.'),
  scenario('follow_the_leader', 'GAMEPLAY', 'FOLLOW-THE-LEADER', 'Sequential real breakaways from a leader group.'),
  scenario('deep_dive_targeted', 'GAMEPLAY', 'DEEP DIVE / TARGETED ATTACK', 'Stage-3 dive and kamikaze attack families.'),
  scenario('powerup_double', 'POWERUPS', 'DOUBLE', 'Real double-shot pickup already collected.'),
  scenario('powerup_triple', 'POWERUPS', 'TRIPLE', 'Real triple-shot pickup already collected.'),
  scenario('powerup_spread', 'POWERUPS', 'SPREAD ACTION', 'Real spread weapon with an enemy formation ahead.'),
  scenario('powerup_rapid', 'POWERUPS', 'RAPID ACTION', 'Real rapid-fire effect with enemies ahead.'),
  scenario('powerup_shield', 'POWERUPS', 'SHIELD ACTION', 'Real shield effect with an incoming hostile shot.'),
  scenario('powerup_slow', 'POWERUPS', 'SLOW', 'Real slow effect applied to the current enemies.'),
  scenario('boss1_arrival', 'BOSSES', 'BOSS 1 — ARRIVAL', 'Aegis Sentinel announcement and entrance.'),
  scenario('boss1_phase1', 'BOSSES', 'BOSS 1 — PHASE 1', 'Aegis Sentinel opening combat.'),
  scenario('boss1_phase2', 'BOSSES', 'BOSS 1 — PHASE 2', 'Aegis Sentinel second configured attack phase.'),
  scenario('boss1_final', 'BOSSES', 'BOSS 1 — FINAL PHASE', 'Aegis Sentinel final configured attack phase.'),
  scenario('boss1_death', 'BOSSES', 'BOSS 1 — DEATH / PAYOFF', 'One hit from the production destruction sequence.'),
  scenario('boss2_arrival', 'BOSSES', 'BOSS 2 — ARRIVAL', 'Violet Wraith announcement and entrance.'),
  scenario('boss2_phase1', 'BOSSES', 'BOSS 2 — PHASE 1', 'Violet Wraith opening combat.'),
  scenario('boss2_phase2', 'BOSSES', 'BOSS 2 — PHASE 2', 'Violet Wraith second configured attack phase.'),
  scenario('boss2_final', 'BOSSES', 'BOSS 2 — FINAL PHASE', 'Violet Wraith final configured attack phase.'),
  scenario('boss2_death', 'BOSSES', 'BOSS 2 — DEATH / PAYOFF', 'One hit from the production destruction sequence.'),
  scenario('boss3_arrival', 'BOSSES', 'BOSS 3 — ARRIVAL', 'Inferno Citadel announcement and entrance.'),
  scenario('boss3_phase1', 'BOSSES', 'BOSS 3 — PHASE 1', 'Inferno Citadel opening combat.'),
  scenario('boss3_phase2', 'BOSSES', 'BOSS 3 — PHASE 2', 'Inferno Citadel second configured attack phase.'),
  scenario('boss3_final', 'BOSSES', 'BOSS 3 — FINAL PHASE', 'Inferno Citadel fourth configured attack phase.'),
  scenario('boss3_death', 'BOSSES', 'BOSS 3 — DEATH / PAYOFF', 'One hit from staged final-boss destruction.'),
  scenario('bonus_mode', 'PRESENTATION', 'BONUS MODE', 'Production Bonus Shoot-Out with the countdown active.'),
  scenario('game_over', 'PRESENTATION', 'GAME OVER', 'Production loss overlay after a real lethal hit.'),
  scenario('final_victory', 'PRESENTATION', 'FINAL VICTORY', 'Staged Boss-3 destruction followed by the real victory overlay.'),
]);

const SCENARIO_IDS = new Set(CAPTURE_SCENARIOS.map(({ id }) => id));
const FRAME = 1 / 60;
const LEVEL_BY_STAGE = { stage1: 3, stage2: 4, stage3: 6 };
// Representative capture-only totals. The game continues to award all points
// through the normal collision/scoring logic once the scenario starts.
const SCORE_BY_STAGE = { stage1: 1800, stage2: 8400, stage3: 21300 };
const BOSS_NUMBER_TO_STAGE = { '1': 'stage1', '2': 'stage2', '3': 'stage3' };

function captureSeed(id) {
  let value = 2166136261;
  for (let index = 0; index < id.length; index++) {
    value = Math.imul(value ^ id.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}

/** Stateful generator: recreate it from the same seed to replay a scenario. */
export function createCaptureRng(seed) {
  let value = Number.isFinite(seed) ? seed >>> 0 : 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function stageSnapshot(stageKey, width, height, sessionId, level = LEVEL_BY_STAGE[stageKey]) {
  const base = createGameSession(width, height, false, sessionId);
  return { ...base, currentStage: stageKey,
    level, levelBanner: `LEVEL ${String(level).padStart(2, '0')}`,
    score: SCORE_BY_STAGE[stageKey],
    sessionStats: { ...base.sessionStats, levelsCompleted: level - 1,
      bossesDefeated: stageKey === 'stage3' ? 2 : stageKey === 'stage2' ? 1 : 0 } };
}

/** Make an actual possible V-wave composition with production enemy stats and paths. */
function attachWave(state, types, waveId, random) {
  const difficulty = calculateDifficultySettings(waves[state.currentStage], state.level, state.bonusTimeLeft > 0);
  const offsets = getFormationOffsets('v', types.length);
  const raw = types.map((type, index) => {
    if (!waves[state.currentStage].enemyTypes.includes(type)) throw new Error(`Invalid ${type} for ${state.currentStage}`);
    const size = enemiesConfig[type].size ?? ENEMY_SIZE;
    return createEnemy({ type,
      x: state.width / 2 + offsets[index].dx - size / 2,
      y: -ENEMY_SIZE * 2 + offsets[index].dy - index * 8,
      baseSpeed: difficulty.enemySpeed, pattern: 'dive',
      canShoot: ['shooter', 'dive', 'elite', 'tank'].includes(type), random,
      fireCooldownMultiplier: difficulty.enemyFireCooldownMultiplier });
  });
  const prepared = prepareFlightWave(raw, { width: state.width, height: state.height,
    time: state.time, stage: state.currentStage, level: state.level, waveId });
  state.enemies = prepared.map(enemy => ({ ...enemy, id: `${state.sessionId}:${state.nextEntityId++}` }));
  state.totalEnemiesSpawned = prepared.length;
  state.nextFormationId = waveId + 1;
  state.initialWaveSpawned = true;
  state.enemySpawnTimer = 0;
  return state;
}

/** Advance only authored production flight paths to a convenient capture frame. */
function advanceFlightTo(state, targetTime) {
  while (state.time + FRAME / 2 < targetTime) {
    const dt = Math.min(FRAME, targetTime - state.time);
    state.time += dt;
    state.enemies = state.enemies.map(enemy => advanceEnemyFlight(enemy, dt, {
      width: state.width, height: state.height, time: state.time,
      level: state.level, player: state.player,
    })).filter(Boolean);
  }
  return state;
}

function makeWaveScenario(stageKey, width, height, sessionId, types, waveId, captureMoment, random,
  level = LEVEL_BY_STAGE[stageKey]) {
  const state = attachWave(stageSnapshot(stageKey, width, height, sessionId, level), types, waveId, random);
  const targetTime = typeof captureMoment === 'function' ? captureMoment(state.enemies) : captureMoment;
  return advanceFlightTo(state, targetTime);
}

function afterFirstAttack(extra = 0.34) {
  return enemies => Math.min(...enemies.map(enemy => enemy.attackAt)) + extra;
}

function collectRealPowerup(state, kind, random) {
  const powerup = createPowerup(state.player.x + state.player.width / 2 - 10, state.player.y, kind);
  state.powerups = [{ ...powerup, id: `${state.sessionId}:${state.nextEntityId++}` }];
  const result = stepGameSession(state, FRAME, {}, random);
  if (!result.events.some(event => event.type === 'powerupCollected' && event.kind === kind)) {
    throw new Error(`Capture powerup ${kind} did not enter production pickup logic`);
  }
  return result.state;
}

function makePowerupScenario(kind, width, height, sessionId, random) {
  let state = makeWaveScenario('stage2', width, height, sessionId,
    ['shooter', 'scout', 'elite', 'grunt', 'shooter'], 2, 1.35, random);
  state = collectRealPowerup(state, kind, random);
  if (kind === 'shield') {
    const shot = createEnemyBullet({ x: state.player.x + state.player.width / 2 - 12,
      y: state.player.y - 240, size: 24 }, BULLET_WIDTH, BULLET_HEIGHT,
    calculateDifficultySettings(waves.stage2, state.level).enemyBulletSpeed);
    state.enemyBullets = [{ ...shot, id: `${state.sessionId}:${state.nextEntityId++}` }];
  }
  return state;
}

function makeBossScenario(stageKey, variant, width, height, sessionId) {
  const state = stageSnapshot(stageKey, width, height, sessionId);
  state.boss = createBossEncounter(stageKey, width, height);
  state.bossSpawned = true;
  state.initialWaveSpawned = true;
  state.totalEnemiesSpawned = waves[stageKey].maxEnemies;
  state.phase = 'boss';
  if (variant === 'arrival') return state;

  state.boss = { ...state.boss, y: state.boss.targetY,
    encounterState: BOSS_STATE.READY, stateElapsed: 0 };
  if (variant === 'phase1') return state;

  const phases = bossConfig[stageKey].phases;
  const phaseIndex = variant === 'phase2' ? 1 : phases.length - 1;
  state.boss = resolveBossPhase({ ...state.boss, hp: phases[phaseIndex - 1].hpThreshold }, stageKey).boss;
  if (state.boss.phaseIndex !== phaseIndex || state.boss.encounterState !== BOSS_STATE.PHASE_TRANSITION) {
    throw new Error(`Capture ${stageKey} ${variant} did not resolve through production phase logic`);
  }
  // The configured phase transition runs through the production encounter
  // helper, leaving a combat-ready phase rather than an invented attack state.
  state.boss = advanceBossEncounter(state.boss, BOSS_IDENTITY[stageKey].phaseChange + FRAME,
    { stageKey, width, height, player: state.player }).boss;
  if (variant === 'death') {
    state.boss = { ...state.boss, hp: 1 };
    state.autoFire = true; // Controlled, real player shots trigger the payoff.
  }
  return state;
}

function makeGameOver(width, height, sessionId, random) {
  const state = stageSnapshot('stage2', width, height, sessionId);
  state.score = 7420; // Capture-only representative history; loss is engine-owned.
  state.player.lives = 1;
  state.initialWaveSpawned = true;
  const shot = createEnemyBullet({ x: state.player.x + state.player.width / 2 - 12,
    y: state.player.y - 24, size: 24 }, BULLET_WIDTH, BULLET_HEIGHT,
  calculateDifficultySettings(waves.stage2, state.level).enemyBulletSpeed);
  state.enemyBullets = [{ ...shot, id: `${state.sessionId}:${state.nextEntityId++}` }];
  const result = stepGameSession(state, FRAME, {}, random);
  if (result.state.phase !== 'lost') throw new Error('Capture loss did not resolve through production simulation');
  return result.state;
}

function makeFinalVictory(width, height, sessionId) {
  const state = makeBossScenario('stage3', 'final', width, height, sessionId);
  state.score = 48750; // Capture-only representative final score, never post-render alteration.
  state.sessionStats.bossesDefeated = 3;
  state.boss = beginBossDeath(state.boss);
  state.phase = 'bossDeath';
  return state;
}

/**
 * Fresh production-compatible snapshot and stable RNG seed. `sessionId` is
 * deliberately excluded from the seed so Reset Scenario reproduces visuals.
 */
export function createCaptureInitialState(id, width, height, sessionId = 1) {
  if (!SCENARIO_IDS.has(id)) throw new Error(`Unknown capture scenario: ${id}`);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('Capture scenario requires positive viewport dimensions');
  }
  const seed = captureSeed(id);
  // Setup and ongoing simulation each have deterministic, independent streams.
  const setupRandom = createCaptureRng(seed ^ 0x9e3779b9);
  let state;
  switch (id) {
    case 'stage1_early':
      state = createGameSession(width, height, false, sessionId);
      break;
    case 'stage1_choreography':
      state = makeWaveScenario('stage1', width, height, sessionId,
        ['dive', 'shooter', 'grunt', 'shooter', 'dive'], 3, afterFirstAttack(), setupRandom);
      break;
    case 'stage2_action':
      state = makeWaveScenario('stage2', width, height, sessionId,
        ['shooter', 'scout', 'elite', 'grunt', 'shooter'], 2, 1.4, setupRandom);
      break;
    case 'stage3_action':
      state = makeWaveScenario('stage3', width, height, sessionId,
        ['dive', 'shooter', 'tank', 'kamikaze', 'scout'], 3, 1.25, setupRandom);
      break;
    case 'formation_entrance':
      state = makeWaveScenario('stage1', width, height, sessionId,
        ['grunt', 'shooter', 'dive', 'shooter', 'grunt'], 3, 0.95, setupRandom);
      break;
    case 'breakaway_pair':
      state = makeWaveScenario('stage1', width, height, sessionId,
        ['dive', 'dive', 'grunt'], 2, afterFirstAttack(0.36), setupRandom, 2);
      break;
    case 'mirror_attack':
      state = makeWaveScenario('stage1', width, height, sessionId,
        ['dive', 'shooter', 'grunt', 'shooter', 'dive'], 3, afterFirstAttack(0.43), setupRandom);
      break;
    case 'follow_the_leader':
      state = makeWaveScenario('stage2', width, height, sessionId,
        ['elite', 'elite', 'elite', 'shooter', 'scout'], 4, afterFirstAttack(0.47), setupRandom);
      break;
    case 'deep_dive_targeted':
      state = makeWaveScenario('stage3', width, height, sessionId,
        ['dive', 'kamikaze', 'dive', 'shooter', 'tank'], 4,
        enemies => Math.max(enemies[0].attackAt, enemies[1].attackAt) + 0.33, setupRandom);
      break;
    case 'bonus_mode':
      state = stageSnapshot('stage1', width, height, sessionId, 2);
      state.bonusTimeLeft = 10;
      state.phase = 'bonus';
      attachWave(state, ['dive', 'shooter', 'grunt'], 2, setupRandom);
      advanceFlightTo(state, 0.9);
      break;
    case 'game_over':
      state = makeGameOver(width, height, sessionId, setupRandom);
      break;
    case 'final_victory':
      state = makeFinalVictory(width, height, sessionId);
      break;
    default: {
      const powerup = /^powerup_(double|triple|spread|rapid|shield|slow)$/.exec(id);
      const boss = /^boss([123])_(arrival|phase1|phase2|final|death)$/.exec(id);
      if (powerup) state = makePowerupScenario(powerup[1], width, height, sessionId, setupRandom);
      else if (boss) state = makeBossScenario(BOSS_NUMBER_TO_STAGE[boss[1]], boss[2], width, height, sessionId);
      else throw new Error(`Unimplemented capture scenario: ${id}`);
    }
  }
  return { state, seed };
}
