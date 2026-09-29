/** The live gameplay boundary: owned snapshot -> next snapshot + ordered events.
 * No React setters, wall-clock deadlines, storage, audio or pending callbacks.
 * Gameplay time stops in tutorial/pause/terminal states and during stage transitions.
 */
import waves from '../config/waves.json';
import { STAGES } from '../constants/game';
import { PLAYER_WIDTH, PLAYER_HEIGHT, BULLET_WIDTH, BULLET_HEIGHT } from '../entities/types';
import { spawnWave, createEnemyBullet } from './spawner';
import { calculateDifficultySettings, calculateEnemyFireCooldown, getLevelTarget } from './difficulty';
import { createPlayerBullets } from './projectiles';
import { createBoss, updateBoss, bossCurrentPattern } from './boss';
import { generateBossBullets } from './boss-patterns';
import { checkBulletEnemyCollisions, checkBulletBossCollisions, checkEnemyBulletPlayerCollisions, checkPowerupCollisions } from './collisionHandlers';
import { createPowerup, updatePowerup, POWERUP_DURATION } from './powerups';
import { spawnExplosion, spawnExplosionParticles, spawnShieldRipple, updateParticles, updateExplosion } from './particles';
import { createScreenshake, triggerScreenshake, updateScreenshake } from './screenshake';
import { applyAllLimits } from './entityLimits';

export const MAX_FRAME_SECONDS = 0.1;
export const isGameplayActive = state => ['playing', 'bonus', 'boss'].includes(state.phase);
const remaining = (time, dt) => Math.max(0, time - dt < 1e-9 ? 0 : time - dt);
const activePhase = state => state.boss?.alive ? 'boss' : state.bonusTimeLeft > 0 ? 'bonus' : 'playing';

export function createGameSession(width, height, tutorial = false, sessionId = 1) {
  return {
    sessionId, width, height, phase: tutorial ? 'tutorial' : 'playing', resumePhase: null,
    time: 0, nextEntityId: 1, nextEventId: 1,
    player: { x: width / 2 - PLAYER_WIDTH / 2, y: height * 0.8, width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT, alive: true, lives: 5, weaponLevel: 1, weaponType: null, shield: false, rapidFire: false },
    bullets: [], enemyBullets: [], enemies: [], particles: [], explosions: [], powerups: [],
    scoreTexts: [], muzzleFlashes: [], boss: null, bossSpawned: false, initialWaveSpawned: false,
    score: 0, level: 1, levelKills: 0, levelHits: 0, levelBanner: 'LEVEL 01', currentStage: 'stage1',
    bonusTimeLeft: 0, transitionTimeLeft: 0, totalEnemiesSpawned: 0, enemySpawnTimer: 0,
    fireCooldown: 0, autoFire: false, combo: 0, comboTimer: 0, playerHitFlash: 0, hudPulse: 0,
    timers: { weapon: 0, rapid: 0, shield: 0, slow: 0 },
    shake: createScreenshake(), screenOffset: { ox: 0, oy: 0 },
    sessionStats: { enemiesKilled: 0, bossesDefeated: 0, powerupsCollected: 0, maxCombo: 0, levelsCompleted: 0, hitsTaken: 0 },
  };
}

