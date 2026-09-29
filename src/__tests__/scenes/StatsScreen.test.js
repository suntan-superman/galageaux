import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AchievementManager from '../../engine/achievements';
import { getAchievementUpdates } from '../../engine/gameEventEffects';
import StatsScreen from '../../scenes/StatsScreen';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Rect: 'Rect', Circle: 'Circle', LinearGradient: 'LinearGradient',
  vec: (x, y) => ({ x, y }),
}));
jest.mock('@react-native-async-storage/async-storage', () => {
  // A shared Map models storage surviving module reloads.
  const stored = global.__galageauxStatsTestStorage || new Map();
  global.__galageauxStatsTestStorage = stored;
  return {
    getItem: jest.fn(async key => stored.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { stored.set(key, value); }),
  };
});
jest.mock('../../engine/audio', () => ({ playSound: jest.fn() }));
jest.mock('../../i18n', () => ({
  formatScore: value => Number(value).toLocaleString('en-US'),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
const saved = global.__galageauxStatsTestStorage;
const texts = () => renderer.root.findAllByType('Text').map(node => node.props.children);
const rowValue = label => {
  const labelNode = renderer.root.findAllByType('Text').find(node => node.props.children === label);
  expect(labelNode).toBeDefined();
  return labelNode.parent.findAllByType('Text')[1].props.children;
};
const feed = (events, score, level = 1, combo = 0) => AchievementManager.checkAchievements(
  getAchievementUpdates(events, { score, level, combo, sessionStats: { maxCombo: combo } })
);
const renderStats = async () => {
  await act(async () => { renderer = create(<StatsScreen onBack={jest.fn()} />); });
};

beforeEach(async () => {
  saved.clear();
  await AchievementManager.resetAchievements();
  saved.clear();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (renderer) await act(async () => { renderer.unmount(); });
  renderer = null;
});

it('shows truthful zero/default values on a fresh install without account or invented history', async () => {
  await renderStats();
  expect(texts()).toContain('No runs yet. Play a game to build your stats.');
  expect(rowValue('Runs Started')).toBe('0');
  expect(rowValue('Best Score Reached')).toBe('0');
  expect(rowValue('Total Finalized Score')).toBe('0');
  expect(rowValue('Highest Level Reached')).toBe('—');
  expect(rowValue('Stages Cleared')).toBe('None yet');
  expect(texts().join(' ')).not.toMatch(/sign in|cloud|accuracy|deaths|play time/i);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith('galageaux:stats');
  expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('@galageaux/player_stats');
});

it('renders authoritative cumulative loss, retry and victory stats, with maxima and unique cleared stages', async () => {
  await feed([{ type: 'gameStarted' }], 0);
  await feed([
    { type: 'enemyKilled', combo: 2 }, { type: 'enemyKilled', combo: 2 },
    { type: 'powerupCollected', kind: 'shield' },
  ], 225, 2, 2);
  await feed([{ type: 'sessionEnded', outcome: 'lost' }], 500, 2, 2);
  await feed([{ type: 'gameStarted' }], 0);
  await feed([
    { type: 'enemyKilled', combo: 5 }, { type: 'bossKilled', stage: 'stage1' },
    { type: 'powerupCollected', kind: 'rapid' },
  ], 1200, 3, 5);
  await feed([{ type: 'sessionEnded', outcome: 'won' }], 1200, 3, 5);
  // Another visit to a completed stage should not inflate distinct stages.
  await feed([{ type: 'bossKilled', stage: 'stage1' }], 1200, 3, 5);
  await renderStats();

  expect(rowValue('Runs Started')).toBe('2');
  expect(rowValue('Best Score Reached')).toBe('1,200');
  expect(rowValue('Total Finalized Score')).toBe('1,700');
  expect(rowValue('Enemies Destroyed')).toBe('3');
  expect(rowValue('Bosses Defeated')).toBe('2');
  expect(rowValue('Powerups Collected')).toBe('2');
  expect(rowValue('Best Combo')).toBe('5x');
  expect(rowValue('Highest Level Reached')).toBe(3);
  expect(rowValue('Stages Cleared')).toBe('Stage 1');
  expect(saved.has('@galageaux/player_stats')).toBe(false);
});

it('does not count an abandoned score in finalized total and reloading the screen does not add stats', async () => {
  await feed([{ type: 'gameStarted' }], 0);
  await feed([{ type: 'enemyKilled', combo: 1 }], 250, 1, 1);
  await feed([{ type: 'sessionEnded', outcome: 'lost' }], 250, 1, 1);
  await feed([{ type: 'gameStarted' }], 0);
  await feed([{ type: 'enemyKilled', combo: 2 }], 2000, 2, 2);
  // Deliberate Quit to Menu emits no sessionEnded event.
  await renderStats();
  expect(rowValue('Runs Started')).toBe('2');
  expect(rowValue('Best Score Reached')).toBe('2,000');
  expect(rowValue('Total Finalized Score')).toBe('250');
  expect(rowValue('Enemies Destroyed')).toBe('2');

  await act(async () => { renderer.unmount(); });
  renderer = null;
  await renderStats();
  expect(rowValue('Runs Started')).toBe('2');
  expect(rowValue('Total Finalized Score')).toBe('250');

  let reloaded;
  jest.isolateModules(() => { reloaded = require('../../engine/achievements'); });
  await reloaded.loadAchievements();
  expect(reloaded.getStats()).toMatchObject({
    gamesPlayed: 2, highScore: 2000, totalScore: 250,
    totalKills: 2, maxCombo: 2, maxLevel: 2,
  });
});
