import { getAchievementUpdates, playGameEventSounds } from '../../engine/gameEventEffects';
import { createGameSession, stepGameSession } from '../../engine/gameSimulation';
import { createEnemy } from '../../engine/spawner';
import { createBoss } from '../../engine/boss';
import * as Audio from '../../engine/audio';

jest.mock('../../engine/audio', () => ({ playSound: jest.fn(), playMusic: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve())
}));

const snapshot = () => ({ score: 1234, level: 5, combo: 0, sessionStats: {
  enemiesKilled: 100, bossesDefeated: 10, powerupsCollected: 25, maxCombo: 12
} });

describe('production game event achievement adapter', () => {
  it('aggregates only new event deltas and retains cumulative maxima', () => {
    const state = snapshot();
    const events = [
      { type: 'enemyKilled', combo: 10 }, { type: 'enemyKilled', combo: 14 },
      { type: 'powerupCollected', kind: 'shield' }, { type: 'powerupCollected', kind: 'rapid' },
      { type: 'bossKilled', stage: 'stage2' }, { type: 'levelUp', flawless: true }
    ];
    const original = JSON.stringify({ events, state });
    expect(getAchievementUpdates(events, state)).toEqual({
      kills: 2, powerups: 2, bosses: 1, stageComplete: 2, flawless: true,
      combo: 14, score: 1234, level: 5
    });
    expect(JSON.stringify({ events, state })).toBe(original);
  });

  it.each([['stage1', 1], ['stage2', 2], ['stage3', 3]])('uses numeric completion for %s', (stage, value) => {
    expect(getAchievementUpdates([{ type: 'bossKilled', stage }], snapshot()).stageComplete).toBe(value);
  });

  it('does not turn an unknown stage into an achievement', () => {
    expect(getAchievementUpdates([{ type: 'bossKilled', stage: 'stage4' }], snapshot())).not.toHaveProperty('stageComplete');
  });

  it('counts games on start and lifetime score only on terminal events', () => {
    const started = getAchievementUpdates([{ type: 'gameStarted' }], snapshot());
    expect(started.gameStart).toBe(true);
    expect(started).not.toHaveProperty('totalScore');
    const ended = getAchievementUpdates([{ type: 'sessionEnded', outcome: 'won' }], snapshot());
    expect(ended.totalScore).toBe(1234);
    expect(ended).not.toHaveProperty('gameStart');
  });

  it('does not infer flawless completion from cumulative hit or level totals', () => {
    expect(getAchievementUpdates([{ type: 'levelUp', flawless: false }], snapshot()).flawless).toBe(false);
    expect(getAchievementUpdates([{ type: 'enemyKilled', combo: 1 }], snapshot())).not.toHaveProperty('flawless');
  });

  it('returns no persistence update for idle, shots, hit feedback or music', () => {
    expect(getAchievementUpdates([], snapshot())).toEqual({});
    expect(getAchievementUpdates([
      { type: 'shotFired' }, { type: 'enemyHit', hp: 1 }, { type: 'playerHit' },
      { type: 'shieldHit' }, { type: 'bossHit' }, { type: 'bossAppeared' }, { type: 'music', track: 'boss' }
    ], snapshot())).toEqual({});
  });

  it('feeds real simulation kills into the real manager once as deltas and returns toast metadata', async () => {
    jest.resetModules();
    const achievements = require('../../engine/achievements');
    let state = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true };
    await achievements.checkAchievements(getAchievementUpdates([{ type: 'gameStarted' }], state));
    const unlocks = [];
    for (let index = 0; index < 2; index++) {
      state = { ...state,
        enemies: [createEnemy({ type: 'grunt', x: 20, y: 200, baseSpeed: 100, pattern: 'line' })],
        bullets: [{ x: 20, y: 201, width: 4, height: 14, vx: 0, vy: 0 }]
      };
      const result = stepGameSession(state, 1 / 60, undefined, () => 0.65);
      state = result.state;
      unlocks.push(...await achievements.checkAchievements(getAchievementUpdates(result.events, state)));
    }
    expect(state.sessionStats.enemiesKilled).toBe(2);
    expect(achievements.getStats()).toMatchObject({ totalKills: 2, gamesPlayed: 1, maxCombo: 2, highScore: state.score });
    expect(unlocks).toEqual([achievements.ACHIEVEMENTS.firstBlood]);
    expect(unlocks[0]).toMatchObject({ title: expect.any(String), description: expect.any(String), icon: expect.any(String) });
  });

  it('feeds terminal boss events into real stage/boss/score achievements exactly once', async () => {
    jest.resetModules();
    const achievements = require('../../engine/achievements');
    const state = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true, currentStage: 'stage3' };
    state.boss = { ...createBoss('stage3', 400), y: 100, hp: 1 };
    state.bullets = [{ x: state.boss.x, y: 101, width: 4, height: 14, vx: 0, vy: 0 }];
    const result = stepGameSession(state, 1 / 60, undefined, () => 0.65);
    const unlocked = await achievements.checkAchievements(getAchievementUpdates(result.events, result.state));
    let later = result, terminalEvents = [];
    for (let frame = 0; frame < 90; frame++) {
      later = stepGameSession(later.state, 1 / 60, undefined, () => 0.65);
      terminalEvents.push(...later.events);
    }
    expect(later.state.phase).toBe('won');
    expect(terminalEvents.filter(event => event.type === 'sessionEnded')).toHaveLength(1);
    await achievements.checkAchievements(getAchievementUpdates(terminalEvents, later.state));
    expect(getAchievementUpdates(stepGameSession(later.state, 1 / 60).events, later.state)).toEqual({});
    expect(achievements.getStats()).toMatchObject({ totalBosses: 1, stagesCompleted: [3], totalScore: result.state.score });
    expect(unlocked.map(item => item.id)).toEqual(['bossSlayer', 'acePilot']);
  });
});

