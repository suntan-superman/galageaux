/** Live, simulation-owned choreography for the three configured guardians. */
import bossConfig from '../config/boss.json';
import { createBoss } from './boss';
import { makeFlightPath, sampleFlightPath } from './flightPaths';

export const BOSS_STATE = Object.freeze({ ANNOUNCING: 'ANNOUNCING', ENTERING: 'ENTERING',
  READY: 'READY', TELEGRAPHING: 'TELEGRAPHING', ATTACKING: 'ATTACKING',
  RECOVERING: 'RECOVERING', PHASE_TRANSITION: 'PHASE_TRANSITION',
  DYING: 'DYING', DEFEATED: 'DEFEATED' });

export const BOSS_IDENTITY = Object.freeze({
  stage1: { name: 'AEGIS SENTINEL', color: '#58cafa', phaseColors: ['#58cafa', '#84ddff', '#b6f2ff'], entrance: 1.9, ready: 0.42,
    recovery: [1.8, 1.65, 1.5], range: 46, phaseChange: 0.8 },
  stage2: { name: 'VIOLET WRAITH', color: '#cf86ed', phaseColors: ['#cf86ed', '#ec93e8', '#ffb2dd'], entrance: 1.7, ready: 0.36,
    recovery: [1.5, 1.35, 1.25], range: 82, phaseChange: 0.9 },
  stage3: { name: 'INFERNO CITADEL', color: '#ff895a', phaseColors: ['#ff895a', '#ffa76e', '#ffc28e', '#fff0cc'], entrance: 2.15, ready: 0.48,
    recovery: [1.75, 1.6, 1.45, 1.3], range: 58, phaseChange: 1.05 },
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const point = (x, y) => ({ x, y });

export function bossPhaseIndex(hp, stageKey) {
  const phases = bossConfig[stageKey]?.phases || [];
  for (let index = 0; index < phases.length; index++) if (hp > phases[index].hpThreshold) return index;
  return Math.max(0, phases.length - 1);
}

export function bossAttackFamily(boss, stageKey) {
  const configured = bossConfig[stageKey]?.phases[boss.phaseIndex]?.pattern || 'radial';
  // Final-phase combination: familiar volleys separated by a full recovery.
  if (stageKey === 'stage3' && boss.phaseIndex === 3 && boss.attackIndex % 2 === 1) return 'radial';
  return configured;
}

export function bossTelegraphDuration(pattern, stageKey) {
  const danger = { radial: 0.62, spread: 0.58, spiral: 0.66, aimed: 0.62, burst: 0.74 };
  return danger[pattern] + (stageKey === 'stage3' ? 0.1 : stageKey === 'stage1' ? 0.04 : 0);
}

function path(points, width, height, duration) {
  return { ...makeFlightPath(points, width, height, 100), duration };
}

export function createBossEncounter(stageKey, width, height) {
  const base = createBoss(stageKey, width), identity = BOSS_IDENTITY[stageKey];
  if (!base || !identity) return null;
  // Leave the old 80x60 AABB intact. The lower combat lane separates the hull
  // from the fixed HUD/health strip and shortens hostile-bullet travel modestly.
  const targetY = Math.min(height * 0.27, 178);
  return { ...base, targetY, encounterState: BOSS_STATE.ANNOUNCING,
    encounterElapsed: 0, stateElapsed: 0, phaseElapsed: 0, attackElapsed: 0,
    attackIndex: 0, attackFamily: null, targetSnapshot: null,
    movementPath: null, movementElapsed: 0, telegraph: 0, recovery: 0,
    deathElapsed: 0, deathCueIndex: 0, name: identity.name };
}

function normalizedLegacy(boss) {
  if (boss.encounterState) return boss;
  // External test fixtures/old snapshots get a stable explicit state without
  // moving their authored coordinates or reintroducing entrance firing.
  return { ...boss, encounterState: boss.y >= boss.targetY ? BOSS_STATE.READY : BOSS_STATE.ANNOUNCING,
    encounterElapsed: 0, stateElapsed: 0, phaseElapsed: 0, attackElapsed: 0,
    attackIndex: 0, attackFamily: null, targetSnapshot: null,
    movementPath: null, movementElapsed: 0, telegraph: 0, recovery: 0,
    deathElapsed: 0, deathCueIndex: 0 };
}

function beginTelegraph(boss, stageKey, player) {
  const attackFamily = bossAttackFamily(boss, stageKey);
  return { ...boss, encounterState: BOSS_STATE.TELEGRAPHING, stateElapsed: 0,
    attackElapsed: 0, attackFamily, telegraph: 0,
    targetSnapshot: point(player.x + player.width / 2, player.y + player.height / 2) };
}

function repositionPath(boss, stageKey, width, height, duration) {
  const identity = BOSS_IDENTITY[stageKey], center = width / 2 - boss.width / 2;
  const offsets = stageKey === 'stage2' ? [1, -1, 0, -1, 1, 0]
    : stageKey === 'stage3' ? [-1, 1, 0, 1, -1, 0] : [1, -1, 0];
  const side = offsets[boss.attackIndex % offsets.length];
  const endX = clamp(center + side * identity.range, 16, width - boss.width - 16);
  const bend = stageKey === 'stage2' ? 16 : stageKey === 'stage3' ? 10 : 7;
  return path([point(boss.x, boss.y), point(boss.x + (endX - boss.x) * 0.3, boss.y - bend),
    point(boss.x + (endX - boss.x) * 0.72, boss.targetY - bend), point(endX, boss.targetY)],
  width, height, duration);
}

/** Advance once. `volley` is emitted only after player-bullet collision resolution. */
export function advanceBossEncounter(input, dt, { stageKey, width, height, player }) {
  if (!input?.alive) return { boss: input, volley: null, appeared: false };
  const identity = BOSS_IDENTITY[stageKey];
  if (!identity) return { boss: input, volley: null, appeared: false };
  const previous = normalizedLegacy(input);
  let boss = { ...previous, elapsedTime: (previous.elapsedTime || 0) + dt,
    encounterElapsed: (previous.encounterElapsed || 0) + dt,
    stateElapsed: (previous.stateElapsed || 0) + dt,
    phaseElapsed: (previous.phaseElapsed || 0) + dt };
  const elapsed = boss.stateElapsed;
  let appeared = false, volley = null;
  switch (boss.encounterState) {
    case BOSS_STATE.ANNOUNCING:
      if (elapsed >= 1.15) {
        boss.encounterState = BOSS_STATE.ENTERING;
        boss.stateElapsed = 0;
        boss.movementElapsed = 0;
        boss.movementPath = path([point(boss.x, boss.y), point(boss.x, height * 0.015),
          point(boss.x, boss.targetY * 0.78), point(boss.x, boss.targetY)],
        width, height, identity.entrance);
        appeared = true;
      }
      break;
    case BOSS_STATE.ENTERING: {
      const sampled = sampleFlightPath(boss.movementPath, elapsed, width, height);
      boss.x = sampled.x; boss.y = sampled.y;
      boss.movementElapsed = elapsed;
      if (sampled.progress >= 1) {
        boss.y = boss.targetY;
        boss.encounterState = BOSS_STATE.READY;
        boss.stateElapsed = 0;
        boss.movementPath = null;
      }
      break;
    }
    case BOSS_STATE.READY:
      if (elapsed >= identity.ready) boss = beginTelegraph(boss, stageKey, player);
      break;
    case BOSS_STATE.TELEGRAPHING: {
      const duration = bossTelegraphDuration(boss.attackFamily, stageKey);
      boss.telegraph = clamp(elapsed / duration, 0, 1);
      boss.attackElapsed = elapsed;
      if (elapsed >= duration) {
        boss.encounterState = BOSS_STATE.ATTACKING;
        boss.stateElapsed = 0;
        boss.attackElapsed = 0;
        boss.telegraph = 0;
        volley = { pattern: boss.attackFamily, target: boss.targetSnapshot };
      }
      break;
    }
    case BOSS_STATE.ATTACKING:
      boss.attackElapsed = elapsed;
      if (elapsed >= 0.12) {
        const recovery = identity.recovery[Math.min(boss.phaseIndex, identity.recovery.length - 1)];
        boss.encounterState = BOSS_STATE.RECOVERING;
        boss.stateElapsed = 0;
        boss.recovery = recovery;
        boss.movementElapsed = 0;
        boss.movementPath = repositionPath(boss, stageKey, width, height, recovery);
      }
      break;
    case BOSS_STATE.RECOVERING: {
      const sampled = sampleFlightPath(boss.movementPath, elapsed, width, height);
      boss.x = sampled.x; boss.y = sampled.y;
      boss.movementElapsed = elapsed;
      if (elapsed >= boss.recovery) {
        boss.attackIndex++;
        boss.movementPath = null;
        boss = beginTelegraph(boss, stageKey, player);
      }
      break;
    }
    case BOSS_STATE.PHASE_TRANSITION:
      if (elapsed >= identity.phaseChange) {
        boss.encounterState = BOSS_STATE.READY;
        boss.stateElapsed = 0;
        boss.telegraph = 0;
      }
      break;
    default:
      break;
  }
  return { boss, volley, appeared };
}

export function resolveBossPhase(boss, stageKey) {
  if (!boss?.alive || !boss.encounterState) return { boss, changed: false };
  const index = bossPhaseIndex(boss.hp, stageKey);
  if (index <= boss.phaseIndex) return { boss, changed: false };
  return { boss: { ...boss, phaseIndex: index, phaseElapsed: 0, attackIndex: 0,
    encounterState: BOSS_STATE.PHASE_TRANSITION, stateElapsed: 0,
    attackFamily: null, targetSnapshot: null, telegraph: 0,
    movementPath: null, movementElapsed: 0 }, changed: true };
}

export function beginBossDeath(boss) {
  return { ...boss, alive: false, hp: 0, encounterState: BOSS_STATE.DYING,
    stateElapsed: 0, deathElapsed: 0, deathCueIndex: 0,
    attackFamily: null, targetSnapshot: null, telegraph: 0, movementPath: null };
}
