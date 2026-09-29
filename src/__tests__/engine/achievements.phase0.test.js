jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve())
}));

describe('production achievement manager contracts', () => {
  let storage;
  let achievements;

  beforeEach(() => {
    jest.resetModules();
    storage = require('@react-native-async-storage/async-storage');
    storage.getItem.mockResolvedValue(null);
    achievements = require('../../engine/achievements');
  });

  it('does not overwrite new deltas or unlock twice when initial loads overlap', async () => {
    const pendingReads = [];
    storage.getItem.mockImplementation(key => new Promise(resolve => pendingReads.push({ key, resolve })));
    const first = achievements.checkAchievements({ kills: 1, gameStart: true });
    const second = achievements.checkAchievements({ kills: 1 });
    const resolveSnapshot = ({ key, resolve }) => resolve(JSON.stringify(
      key === 'galageaux:achievements' ? {} : { totalKills: 0, gamesPlayed: 0 }
    ));
    pendingReads.slice(0, 2).forEach(resolveSnapshot);
    const firstUnlocks = await first;
    // A second independent load would now overwrite the first committed delta.
    pendingReads.slice(2).forEach(resolveSnapshot);
    const secondUnlocks = await second;

    expect(achievements.getStats()).toMatchObject({ totalKills: 2, gamesPlayed: 1 });
    expect([...firstUnlocks, ...secondUnlocks].filter(item => item.id === 'firstBlood')).toHaveLength(1);
    expect(storage.getItem).toHaveBeenCalledTimes(2);
  });

  it('accepts deltas, retains maxima and returns complete toast metadata once', async () => {
    const first = await achievements.checkAchievements({ kills: 1, combo: 10, score: 50000, level: 5 });
    const second = await achievements.checkAchievements({ kills: 1, combo: 2, score: 10, level: 1 });
    expect(achievements.getStats()).toMatchObject({ totalKills: 2, maxCombo: 10, highScore: 50000, maxLevel: 5 });
    expect(first.map(item => item.id)).toEqual(['firstBlood', 'comboMaster', 'scoreChaser', 'survivor']);
    first.forEach(item => {
      expect(item).toEqual(achievements.ACHIEVEMENTS[item.id]);
      expect(item.title).toEqual(expect.any(String));
      expect(item.description).toEqual(expect.any(String));
      expect(item.icon).toEqual(expect.any(String));
    });
    expect(second).toEqual([]);
  });
});
