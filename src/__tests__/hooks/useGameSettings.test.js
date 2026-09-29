import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useGameSettings from '../../hooks/useGameSettings';
import { PLAYER, STORAGE_KEYS } from '../../constants/game';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../../engine/audio', () => ({
  setSoundsEnabled: jest.fn(), setSoundVolume: jest.fn(),
  setMusicEnabled: jest.fn(), setMusicVolume: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
let settings;
let storage;

function Harness() {
  settings = useGameSettings();
  return null;
}

async function mount() {
  await act(async () => { renderer = create(<Harness />); });
}

beforeEach(() => {
  storage = new Map();
  AsyncStorage.getItem.mockImplementation(async key => storage.get(key) ?? null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { storage.set(key, value); });
});
afterEach(async () => { if (renderer) await act(async () => { renderer.unmount(); }); });

it('uses the same default sensitivity as the menu and game constants', async () => {
  await mount();
  expect(settings.loaded).toBe(true);
  expect(settings.tiltSensitivity).toBe(PLAYER.TILT_SENSITIVITY_DEFAULT);
});

it('round-trips a fractional sensitivity through real hook persistence', async () => {
  await mount();
  await act(async () => { await settings.handleTiltSensitivityChange(1.9); });
  expect(storage.get(STORAGE_KEYS.TILT_SENSITIVITY)).toBe('1.9');
  await act(async () => { renderer.unmount(); });
  await mount();
  expect(settings.tiltSensitivity).toBe(1.9);
});

it.each([
  ['0.5', 0.5], ['3', 3], ['10', 3], ['0.1', 0.5],
  ['invalid', PLAYER.TILT_SENSITIVITY_DEFAULT],
])('restores %s within the shared sensitivity bounds', async (saved, expected) => {
  storage.set(STORAGE_KEYS.TILT_SENSITIVITY, saved);
  await mount();
  expect(settings.tiltSensitivity).toBe(expected);
});