function copySnapshot(state) {
  return { ...state, player: { ...state.player }, timers: { ...state.timers }, shake: { ...state.shake },
    sessionStats: { ...state.sessionStats }, boss: state.boss && { ...state.boss },
    bullets: [...state.bullets], enemyBullets: [...state.enemyBullets], enemies: [...state.enemies],
    particles: [...state.particles], explosions: [...state.explosions], powerups: [...state.powerups],
    scoreTexts: [...state.scoreTexts], muzzleFlashes: [...state.muzzleFlashes] };
}
const identify = (state, entity) => ({ ...entity, id: `${state.sessionId}:${state.nextEntityId++}` });
function emit(state, events, type, data = {}) {
  events.push({ id: `${state.sessionId}:${state.nextEventId++}`, sessionId: state.sessionId, type, ...data });
}
function popup(state, x, y, text, color, life = 1.2, extra = {}) {
  state.scoreTexts.push(identify(state, { x, y, text, color, life, ...extra }));
}
function fire(state, events) {
  if (!isGameplayActive(state) || !state.player.alive || state.fireCooldown > 1e-9) return;
  const shots = createPlayerBullets(state.player).map(shot => identify(state, shot));
  if (!shots.length) return;
  state.bullets.push(...shots);
  // Carry substep overshoot into the next shot, never discard elapsed cooldown.
  state.fireCooldown = (state.player.rapidFire ? 0.12 : 0.22) + Math.min(0, state.fireCooldown);
  const center = state.player.x + state.player.width / 2;
  const spread = state.player.weaponType === 'spread';
  const offsets = spread || state.player.weaponLevel >= 3 ? [-12, 0, 12] : state.player.weaponLevel === 2 ? [-8, 8] : [0];
  state.muzzleFlashes.push(...offsets.map(offset => identify(state, { x: center + offset, y: state.player.y - BULLET_HEIGHT, life: 0.1 })));
  const cue = spread ? 'playerShootSpread' : state.player.rapidFire && offsets.length === 1 ? 'playerShootRapid' : 'playerShoot';
  emit(state, events, 'shotFired', { cue, volume: 0.3, projectileIds: shots.map(shot => shot.id) });
}

/** User commands are committed synchronously, including shots between RAF callbacks. */
export function commandGameSession(snapshot, command) {
  const state = copySnapshot(snapshot), events = [];
  if (command.type === 'start' && state.phase === 'tutorial') state.phase = 'playing';
  else if (command.type === 'pause' && (isGameplayActive(state) || state.phase === 'transition')) {
    state.resumePhase = state.phase; state.phase = 'paused';
  } else if (command.type === 'resume' && state.phase === 'paused') {
    state.phase = state.resumePhase || activePhase(state); state.resumePhase = null;
  } else if (command.type === 'toggleAutoFire' && state.phase !== 'won' && state.phase !== 'lost') state.autoFire = !state.autoFire;
  else if (command.type === 'move' && isGameplayActive(state) && Number.isFinite(command.x)) {
    state.player.x = Math.max(0, Math.min(state.width - state.player.width, command.x));
  } else if (command.type === 'fire') fire(state, events);
  return { state: { ...state, ...applyAllLimits(state) }, events };
}

