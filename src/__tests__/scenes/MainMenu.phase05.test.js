import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Audio from '../../engine/audio';
import MainMenu from '../../scenes/MainMenu';
import { STORAGE_KEYS } from '../../constants/game';

let mockWidth = 390;
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: mockWidth, height: 844 }),
}));
jest.mock('@shopify/react-native-skia', () => ({ Canvas: 'Canvas', Rect: 'Rect', Circle: 'Circle' }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../../engine/audio', () => ({
  initializeAudio: jest.fn(), playMusic: jest.fn(), playSound: jest.fn(),
  setMusicEnabled: jest.fn(), setMusicVolume: jest.fn(),
  setSoundsEnabled: jest.fn(), setSoundVolume: jest.fn(),
  getAudioSettings: jest.fn(),
}));
jest.mock('../../scenes/GameScreen', () => 'GameScreen');
jest.mock('../../scenes/ShowMeDemo', () => 'ShowMeDemo');
jest.mock('../../scenes/AchievementsScreen', () => 'AchievementsScreen');
jest.mock('../../scenes/SettingsScreen', () => 'SettingsScreen');
jest.mock('../../scenes/StatsScreen', () => 'StatsScreen');
jest.mock('../../components/AudioStatusBadge', () => 'AudioStatusBadge');

const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const labels = ['PLAY', 'SHOW ME HOW', 'ACHIEVEMENTS', 'SETTINGS', 'STATS'];
let renderer;
const mount = async () => { await act(async () => { renderer = create(<MainMenu />); }); };
const press = async index => { await act(async () => renderer.root.findAllByType('TouchableOpacity')[index].props.onPress()); };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks(); mockWidth = 390;
  AsyncStorage.getItem.mockResolvedValue(null);
  Audio.initializeAudio.mockResolvedValue({ success: true });
  Audio.getAudioSettings.mockReturnValue({ musicEnabled: true, musicVolume: 0.5 });
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; });

it.each([320, 375, 390, 430])('keeps all labels single-line and readable within a %s-point viewport', async width => {
  mockWidth = width; await mount();
  const buttons = renderer.root.findAllByType('TouchableOpacity');
  expect(buttons).toHaveLength(labels.length);
  buttons.forEach((button, index) => {
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe(labels[index]);
    const label = button.findAllByType('Text').find(node => node.props.children === labels[index]);
    expect(label).toBeDefined();
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBeGreaterThanOrEqual(0.85);
    expect(flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(16);
    const style = flatten(button.props.style);
    expect(style.width).toBe(Math.min(320, width - 48));
    expect(style.paddingHorizontal).toBeLessThanOrEqual(16);
  });
});

it('restores the saved preference before cold-menu playback without writing it', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ musicEnabled: true, musicVolume: 0.8 }));
  await mount();
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.AUDIO_SETTINGS);
  expect(Audio.setMusicVolume).toHaveBeenCalledWith(0.8);
  expect(Audio.playMusic).toHaveBeenCalledWith('menu');
  expect(Audio.setMusicVolume.mock.invocationCallOrder[0]).toBeLessThan(Audio.playMusic.mock.invocationCallOrder[0]);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('honors a disabled saved preference on cold launch', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ musicEnabled: false, musicVolume: 0.55 }));
  Audio.getAudioSettings.mockReturnValue({ musicEnabled: false, musicVolume: 0.55 });
  await mount();
  expect(Audio.setMusicEnabled).toHaveBeenCalledWith(false);
  expect(Audio.setMusicVolume).toHaveBeenCalledWith(0.55);
  expect(Audio.playMusic).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('does not apply late storage results after leaving the menu', async () => {
  let finish;
  AsyncStorage.getItem.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount(); await press(0);
  await act(async () => finish(JSON.stringify({ musicEnabled: true, musicVolume: 0.9 })));
  expect(Audio.setMusicVolume).not.toHaveBeenCalled();
  expect(Audio.playMusic).not.toHaveBeenCalled();
});

it('does not start menu music after delayed initialization completes inside gameplay', async () => {
  let finish;
  Audio.initializeAudio.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount(); await press(0);
  await act(async () => finish({ success: true }));
  expect(Audio.playMusic).not.toHaveBeenCalled();
});

it('requests menu music again on return without rereading or rewriting restored preferences', async () => {
  await mount(); await press(0);
  await act(async () => renderer.root.findByType('GameScreen').props.onExit());
  expect(Audio.playMusic.mock.calls).toEqual([['menu'], ['menu']]);
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('routes SHOW ME HOW to a replayable demo without starting a campaign until Play Now', async () => {
  await mount(); await press(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('galageaux:firstPlayCueSeen', '1');
  expect(renderer.root.findAllByType('GameScreen')).toHaveLength(0);
  const demo = renderer.root.findByType('ShowMeDemo');
  await act(async () => demo.props.onBack());
  expect(renderer.root.findAllByType('ShowMeDemo')).toHaveLength(0);
  await press(0);
  expect(renderer.root.findByType('GameScreen').props.showFirstPlayCue).toBe(false);
  await act(async () => renderer.root.findByType('GameScreen').props.onExit());
  await press(1);
  await act(async () => renderer.root.findByType('ShowMeDemo').props.onPlay());
  expect(renderer.root.findAllByType('GameScreen')).toHaveLength(1);
  expect(renderer.root.findByType('GameScreen').props.showFirstPlayCue).toBe(false);
});

it('keeps Account hidden and requests a first-play cue only for direct PLAY', async () => {
  await mount();
  expect(renderer.root.findAllByType('TouchableOpacity').map(button => button.props.accessibilityLabel))
    .not.toContain('ACCOUNT');
  await press(0);
  expect(renderer.root.findByType('GameScreen').props.showFirstPlayCue).toBe(true);
});

it('waits for the same pending initialization when returning rapidly to the menu', async () => {
  let finish;
  Audio.initializeAudio.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount(); await press(0);
  await act(async () => renderer.root.findByType('GameScreen').props.onExit());
  expect(Audio.initializeAudio).toHaveBeenCalledTimes(1);
  expect(Audio.playMusic).not.toHaveBeenCalled();
  await act(async () => finish({ success: true }));
  expect(Audio.playMusic.mock.calls).toEqual([['menu']]);
});

it('uses current settings on return instead of restoring old enabled preferences', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ musicEnabled: true, musicVolume: 0.8 }));
  await mount(); await press(3);
  Audio.getAudioSettings.mockReturnValue({ musicEnabled: false, musicVolume: 0.55 });
  Audio.playMusic.mockClear(); Audio.setMusicEnabled.mockClear(); Audio.setMusicVolume.mockClear();
  await act(async () => renderer.root.findByType('SettingsScreen').props.onBack());
  expect(Audio.playMusic).not.toHaveBeenCalled();
  expect(Audio.setMusicEnabled).not.toHaveBeenCalled();
  expect(Audio.setMusicVolume).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('ignores stored preferences arriving after unmount', async () => {
  let finish;
  AsyncStorage.getItem.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => renderer.unmount()); renderer = null;
  await act(async () => finish(JSON.stringify({ musicEnabled: true, musicVolume: 0.8 })));
  expect(Audio.setMusicVolume).not.toHaveBeenCalled();
  expect(Audio.playMusic).not.toHaveBeenCalled();
});

it('falls back to current defaults if stored JSON is malformed without rewriting storage', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    AsyncStorage.getItem.mockResolvedValue('{broken');
    await mount();
    expect(Audio.playMusic).toHaveBeenCalledWith('menu');
    expect(Audio.setMusicVolume).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  } finally { warning.mockRestore(); }
});
