import React from 'react';
import { act, create } from 'react-test-renderer';
import CaptureStudio from '../../dev/CaptureStudio';
import { isCaptureStudioEnabled } from '../../dev/captureGate';
import { createCaptureInitialState, createCaptureRng } from '../../dev/captureScenarios';
import { CAPTURE_ACHIEVEMENTS_FIXTURE, CAPTURE_STATS_FIXTURE } from '../../dev/captureFixtures';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
jest.mock('../../scenes/GameScreen', () => 'GameScreen');
jest.mock('../../scenes/ShowMeDemo', () => 'ShowMeDemo');
jest.mock('../../scenes/AchievementsScreen', () => 'AchievementsScreen');
jest.mock('../../scenes/SettingsScreen', () => 'SettingsScreen');
jest.mock('../../scenes/StatsScreen', () => 'StatsScreen');
jest.mock('../../dev/captureGate', () => ({ isCaptureStudioEnabled: jest.fn() }));
jest.mock('../../dev/captureFixtures', () => ({
  CAPTURE_STATS_FIXTURE: { gamesPlayed: 8, highScore: 12800 },
  CAPTURE_ACHIEVEMENTS_FIXTURE: { stats: { gamesPlayed: 8 }, unlocked: ['firstBlood'] },
}));
jest.mock('../../dev/captureScenarios', () => ({
  CAPTURE_SCENARIOS: [
    { id: 'stage1_early', group: 'GAMEPLAY', label: 'STAGE 1 — EARLY', description: 'Production opening.' },
    { id: 'powerup_spread', group: 'POWERUPS', label: 'SPREAD ACTION', description: 'Real spread gameplay.' },
    { id: 'boss1_phase2', group: 'BOSSES', label: 'BOSS 1 — PHASE 2', description: 'Real boss.' },
    { id: 'final_victory', group: 'PRESENTATION', label: 'FINAL VICTORY', description: 'Real finale.' },
  ],
  createCaptureInitialState: jest.fn((id, width, height, sessionId) => ({
    state: { scenario: id, width, height, sessionId }, seed: 271828,
  })),
  createCaptureRng: jest.fn(seed => () => seed / 0x100000000),
}));

let renderer;
const mount = async (onBack = jest.fn()) => {
  await act(async () => { renderer = create(<CaptureStudio onBack={onBack} />); });
  return onBack;
};
const press = async testID => {
  await act(async () => renderer.root.findByProps({ testID }).props.onPress());
};
const game = () => renderer.root.findByType('GameScreen');
const labels = () => renderer.root.findAllByType('TouchableOpacity').map(node => node.props.accessibilityLabel);

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  isCaptureStudioEnabled.mockReturnValue(true);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = null;
});

it('does not render even when directly mounted if the capture gate is closed', async () => {
  isCaptureStudioEnabled.mockReturnValue(false);
  await mount();
  expect(renderer.toJSON()).toBeNull();
  expect(createCaptureInitialState).not.toHaveBeenCalled();
});