function expirePowerups(state, dt) {
  for (const kind of Object.keys(state.timers)) state.timers[kind] = remaining(state.timers[kind], dt);
  if (!state.timers.weapon) { state.player.weaponLevel = 1; state.player.weaponType = null; }
  if (!state.timers.rapid) state.player.rapidFire = false;
  if (!state.timers.shield) state.player.shield = false;
  state.enemies = state.enemies.map(enemy => {
    const baseSpeed = enemy.baseSpeed ?? enemy.speed;
    return { ...enemy, baseSpeed, speed: baseSpeed * (state.timers.slow > 0 ? 0.6 : 1) };
  });
}
function collect(state, events, kind) {
  state.sessionStats.powerupsCollected++;
  emit(state, events, 'powerupCollected', { kind });
  if (['double', 'triple', 'spread'].includes(kind)) {
    // Same pickup refreshes; another weapon replaces it. No stacking expiry callbacks.
    state.player.weaponType = kind; state.player.weaponLevel = kind === 'double' ? 2 : 3;
    state.timers.weapon = POWERUP_DURATION[kind];
  } else if (kind === 'rapid') {
    state.player.rapidFire = true; state.timers.rapid = POWERUP_DURATION.rapid;
  } else if (kind === 'shield') {
    state.player.shield = true; state.timers.shield = 4;
  } else if (kind === 'slow') {
    state.timers.slow = 3;
    state.enemies = state.enemies.map(enemy => ({ ...enemy, speed: (enemy.baseSpeed ?? enemy.speed) * 0.6 }));
  }
}
function damagePlayer(state, events) {
  const x = state.player.x + state.player.width / 2, y = state.player.y + state.player.height / 2;
  if (state.player.shield) {
    state.player.shield = false; state.timers.shield = 0;
    state.particles.push(...spawnShieldRipple(x, y, state.player.width * 0.65));
    popup(state, x, y - 30, 'Shield Saved!', '#38bdf8');
    emit(state, events, 'shieldHit'); return;
  }
  state.player.lives--; state.sessionStats.hitsTaken++; state.levelHits++;
  triggerScreenshake(state.shake, 10, 0.3);
  state.playerHitFlash = 1; state.hudPulse = 1;
  state.explosions.push(spawnExplosion(x, y, 34, 0.4, '#3b82f6'));
  state.particles.push(...spawnExplosionParticles(x, y, 30, 'energy', '#3b82f6'));
  popup(state, x, y - 20, '-1 LIFE', '#f87171');
  // Preserve the existing intended hit-clear policy; do not activate contact damage/i-frames.
  state.bullets = []; state.enemies = []; state.enemyBullets = [];
  emit(state, events, 'playerHit');
  if (state.player.lives <= 0) {
    state.player.alive = false; state.phase = 'lost';
    emit(state, events, 'sessionEnded', { outcome: 'lost' });
  }
}
function agePresentation(state, dt) {
  state.screenOffset = updateScreenshake(state.shake, dt);
  state.playerHitFlash = Math.max(0, state.playerHitFlash - dt * 2.5);
  state.hudPulse = Math.max(0, state.hudPulse - dt * 2);
  state.muzzleFlashes = state.muzzleFlashes.map(flash => ({ ...flash, life: remaining(flash.life, dt) })).filter(flash => flash.life > 0);
  state.scoreTexts = state.scoreTexts.map(text => ({ ...text, y: text.y - dt * 50, life: remaining(text.life, dt) })).filter(text => text.life > 0);
  state.particles = updateParticles(state.particles, dt);
  state.explosions = state.explosions.map(explosion => updateExplosion(explosion, dt)).filter(explosion => explosion && explosion.life > 0);
}
function addWave(state, difficulty, stage, random) {
  const space = Math.max(0, difficulty.maxEnemies - state.enemies.length);
  const spawned = spawnWave({
    width: state.width, enemySpeed: difficulty.enemySpeed, patterns: stage.patterns, enemyTypes: stage.enemyTypes, random,
    formationChance: difficulty.formationChance, formationSize: difficulty.formationSize,
    fireCooldownMultiplier: difficulty.enemyFireCooldownMultiplier,
  }).slice(0, space);
  state.totalEnemiesSpawned += spawned.length;
  state.enemies.push(...spawned.map(enemy => identify(state, { ...enemy, speed: enemy.speed * (state.timers.slow > 0 ? 0.6 : 1) })));
  state.initialWaveSpawned = true; state.enemySpawnTimer = 0;
}
function moveBullet(bullet, dt, fallbackDirection) {
  const vx = bullet.vx ?? 0, vy = bullet.vy ?? fallbackDirection * bullet.speed;
  return { ...bullet, vx, vy, x: bullet.x + vx * dt, y: bullet.y + vy * dt };
}
function bulletInBounds(bullet, state) {
  // Entry volleys above the screen must survive while travelling downward.
  return bullet.y < state.height + bullet.height && (bullet.y + bullet.height > 0 || bullet.vy > 0)
    && bullet.x > -bullet.width * 2 && bullet.x < state.width + bullet.width * 2;
}
function mergeCollisionEffects(state, results) {
  state.particles.push(...(results.particles || []));
  state.explosions.push(...(results.explosions || []));
  state.scoreTexts.push(...(results.scoreTexts || []).map(text => identify(state, text)));
  state.score += results.scoreGain || 0;
}

