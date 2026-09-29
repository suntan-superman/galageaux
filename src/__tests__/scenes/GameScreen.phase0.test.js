import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Audio from '../../engine/audio';
import * as Achievements from '../../engine/achievements';
import * as Simulation from '../../engine/gameSimulation';
import { AppState } from 'react-native';
import { createEnemy } from '../../engine/spawner';
import { calculateDifficultySettings } from '../../engine/difficulty';
import waves from '../../config/waves.json';

jest.mock('react-native', () => ({
  View: 'View', StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) }));
jest.mock('@shopify/react-native-skia', () => ({ Canvas: 'Canvas', Group: 'Group' }));
jest.mock('../../components/BossHealthBar', () => 'BossHealthBar');
jest.mock('../../components/canvas', () => Object.fromEntries(['Background', 'StarField', 'PlayerShip', 'Enemies', 'BossShip', 'PlayerBullets', 'EnemyBullets', 'MuzzleFlashes', 'Explosions', 'Particles', 'Powerups'].map(name => [name, name])));
jest.mock('../../components/PauseOverlay', () => 'PauseOverlay');
jest.mock('../../components/ControlHintsOverlay', () => 'ControlHintsOverlay');
jest.mock('../../components/AchievementToast', () => 'AchievementToast');
jest.mock('../../components/GameHUD', () => 'GameHUD');
jest.mock('../../components/FireButton', () => 'FireButton');
jest.mock('../../components/ScorePopup', () => 'ScorePopup');
jest.mock('../../components/LevelBanner', () => 'LevelBanner');
jest.mock('../../components/BonusBanner', () => 'BonusBanner');
jest.mock('../../components/StageCompleteOverlay', () => 'StageCompleteOverlay');
jest.mock('../../components/HitFlash', () => 'HitFlash');
jest.mock('../../scenes/GameOverOverlay', () => 'GameOverOverlay');
jest.mock('../../engine/audio', () => ({ initializeAudio: jest.fn(async () => {}), playMusic: jest.fn(async () => {}), pauseMusic: jest.fn(), playSound: jest.fn(), setMusicTempo: jest.fn() }));
jest.mock('../../engine/achievements', () => ({
  loadAchievements: jest.fn(async () => {}), checkAchievements: jest.fn(async () => []),
}));
jest.mock('../../hooks/useGameSettings', () => () => ({ tiltSensitivity: 1.5, fireButtonPosition: 'right', audioSettings: {}, loaded: true }));
jest.mock('../../hooks/useStarField', () => () => ({ stars: [], updateStars: jest.fn(), resetStars: jest.fn() }));
jest.mock('../../hooks/usePlayerControls', () => ({ onPositionChange }) => ({
  panHandlers: { onTestMove: onPositionChange }, updateTilt: () => null,
}));
import GameScreen from '../../scenes/GameScreen';