describe('production event sound mapping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('preserves existing ordered cues and volumes, with no duplicate lethal enemy hit cue', () => {
    playGameEventSounds([
      { type: 'shotFired', cue: 'playerShootRapid', volume: 0.3 },
      { type: 'enemyHit', hp: 1 }, { type: 'enemyHit', hp: 0 },
      { type: 'enemyKilled', combo: 1 }, { type: 'enemyKilled', combo: 2 },
      { type: 'bossAppeared' }, { type: 'bossHit', count: 3 }, { type: 'bossKilled', stage: 'stage1' },
      { type: 'powerupCollected', kind: 'rapid' }, { type: 'powerupCollected', kind: 'shield' },
      { type: 'shieldHit' }, { type: 'playerHit' }, { type: 'levelUp' },
      { type: 'sessionEnded', outcome: 'lost' }
    ]);
    expect(Audio.playSound.mock.calls).toEqual([
      ['playerShootRapid', 0.3], ['enemyHit', 0.4], ['enemyDestroy', 0.5], ['enemyDestroy', 0.5],
      ['comboIncrease', 0.6], ['bossAppear', 0.9], ['enemyHit', 0.4], ['bossDeath', 0.8],
      ['powerupCollect', 0.7], ['powerupCollect', 0.7], ['shieldActivate', 0.7],
      ['shieldActivate', 0.5], ['playerHit', 0.8], ['levelUp', 0.8], ['playerDeath', 0.9]
    ]);
  });

  it('uses the valid gameplay music key after a production boss transition', () => {
    let state = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true, phase: 'transition', transitionTimeLeft: 0.01 };
    const result = stepGameSession(state, 1 / 60, undefined, () => 0.65);
    playGameEventSounds(result.events);
    expect(Audio.playMusic).toHaveBeenCalledTimes(1);
    expect(Audio.playMusic).toHaveBeenCalledWith('gameplay');
  });

  it('does not add a death cue on victory or unrelated events', () => {
    playGameEventSounds([{ type: 'sessionEnded', outcome: 'won' }, { type: 'gameStarted' }, { type: 'bossFired' }]);
    expect(Audio.playSound).not.toHaveBeenCalled();
    expect(Audio.playMusic).not.toHaveBeenCalled();
  });
});
