const mockItems = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async key => mockItems.get(key) ?? null),
  setItem: jest.fn(async (key, value) => { mockItems.set(key, value); }),
}));

describe('release achievement persistence and progression', () => {
  let achievements;

  beforeEach(() => {
    mockItems.clear();
    jest.resetModules();
    achievements = require('../../engine/achievements');
  });

  it('keeps the Legend ID and unlocks it at the reachable level-6 milestone once', async () => {
    expect(achievements.ACHIEVEMENTS.legend).toMatchObject({
      id: 'legend',
      description: 'Reach level 6',
      requirement: { type: 'level', value: 6 },
    });
    const before = await achievements.checkAchievements({ level: 5 });
    expect(before.map(item => item.id)).not.toContain('legend');
    expect(achievements.getAchievementProgress('legend')).toBeCloseTo(5 / 6);

    const earned = await achievements.checkAchievements({ level: 6 });
    expect(earned.filter(item => item.id === 'legend')).toHaveLength(1);
    expect(achievements.getAchievementProgress('legend')).toBe(1);
    expect((await achievements.checkAchievements({ level: 6 })).filter(item => item.id === 'legend')).toHaveLength(0);
    expect((await achievements.checkAchievements({ level: 7 })).filter(item => item.id === 'legend')).toHaveLength(0);
  });

  it('reloads persisted IDs after a fresh manager instance and ignores unknown or non-boolean unlock values', async () => {
    await achievements.checkAchievements({ kills: 1, bosses: 1, stageComplete: 1, level: 6 });
    const earned = achievements.getUnlockedAchievements();
    expect(earned).toEqual(['firstBlood', 'bossSlayer', 'stageClear', 'survivor', 'legend']);

    const saved = JSON.parse(mockItems.get('galageaux:achievements'));
    mockItems.set('galageaux:achievements', JSON.stringify({ ...saved, unknownOldId: true, sharpshooter: 'true' }));
    jest.resetModules();
    achievements = require('../../engine/achievements');
    await achievements.loadAchievements();

    expect(achievements.getUnlockedAchievements()).toEqual(earned);
    expect(achievements.getAllAchievements().find(item => item.id === 'sharpshooter').unlocked).toBe(false);
    expect(achievements.getStats()).toMatchObject({ totalKills: 1, totalBosses: 1, maxLevel: 6, stagesCompleted: [1] });
    expect((await achievements.checkAchievements({ level: 6 })).filter(item => item.id === 'legend')).toHaveLength(0);
  });

  it('does not reload stale disk values over a new unlock while its save is pending', async () => {
    await achievements.resetAchievements();
    await achievements.loadAchievements();
    const storage = require('@react-native-async-storage/async-storage');
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    const pendingSaves = [];
    storage.setItem.mockImplementation((key, value) => new Promise(resolve => {
      pendingSaves.push(() => { mockItems.set(key, value); resolve(); });
    }));

    const writing = achievements.checkAchievements({ kills: 1 });
    expect(achievements.getStats().totalKills).toBe(1);
    expect(achievements.getUnlockedAchievements()).toContain('firstBlood');
    expect(pendingSaves).toHaveLength(2);
    await achievements.loadAchievements(); // gallery/Stats route opens before disk writes settle
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(achievements.getStats().totalKills).toBe(1);
    expect(achievements.getUnlockedAchievements()).toContain('firstBlood');

    pendingSaves.forEach(finish => finish());
    await writing;
  });

  it('silently reconciles an existing level-6 player to Legend without a duplicate future unlock', async () => {
    mockItems.set('galageaux:achievements', JSON.stringify({ survivor: true }));
    mockItems.set('galageaux:stats', JSON.stringify({ maxLevel: 6 }));
    await achievements.loadAchievements();

    expect(achievements.getUnlockedAchievements()).toEqual(['survivor', 'legend']);
    expect(JSON.parse(mockItems.get('galageaux:achievements'))).toMatchObject({ survivor: true, legend: true });
    const later = await achievements.checkAchievements({ level: 6 });
    expect(later.map(item => item.id)).not.toContain('legend');
  });

  it('can reach level 6 within the real three-stage spawn and bonus lifecycle', () => {
    const { createGameSession, stepGameSession } = require('../../engine/gameSimulation');
    const { getLevelTarget } = require('../../engine/difficulty');
    const waves = require('../../config/waves.json');
    const requiredProgressKills = [1, 2, 3, 4, 5].reduce((sum, level) => sum + getLevelTarget(level), 0);
    expect(requiredProgressKills).toBe(57);

    let state = createGameSession(400, 800);
    let shotsFired = 0;
    let bonusKills = 0;
    for (let tick = 0; tick < 5000 && state.level < 6 && !['won', 'lost'].includes(state.phase); tick++) {
      // Controlled successful-hit fixtures stand in for precise player aim. Spawn
      // quotas, actual collisions, level progress, ten-second bonuses, boss
      // deaths and stage handoffs still run through the production simulation.
      const activeEnemies = state.bonusTimeLeft > 0 ? [] : state.enemies.filter(enemy =>
        enemy.y >= 0 && enemy.y + enemy.size < state.height * 0.75);
      const enemyHits = activeEnemies.flatMap(enemy => Array.from({ length: enemy.hp }, () => ({
        id: `controlled:${shotsFired++}`, x: enemy.x - 2, y: enemy.y - 2,
        width: enemy.size + 4, height: enemy.size + 4, vx: 0, vy: 0, speed: 0,
      })));
      const bossHits = state.boss?.alive && state.boss.y >= 0
        ? Array.from({ length: Math.min(state.boss.hp, 3) }, () => ({
          id: `controlled:${shotsFired++}`, x: state.boss.x, y: state.boss.y,
          width: state.boss.width, height: state.boss.height, vx: 0, vy: 0, speed: 0,
        })) : [];
      const step = stepGameSession({ ...state, bullets: [...state.bullets, ...enemyHits, ...bossHits] },
        0.1, { playerX: state.player.x }, () => 0.5);
      bonusKills += step.events.filter(event => event.type === 'enemyKilled' && state.bonusTimeLeft > 0).length;
      state = step.state;
    }

    expect(state.level).toBe(6);
    expect(state.phase).not.toBe('won');
    expect(state.currentStage).toBe('stage3');
    expect(state.player.lives).toBeGreaterThan(0);
    expect(state.sessionStats.enemiesKilled).toBeGreaterThanOrEqual(requiredProgressKills);
    expect(state.totalEnemiesSpawned).toBeLessThanOrEqual(waves[state.currentStage].maxEnemies + 4);
    expect(bonusKills).toBe(0); // no bonus kills were counted toward this route
  });
});