function advance(state, dt, input, events, random) {
  if (state.phase === 'transition') {
    agePresentation(state, dt);
    state.transitionTimeLeft = remaining(state.transitionTimeLeft, dt);
    if (!state.transitionTimeLeft) {
      state.currentStage = STAGES[STAGES.indexOf(state.currentStage) + 1];
      state.boss = null; state.bossSpawned = false; state.totalEnemiesSpawned = 0;
      state.enemies = []; state.bullets = []; state.enemyBullets = [];
      state.initialWaveSpawned = false; state.enemySpawnTimer = 0; state.phase = activePhase(state);
      emit(state, events, 'music', { track: 'gameplay' });
    }
    return;
  }
  if (!isGameplayActive(state)) return;
  if (state.player.lives <= 0) {
    state.player.alive = false; state.phase = 'lost'; emit(state, events, 'sessionEnded', { outcome: 'lost' }); return;
  }
  state.time += dt;
  agePresentation(state, dt);
  expirePowerups(state, dt);
  state.comboTimer = remaining(state.comboTimer, dt);
  if (!state.comboTimer) state.combo = 0;
  const wasBonus = state.bonusTimeLeft > 0;
  const stage = waves[state.currentStage];
  const difficulty = calculateDifficultySettings(stage, state.level, wasBonus);
  if (Number.isFinite(input.playerX)) state.player.x = Math.max(0, Math.min(state.width - state.player.width, input.playerX));
  state.fireCooldown = state.autoFire ? state.fireCooldown - dt : remaining(state.fireCooldown, dt);
  if (state.autoFire || input.firePressed) fire(state, events);
  state.bullets = state.bullets.map(bullet => moveBullet(bullet, dt, -1)).filter(bullet => bulletInBounds(bullet, state));
  state.enemyBullets = state.enemyBullets.map(bullet => moveBullet(bullet, dt, 1)).filter(bullet => bulletInBounds(bullet, state));
  state.powerups = state.powerups.map(powerup => updatePowerup(powerup, dt)).filter(powerup => powerup.y < state.height + powerup.size && !powerup.collected);
  state.enemies = state.enemies.map(enemy => {
    let x = enemy.x, y = enemy.y + enemy.speed * dt;
    if (enemy.behavior === 'chase') {
      const dx = state.player.x + state.player.width / 2 - enemy.x - enemy.size / 2;
      const dy = state.player.y + state.player.height / 2 - enemy.y - enemy.size / 2;
      const distance = Math.hypot(dx, dy);
      if (distance) { x += dx / distance * enemy.speed * dt; y = enemy.y + dy / distance * enemy.speed * dt; }
    } else if (enemy.pattern === 'zigzag') x = enemy.baseX + Math.sin(y / state.height * Math.PI * 4) * 40;
    else if (enemy.pattern === 'dive') x = enemy.baseX + Math.sin(y / state.height * Math.PI * 2) * 70;
    return { ...enemy, x, y };
  }).filter(enemy => enemy.y <= state.height);
  for (const enemy of state.enemies) {
    if (!enemy.canShoot) continue;
    enemy.fireCooldown = (enemy.fireCooldown ?? 0) - dt;
    if (enemy.fireCooldown <= 0 && enemy.y > 0 && enemy.y < state.height * 0.8) {
      state.enemyBullets.push(identify(state, createEnemyBullet(enemy, BULLET_WIDTH, BULLET_HEIGHT, difficulty.enemyBulletSpeed)));
      enemy.fireCooldown = calculateEnemyFireCooldown(state.level, enemy.type, random, difficulty.enemyFireCooldownMultiplier);
    }
  }
  if (!state.bossSpawned) {
    state.enemySpawnTimer += dt;
    if (!state.initialWaveSpawned || (state.enemySpawnTimer + 1e-9 >= difficulty.spawnInterval && state.enemies.length < difficulty.maxEnemies)) addWave(state, difficulty, stage, random);
    // Preserve the live spawn-quota arrival rule (not kill quota).
    if (state.totalEnemiesSpawned >= stage.maxEnemies) {
      state.boss = createBoss(state.currentStage, state.width); state.bossSpawned = true;
      triggerScreenshake(state.shake, 12, 0.4); emit(state, events, 'bossAppeared'); emit(state, events, 'music', { track: 'boss' });
    }
  }
  if (state.boss?.alive) {
    state.boss = updateBoss(state.boss, dt, state.currentStage); // sole cooldown owner
    if (state.boss.fireCooldown <= 1e-9) {
      const shots = generateBossBullets(state.boss, bossCurrentPattern(state.boss, state.currentStage), state.currentStage,
        state.player.x + state.player.width / 2, state.player.y + state.player.height / 2);
      state.enemyBullets.push(...shots.map(shot => identify(state, shot)));
      state.boss.fireCooldown = 1.1; emit(state, events, 'bossFired');
    }
  }
  const enemyResult = checkBulletEnemyCollisions(state.bullets, state.enemies, {
    comboCount: state.combo, bonusMultiplier: difficulty.bonusMultiplier,
    onEnemyHit: enemy => emit(state, events, 'enemyHit', { hp: enemy.hp, enemyId: enemy.id }),
    onEnemyDestroyed: (enemy, combo, points) => {
      state.combo = combo; state.comboTimer = 1.5; state.sessionStats.enemiesKilled++;
      state.sessionStats.maxCombo = Math.max(state.sessionStats.maxCombo, combo);
      emit(state, events, 'enemyKilled', { combo, points, enemyId: enemy.id });
      if (combo >= 2) popup(state, state.width / 2, state.height * 0.2, `${combo}x COMBO!`, combo >= 5 ? '#fbbf24' : combo >= 3 ? '#fb923c' : '#22c55e', 1.2, { isCombo: true });
      if (random() < 0.1) {
        const kinds = ['spread', 'double', 'triple', 'rapid', 'shield', 'slow'];
        state.powerups.push(identify(state, createPowerup(enemy.x + enemy.size / 2 - 10, enemy.y + enemy.size / 2, kinds[Math.floor(random() * kinds.length)])));
      }
    },
  });
  state.bullets = enemyResult.survivingBullets; state.enemies = enemyResult.survivingEnemies;
  mergeCollisionEffects(state, enemyResult.results);
  if (enemyResult.results.killsEarned) triggerScreenshake(state.shake, enemyResult.results.maxDestroyedSize >= 30 ? 6 : 4.5, 0.15);
  if (state.boss?.alive) {
    const result = checkBulletBossCollisions(state.bullets, state.boss, state.shake);
    state.bullets = result.survivingBullets; state.boss = result.updatedBoss; mergeCollisionEffects(state, result.results);
    if (result.results.hitCount) emit(state, events, 'bossHit', { count: result.results.hitCount });
    if (result.results.bossDefeated) {
      state.sessionStats.bossesDefeated++; emit(state, events, 'bossKilled', { stage: state.currentStage });
      state.phase = state.currentStage === STAGES[STAGES.length - 1] ? 'won' : 'transition';
      state.transitionTimeLeft = state.phase === 'transition' ? 2 : 0;
      if (state.phase === 'won') emit(state, events, 'sessionEnded', { outcome: 'won' });
    }
  }
  // Victory/transition resolves before hostile damage; no loss beneath a completion overlay.
  if (!isGameplayActive(state)) return;
  const hit = checkEnemyBulletPlayerCollisions(state.enemyBullets, state.player, wasBonus);
  state.enemyBullets = hit.survivingBullets;
  if (hit.playerHit) damagePlayer(state, events);
  if (!isGameplayActive(state)) return;
  state.powerups = checkPowerupCollisions(state.powerups, state.player, kind => collect(state, events, kind));
  if (wasBonus) {
    state.bonusTimeLeft = remaining(state.bonusTimeLeft, dt);
    if (!state.bonusTimeLeft) {
      state.levelKills = 0; state.enemySpawnTimer = 0;
      popup(state, state.width / 2, state.height * 0.4, 'BONUS COMPLETE!', '#22c55e', 1.5);
    }
  } else if (enemyResult.results.killsEarned) {
    state.levelKills += enemyResult.results.killsEarned;
    if (state.levelKills >= getLevelTarget(state.level)) {
      if (state.level < 10) {
        state.level++; state.levelKills = 0; state.bonusTimeLeft = 10;
        state.levelBanner = `LEVEL ${String(state.level).padStart(2, '0')}`;
        state.sessionStats.levelsCompleted++;
        emit(state, events, 'levelUp', { flawless: state.levelHits === 0 }); state.levelHits = 0;
        popup(state, state.width / 2, state.height * 0.3, 'BONUS SHOOT-OUT!', '#fb923c');
      } else state.levelKills = getLevelTarget(state.level);
    }
  }
  state.phase = activePhase(state);
}

/** At most six 1/60s substeps; discard excess suspension time, never catch up unbounded. */
export function stepGameSession(snapshot, elapsed, input = {}, random = Math.random) {
  if ((!isGameplayActive(snapshot) && snapshot.phase !== 'transition') || !Number.isFinite(elapsed) || elapsed <= 0) return { state: snapshot, events: [] };
  const state = copySnapshot(snapshot), events = [];
  const duration = Math.min(elapsed, MAX_FRAME_SECONDS);
  const steps = Math.max(1, Math.ceil(duration / (1 / 60)));
  for (let index = 0; index < steps; index++) advance(state, duration / steps, { ...input, firePressed: index === 0 && input.firePressed }, events, random);
  return { state: { ...state, ...applyAllLimits(state) }, events };
}
