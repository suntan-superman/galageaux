import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AchievementManager from '../../engine/achievements';
import StatsScreen from '../../scenes/StatsScreen';
import AchievementsScreen from '../../scenes/AchievementsScreen';
import { CAPTURE_STATS_FIXTURE, CAPTURE_ACHIEVEMENTS_FIXTURE } from '../../dev/captureFixtures';

const mockItems = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async key => mockItems.get(key) ?? null),
  setItem: jest.fn(async (key, value) => { mockItems.set(key, value); }),
}));
jest.mock('react-native', () => {
  class Value {
    interpolate() { return 0.3; }
  }
  const animation = () => ({ start: () => {} });
  return {
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: styles => styles },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Animated: { Value, View: 'AnimatedView', spring: animation, timing: animation,
      sequence: animation, loop: animation },
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Rect: 'Rect', Circle: 'Circle', LinearGradient: 'LinearGradient',
  vec: (x, y) => ({ x, y }),
}));
jest.mock('../../engine/audio', () => ({ playSound: jest.fn() }));
jest.mock('../../i18n', () => ({
  formatScore: value => Number(value).toLocaleString('en-US'),
}));

let renderer;
const originalDev = global.__DEV__;
const originalEnv = process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO;
const texts = () => renderer.root.findAllByType('Text')
  .map(node => [node.props.children].flat(Infinity).join(''));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockItems.clear();
  await AchievementManager.resetAchievements();
  mockItems.clear();
  jest.clearAllMocks();
  global.__DEV__ = true;
  process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO = 'true';
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = null;
  jest.restoreAllMocks();
  global.__DEV__ = originalDev;
  if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO;
  else process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO = originalEnv;
});

const mount = async (Component, fixture) => {
  await act(async () => {
    renderer = create(<Component onBack={() => {}} captureFixture={fixture} />);
  });
};

it('renders representative lifetime stats in the real Stats screen without storage access', async () => {
  await mount(StatsScreen, CAPTURE_STATS_FIXTURE);

  expect(texts()).toContain('125,000');
  expect(texts()).toContain('420,350');
  expect(texts()).toContain('Stage 1, Stage 2, Stage 3');
  expect(texts()).not.toContain('No runs yet. Play a game to build your stats.');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AchievementManager.getStats()).toMatchObject({ gamesPlayed: 0, highScore: 0 });
});

it('renders representative progress in the real Achievements gallery without storage access', async () => {
  await mount(AchievementsScreen, CAPTURE_ACHIEVEMENTS_FIXTURE);

  expect(texts()).toContain(`${CAPTURE_ACHIEVEMENTS_FIXTURE.unlocked.length}/${Object.keys(AchievementManager.ACHIEVEMENTS).length}`);
  expect(texts()).toContain('125,000');
  expect(texts()).toContain('487');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AchievementManager.getUnlockedAchievements()).toEqual([]);
});

it.each([
  ['release build', false, 'true'],
  ['environment opt-out', true, 'false'],
  ['default environment', true, undefined],
])('ignores fixture props under %s and uses real local stats', async (_, dev, env) => {
  global.__DEV__ = dev;
  if (env === undefined) delete process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO;
  else process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO = env;
  const loadSpy = jest.spyOn(AchievementManager, 'loadAchievements');
  await mount(StatsScreen, CAPTURE_STATS_FIXTURE);

  expect(texts()).toContain('No runs yet. Play a game to build your stats.');
  expect(texts()).not.toContain('125,000');
  expect(loadSpy).toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it.each([
  ['release build', false, 'true'],
  ['environment opt-out', true, 'false'],
])('ignores achievement fixture props under %s', async (_, dev, env) => {
  global.__DEV__ = dev;
  process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO = env;
  const loadSpy = jest.spyOn(AchievementManager, 'loadAchievements');
  await mount(AchievementsScreen, CAPTURE_ACHIEVEMENTS_FIXTURE);

  expect(texts()).toContain(`0/${Object.keys(AchievementManager.ACHIEVEMENTS).length}`);
  expect(texts()).not.toContain('125,000');
  expect(loadSpy).toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('keeps fixture achievement IDs and progress consistent with real definitions', () => {
  const { stats, unlocked } = CAPTURE_ACHIEVEMENTS_FIXTURE;
  expect(stats).toBe(CAPTURE_STATS_FIXTURE);
  expect(new Set(unlocked).size).toBe(unlocked.length);
  for (const id of unlocked) {
    const achievement = AchievementManager.ACHIEVEMENTS[id];
    expect(achievement).toBeDefined();
    const { type, value } = achievement.requirement;
    if (type === 'kills') expect(stats.totalKills).toBeGreaterThanOrEqual(value);
    if (type === 'powerups') expect(stats.totalPowerups).toBeGreaterThanOrEqual(value);
    if (type === 'bosses') expect(stats.totalBosses).toBeGreaterThanOrEqual(value);
    if (type === 'combo') expect(stats.maxCombo).toBeGreaterThanOrEqual(value);
    if (type === 'score') expect(stats.highScore).toBeGreaterThanOrEqual(value);
    if (type === 'level') expect(stats.maxLevel).toBeGreaterThanOrEqual(value);
    if (type === 'stageComplete') expect(stats.stagesCompleted).toContain(value);
  }
});