describe('mounted production GameScreen frame contract', () => {
  let screen, now, raf, nextId;
  const props = name => screen.root.findByType(name).props;
  const frame = async milliseconds => {
    now += milliseconds;
    const callbacks = [...raf.values()];
    raf.clear();
    await act(async () => callbacks.forEach(callback => callback(now)));
  };
  const advance = async seconds => { for (let i = 0; i < seconds * 60; i++) await frame(1000 / 60); };
  const mount = async tutorial => { await act(async () => { screen = TestRenderer.create(<GameScreen onExit={jest.fn()} showTutorial={tutorial} />); }); };
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers({ doNotFake: ['Date', 'performance'] });
    now = 1000; nextId = 0; raf = new Map();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(Math, 'random').mockReturnValue(0.65);
    global.requestAnimationFrame = jest.fn(callback => { raf.set(++nextId, callback); return nextId; });
    global.cancelAnimationFrame = jest.fn(id => raf.delete(id));
    jest.clearAllMocks();
    Achievements.checkAchievements.mockReset().mockResolvedValue([]);
  });
  afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; jest.restoreAllMocks(); jest.useRealTimers(); });

  it('does not simulate or spawn under the tutorial', async () => {
    await mount(true);
    await advance(3);
    expect(props('Enemies').enemies).toHaveLength(0);
    expect(props('GameHUD').score).toBe(0);
  });
  it('inserts each timed spawn exactly once', async () => {
    await mount(false);
    await advance(calculateDifficultySettings(waves.stage1, 1).spawnInterval + 0.1);
    const enemies = props('Enemies').enemies;
    expect(enemies.length).toBeGreaterThan(1);
    expect(new Set(enemies.map(enemy => `${enemy.x}:${enemy.y}`)).size).toBe(enemies.length);
  });
  it('retains an auto-fired projectile with its muzzle and sound event', async () => {
    await mount(false);
    await act(async () => props('GameHUD').onPauseToggle());
    await act(async () => props('PauseOverlay').onToggleAutoFire());
    await act(async () => props('PauseOverlay').onResume());
    await frame(16);
    await frame(16);
    expect(props('PlayerBullets').bullets.length).toBeGreaterThan(0);
    expect(props('MuzzleFlashes').flashes.length).toBeGreaterThan(0);
    expect(Audio.playSound).toHaveBeenCalledWith('playerShoot', 0.3);
    expect(Audio.playSound.mock.calls.filter(([cue]) => cue === 'playerShoot')).toHaveLength(1);
  });
  it('does not advance enemies or fire while paused', async () => {
    await mount(false);
    await advance(0.1);
    await act(async () => props('GameHUD').onPauseToggle());
    const before = props('Enemies').enemies;
    await advance(3);
    expect(props('Enemies').enemies).toEqual(before);
    await act(async () => props('FireButton').onFire({ nativeEvent: {} }));
    expect(props('PlayerBullets').bullets).toHaveLength(0);
  });
  it('commits multiple frames even when React has not rendered between them', async () => {
    await mount(false);
    await frame(16); await frame(16);
    const before = props('Enemies').enemies[0];
    await act(async () => {
      for (let i = 0; i < 3; i++) {
        now += 16;
        const callbacks = [...raf.values()]; raf.clear();
        callbacks.forEach(callback => callback(now));
      }
    });
    const after = props('Enemies').enemies[0];
    expect(after.id).toBe(before.id);
    expect(after.pathElapsed).toBeCloseTo(before.pathElapsed + 0.048, 6);
    expect(after.y).toBeGreaterThan(before.y);
  });
  it('backgrounds into pause and discards suspension time on explicit resume', async () => {
    await mount(false); await advance(0.1);
    const listener = AppState.addEventListener.mock.calls[0][1];
    await act(async () => listener('background'));
    const before = props('Enemies').enemies[0];
    await frame(60000);
    expect(props('Enemies').enemies[0]).toEqual(before);
    await act(async () => listener('active'));
    expect(props('PauseOverlay').visible).toBe(true);
    await act(async () => props('PauseOverlay').onResume());
    await frame(60000);
    expect(props('Enemies').enemies[0]).toEqual(before);
    await frame(16);
    expect(props('Enemies').enemies[0].pathElapsed).toBeCloseTo(before.pathElapsed + 0.016, 6);
    expect(props('Enemies').enemies[0].y).toBeGreaterThan(before.y);
  });
  it('retry clears session HUD, transient feedback, counters and terminal overlays', async () => {
    const seed = Simulation.createGameSession(400, 800);
    Object.assign(seed, { phase: 'lost', level: 8, levelKills: 5, bonusTimeLeft: 7, score: 500,
      currentStage: 'stage3', combo: 9, autoFire: true, muzzleFlashes: [{ life: 1 }],
      screenOffset: { ox: 10, oy: 12 }, levelBanner: 'LEVEL 08' });
    seed.player = { ...seed.player, lives: 0, alive: false, shield: true, weaponType: 'spread', weaponLevel: 3 };
    jest.spyOn(Simulation, 'createGameSession').mockReturnValueOnce(seed);
    await mount(false);
    await act(async () => props('GameOverOverlay').onRetry());
    expect(props('GameHUD')).toMatchObject({ score: 0, level: 1, levelKills: 0, currentStage: 'stage1', lives: 5, hasShield: false });
    expect(props('BonusBanner').visible).toBe(false);
    expect(props('MuzzleFlashes').flashes).toEqual([]);
    expect(props('PlayerShip')).toMatchObject({ ox: 0, oy: 0 });
    expect(props('FireButton').autoFire).toBe(false);
    expect(screen.root.findAllByType('GameOverOverlay')).toHaveLength(0);
    expect(props('StageCompleteOverlay').visible).toBe(false);
  });
  it('calls the real achievement API contract with deltas and shows a visible toast', async () => {
    const seed = Simulation.createGameSession(400, 800);
    seed.initialWaveSpawned = true; seed.bossSpawned = true;
    seed.enemies = [createEnemy({ type: 'grunt', x: 10, y: 200, baseSpeed: 0, pattern: 'line' })];
    seed.bullets = [{ x: 10, y: 200, width: 4, height: 14, vx: 0, vy: 0 }];
    seed.sessionStats.enemiesKilled = 12;
    jest.spyOn(Simulation, 'createGameSession').mockReturnValueOnce(seed);
    Achievements.checkAchievements.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'first_blood' }]);
    await mount(false); await frame(16); await frame(16);
    expect(Achievements.checkAchievements.mock.calls.filter(([update]) => update.kills)).toHaveLength(1);
    expect(Achievements.checkAchievements).toHaveBeenCalledWith(expect.objectContaining({ kills: 1 }));
    expect(props('AchievementToast').visible).toBe(true);
    await frame(16);
    expect(Achievements.checkAchievements.mock.calls.filter(([update]) => update.kills)).toHaveLength(1);
    await act(async () => props('StageCompleteOverlay').onRetry());
    expect(screen.root.findAllByType('AchievementToast')).toHaveLength(0);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(props('GameHUD').level).toBe(1);
  });
  it('ignores an old-session achievement completion after retry', async () => {
    let finish;
    Achievements.checkAchievements.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await mount(false);
    await act(async () => props('StageCompleteOverlay').onRetry());
    await act(async () => finish([{ id: 'old_session' }]));
    expect(screen.root.findAllByType('AchievementToast')).toHaveLength(0);
    expect(Achievements.checkAchievements.mock.calls.filter(([update]) => update.gameStart)).toHaveLength(2);
  });
  it('ignores an old toast animation callback after retry creates a new toast', async () => {
    Achievements.checkAchievements.mockResolvedValueOnce([{ id: 'old' }]).mockResolvedValueOnce([{ id: 'new' }]);
    await mount(false);
    const oldDismiss = props('AchievementToast').onDismiss;
    await act(async () => props('StageCompleteOverlay').onRetry());
    expect(props('AchievementToast').achievement.id).toBe('new');
    await act(async () => oldDismiss());
    expect(props('AchievementToast').achievement.id).toBe('new');
  });
  it('does not double-count game start during React StrictMode effect replay', async () => {
    await act(async () => { screen = TestRenderer.create(<React.StrictMode><GameScreen onExit={jest.fn()} /></React.StrictMode>); });
    expect(Achievements.checkAchievements.mock.calls.filter(([update]) => update.gameStart)).toHaveLength(1);
  });
  it('unmount cancels RAF, app listener and toast timeout', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    Achievements.checkAchievements.mockResolvedValueOnce([{ id: 'test' }]);
    await mount(false);
    const toastCall = timeoutSpy.mock.calls.findIndex(([, delay]) => delay === 4000);
    const toastTimer = timeoutSpy.mock.results[toastCall].value;
    const subscription = AppState.addEventListener.mock.results[0].value;
    await act(async () => screen.unmount()); screen = null;
    expect(raf.size).toBe(0);
    expect(subscription.remove).toHaveBeenCalledTimes(1);
    // React's own scheduled jobs are not gameplay-owned timers.
    expect(clearSpy).toHaveBeenCalledWith(toastTimer);
  });

  it('Phase 1: touch movement is immediate and bank alone eases on the next frame', async () => {
    await mount(false); await frame(16); await frame(16);
    const x = props('PlayerShip').player.x;
    await act(async () => props('View').onTestMove(x + 25));
    expect(props('PlayerShip').player.x).toBe(x + 25);
    expect(props('PlayerShip').bank).toBe(0);
    await frame(16);
    const bank = props('PlayerShip').bank;
    expect(bank).toBeGreaterThan(0);
    await frame(16);
    expect(props('PlayerShip').velocityX).toBe(0);
    expect(props('PlayerShip').bank).toBeLessThan(bank);
    expect(props('PlayerShip').player.x).toBe(x + 25);
    await act(async () => props('View').onTestMove(x - 25));
    await frame(16);
    expect(props('PlayerShip').bank).toBeLessThan(bank);
  });
  it('Phase 1: decorative time is shared, frozen on pause and reset on retry', async () => {
    await mount(false); await advance(0.2);
    const time = props('PlayerShip').time;
    expect(time).toBeGreaterThan(0);
    for (const name of ['Background', 'StarField', 'Powerups']) expect(props(name).time).toBe(time);
    await act(async () => props('GameHUD').onPauseToggle());
    await advance(2);
    expect(props('PlayerShip').time).toBe(time);
    await act(async () => props('StageCompleteOverlay').onRetry());
    expect(props('PlayerShip').time).toBe(0);
    expect(props('PlayerShip').bank).toBe(0);
  });
  it('Phase 1: applies one world shake while keeping the boss health bar screen-fixed', async () => {
    const seed = Simulation.createGameSession(400, 800);
    seed.screenOffset = { ox: 10, oy: -6 };
    seed.boss = { alive: true, hp: 80, maxHp: 100 };
    jest.spyOn(Simulation, 'createGameSession').mockReturnValueOnce(seed);
    await mount(false);
    expect(props('Group').transform).toEqual([{ translateX: 4.5 }, { translateY: -2.7 }]);
    for (const name of ['PlayerShip', 'Enemies', 'BossShip', 'Particles', 'Explosions', 'PlayerBullets', 'EnemyBullets', 'Powerups']) {
      expect(props(name)).toMatchObject({ ox: 0, oy: 0 });
    }
    expect(props('ScorePopup')).toMatchObject({ offsetX: 4.5, offsetY: -2.7 });
    expect(screen.root.findByType('BossHealthBar').parent.type).toBe('Canvas');
    expect(props('BossHealthBar')).toMatchObject({ x: 100, y: 112, health: 80 });
    expect(screen.root.findByType('Background').parent.type).toBe('Canvas');
    const world = screen.root.findByType('Group');
    expect(world.children[world.children.length - 1].type).toBe('EnemyBullets');
  });
});
