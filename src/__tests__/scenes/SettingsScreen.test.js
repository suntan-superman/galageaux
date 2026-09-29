import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AudioManager from '../../engine/audio';
import SettingsScreen from '../../scenes/SettingsScreen';
import PauseOverlay from '../../components/PauseOverlay';
import { PLAYER, STORAGE_KEYS } from '../../constants/game';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity', Switch: 'Switch',
  StyleSheet: { create: styles => styles }, Linking: { openURL: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), multiRemove: jest.fn(),
}));
jest.mock('../../engine/audio', () => ({
  setSoundsEnabled: jest.fn(), setSoundVolume: jest.fn(),
  setMusicEnabled: jest.fn(), setMusicVolume: jest.fn(),
  playSound: jest.fn(), playMusic: jest.fn(), stopMusic: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue();
  AsyncStorage.multiRemove.mockResolvedValue();
});
afterEach(async () => { if (renderer) await act(async () => { renderer.unmount(); }); });

it.each([[0, 'soundsEnabled', 'setSoundsEnabled'], [1, 'musicEnabled', 'setMusicEnabled']])(
  'persists and applies the new audio toggle %s value', async (index, field, setter) => {
    await act(async () => { renderer = create(<SettingsScreen />); });
    await act(async () => { renderer.root.findAllByType('Switch')[index].props.onValueChange(false); });
    const saved = AsyncStorage.setItem.mock.calls.find(([key]) => key === STORAGE_KEYS.AUDIO_SETTINGS);
    expect(JSON.parse(saved[1])[field]).toBe(false);
    expect(AudioManager[setter]).toHaveBeenLastCalledWith(false);
  }
);

it('uses shared defaults and bounds in the settings slider', async () => {
  await act(async () => { renderer = create(<SettingsScreen />); });
  const slider = renderer.root.findAllByType('Slider')[2];
  expect(slider.props.value).toBe(PLAYER.TILT_SENSITIVITY_DEFAULT);
  expect(slider.props.minimumValue).toBe(PLAYER.TILT_SENSITIVITY_MIN);
  expect(slider.props.maximumValue).toBe(PLAYER.TILT_SENSITIVITY_MAX);
});

it('uses fractional adjustments and the same sensitivity bounds in pause controls', async () => {
  const change = jest.fn();
  const base = { visible: true, tiltSensitivity: 1.5, onChangeTiltSensitivity: change };
  await act(async () => { renderer = create(<PauseOverlay {...base} />); });
  const buttons = renderer.root.findAllByType('TouchableOpacity');
  buttons[4].props.onPress();
  buttons[5].props.onPress();
  expect(change.mock.calls).toEqual([[1.4], [1.6]]);
  await act(async () => { renderer.update(<PauseOverlay {...base} tiltSensitivity={0.5} />); });
  expect(renderer.root.findAllByType('TouchableOpacity')[4].props.disabled).toBe(true);
  await act(async () => { renderer.update(<PauseOverlay {...base} tiltSensitivity={3} />); });
  expect(renderer.root.findAllByType('TouchableOpacity')[5].props.disabled).toBe(true);
});