it('groups real scenario launchers and screen shortcuts as a developer utility', async () => {
  const onBack = await mount();
  const rendered = JSON.stringify(renderer.toJSON());
  ['GAMEPLAY', 'POWERUPS', 'BOSSES', 'PRESENTATION', 'SCREENS'].forEach(group => expect(rendered).toContain(group));
  expect(labels()).toEqual(expect.arrayContaining([
    'BACK TO MENU', 'STAGE 1 — EARLY', 'SPREAD ACTION', 'BOSS 1 — PHASE 2',
    'FINAL VICTORY', 'MAIN MENU', 'SHOW ME', 'ACHIEVEMENTS', 'SETTINGS', 'STATS',
  ]));
  await press('capture-back-menu');
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('launches the real GameScreen with independent seeded simulation and star streams', async () => {
  await mount();
  await press('capture-launch-stage1_early');
  expect(createCaptureInitialState).toHaveBeenCalledWith('stage1_early', 390, 844, 1000);
  expect(createCaptureRng).toHaveBeenCalledWith(271828);
  expect(createCaptureRng).toHaveBeenCalledWith(271828 ^ 0x9e3779b9);
  expect(game().props.showFirstPlayCue).toBe(false);
  expect(game().props.captureSession.initialState).toEqual({
    scenario: 'stage1_early', width: 390, height: 844, sessionId: 1000,
  });
  expect(typeof game().props.captureSession.random).toBe('function');
  expect(typeof game().props.captureSession.starRandom).toBe('function');
  expect(game().props.captureSession.random).not.toBe(game().props.captureSession.starRandom);
  expect(game().props.captureSession.timeScale).toBe(1);
});

it('freezes and slows without rebuilding the initial state or RNG', async () => {
  await mount();
  await press('capture-launch-stage1_early');
  const original = game().props.captureSession;
  await press('capture-freeze');
  expect(game().props.captureSession.timeScale).toBe(0);
  await press('capture-half-speed');
  expect(game().props.captureSession.timeScale).toBe(0.5);
  await press('capture-normal-speed');
  expect(game().props.captureSession.timeScale).toBe(1);
  expect(game().props.captureSession.initialState).toBe(original.initialState);
  expect(game().props.captureSession.random).toBe(original.random);
  expect(game().props.captureSession.starRandom).toBe(original.starRandom);
  expect(createCaptureInitialState).toHaveBeenCalledTimes(1);
});

it('hides all visible developer chrome for a clean game capture and can restore it', async () => {
  await mount();
  await press('capture-launch-stage1_early');
  expect(renderer.root.findAllByProps({ testID: 'capture-controls' })).toHaveLength(1);
  await press('capture-hide');
  expect(renderer.root.findAllByProps({ testID: 'capture-controls' })).toHaveLength(0);
  expect(game()).toBeDefined();
  expect(labels()).not.toContain('RESET SCENARIO');
  expect(labels()).not.toContain('RETURN TO CAPTURE STUDIO');
  await press('capture-reveal-hotspot');
  expect(renderer.root.findAllByProps({ testID: 'capture-controls' })).toHaveLength(1);
});

it('resets to an identical snapshot with fresh seeded streams and returns cleanly to catalog', async () => {
  await mount();
  await press('capture-launch-stage1_early');
  const first = game().props.captureSession;
  await press('capture-half-speed');
  await press('capture-reset');
  const second = game().props.captureSession;
  expect(createCaptureInitialState).toHaveBeenLastCalledWith('stage1_early', 390, 844, 1000);
  expect(second.initialState).toEqual(first.initialState);
  expect(second.random).not.toBe(first.random);
  expect(second.starRandom).not.toBe(first.starRandom);
  expect(createCaptureRng.mock.calls.filter(([seed]) => seed === 271828)).toHaveLength(2);
  expect(second.timeScale).toBe(1);
  await press('capture-return');
  expect(renderer.root.findAllByType('GameScreen')).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'capture-catalog' })).toHaveLength(1);
});

it('clears capture-only speed and chrome state when leaving a scenario', async () => {
  await mount();
  await press('capture-launch-stage1_early');
  await press('capture-half-speed');
  await press('capture-hide');
  await press('capture-reveal-hotspot');
  await press('capture-return');
  expect(renderer.root.findAllByType('GameScreen')).toHaveLength(0);
  await press('capture-launch-stage1_early');
  expect(game().props.captureSession.timeScale).toBe(1);
  expect(renderer.root.findAllByProps({ testID: 'capture-controls' })).toHaveLength(1);
  expect(createCaptureInitialState).toHaveBeenCalledTimes(2);
});

it('lets the real game overlay replay the same capture scenario through onReset', async () => {
  await mount();
  await press('capture-launch-final_victory');
  const first = game().props.captureSession;
  await act(async () => first.onReset());
  const replay = game().props.captureSession;
  expect(replay.initialState).toEqual(first.initialState);
  expect(replay.random).not.toBe(first.random);
  expect(createCaptureInitialState).toHaveBeenCalledTimes(2);
});

it('passes only in-memory fixtures to the real Stats and Achievements screens', async () => {
  await mount();
  await press('capture-launch-stats_fixture');
  expect(renderer.root.findByType('StatsScreen').props.captureFixture).toBe(CAPTURE_STATS_FIXTURE);
  await act(async () => renderer.root.findByType('StatsScreen').props.onBack());
  await press('capture-launch-achievements_fixture');
  expect(renderer.root.findByType('AchievementsScreen').props.captureFixture).toBe(CAPTURE_ACHIEVEMENTS_FIXTURE);
  await act(async () => renderer.root.findByType('AchievementsScreen').props.onBack());
  await press('capture-launch-stats');
  expect(renderer.root.findByType('StatsScreen').props.captureFixture).toBeUndefined();
  await act(async () => renderer.root.findByType('StatsScreen').props.onBack());
  await press('capture-launch-achievements');
  expect(renderer.root.findByType('AchievementsScreen').props.captureFixture).toBeUndefined();
});

it('opens real screen shortcuts and routes Show Me Play Now into non-persisting capture gameplay', async () => {
  await mount();
  await press('capture-launch-show_me');
  expect(renderer.root.findAllByType('ShowMeDemo')).toHaveLength(1);
  await act(async () => renderer.root.findByType('ShowMeDemo').props.onPlay());
  expect(game().props.captureSession.initialState.scenario).toBe('stage1_early');
  await act(async () => game().props.onExit());
  await press('capture-launch-settings');
  expect(renderer.root.findAllByType('SettingsScreen')).toHaveLength(1);
  await act(async () => renderer.root.findByType('SettingsScreen').props.onBack());
  expect(renderer.root.findAllByProps({ testID: 'capture-catalog' })).toHaveLength(1);
});
