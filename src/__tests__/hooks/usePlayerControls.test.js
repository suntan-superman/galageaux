import React, { useLayoutEffect } from 'react';
import { act, create } from 'react-test-renderer';
import { PanResponder } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import usePlayerControls from '../../hooks/usePlayerControls';
import { PLAYER } from '../../constants/game';

jest.mock('react-native', () => ({
  PanResponder: { create: jest.fn(handlers => ({ panHandlers: handlers })) },
}));
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const defaults = {
  width: 400,
  playerWidth: 40,
  tiltEnabled: true,
  tiltSensitivity: PLAYER.TILT_SENSITIVITY_DEFAULT,
  isPaused: false,
  isAlive: true,
  gameOver: false,
  inBonusRound: false,
  onPositionChange: jest.fn(),
};

let renderer;
let controls;
let props;

function Harness({ config, onLayout }) {
  controls = usePlayerControls(config);
  useLayoutEffect(() => { onLayout?.(controls); });
  return null;
}

async function mount(overrides = {}) {
  props = { ...defaults, ...overrides };
  await act(async () => { renderer = create(<Harness config={props} />); });
}

async function update(overrides, onLayout) {
  props = { ...props, ...overrides };
  await act(async () => { renderer.update(<Harness config={props} onLayout={onLayout} />); });
}

beforeEach(() => { jest.clearAllMocks(); });
afterEach(async () => {
  if (renderer) await act(async () => { renderer.unmount(); });
  renderer = null;
});

it('switches the retained responder from tilt to touch and back using current mode', async () => {
  await mount();
  const handlers = controls.panHandlers;
  expect(handlers.onStartShouldSetPanResponder()).toBe(false);
  await update({ tiltEnabled: false });
  expect(handlers.onStartShouldSetPanResponder()).toBe(true);
  expect(handlers.onMoveShouldSetPanResponder()).toBe(true);
  await update({ tiltEnabled: true });
  expect(handlers.onStartShouldSetPanResponder()).toBe(false);
});

it('uses current bounds and callback without constructing another responder', async () => {
  const first = jest.fn();
  const next = jest.fn();
  await mount({ tiltEnabled: false, onPositionChange: first });
  const handlers = controls.panHandlers;
  await update({ width: 300, playerWidth: 60, onPositionChange: next });
  handlers.onPanResponderMove(null, { moveX: 600 });
  expect(first).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith(240);
  expect(PanResponder.create).toHaveBeenCalledTimes(1);
});

it.each([
  { isPaused: true },
  { isAlive: false },
  { gameOver: true },
  { tiltEnabled: true },
])('rejects an ongoing touch synchronously after state changes: %j', async change => {
  const move = jest.fn();
  await mount({ tiltEnabled: false, onPositionChange: move });
  const handlers = controls.panHandlers;
  await update(change, () => {
    expect(handlers.onMoveShouldSetPanResponder()).toBe(false);
    handlers.onPanResponderMove(null, { moveX: 200 });
    expect(move).not.toHaveBeenCalled();
  });
});

it('keeps a retained tilt updater current after sensitivity and bonus changes', async () => {
  await mount();
  const updateTilt = controls.updateTilt;
  controls.tiltCurrent.current = 0.1;
  controls.tiltTarget.current = 0.1;
  await update({ tiltSensitivity: 3, inBonusRound: true });
  expect(updateTilt(1 / 60, 180)).toBeCloseTo(176.5, 8);
});

it('preserves the former default steady tilt speed with the shared default sensitivity', async () => {
  await mount();
  controls.tiltCurrent.current = 0.1;
  controls.tiltTarget.current = 0.1;
  expect(controls.updateTilt(1 / 60, 180)).toBeCloseTo(178.6, 8);
});

it('has equivalent filtered response and movement after equal elapsed time at 30/60/120 Hz', async () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    await mount();
    controls.tiltTarget.current = 0.15;
    let x = 180;
    for (let i = 0; i < hz / 5; i += 1) x = controls.updateTilt(1 / hz, x) ?? x;
    results.push({ x, tilt: controls.tiltCurrent.current });
    await act(async () => { renderer.unmount(); });
    renderer = null;
  }
  for (const result of results.slice(1)) {
    expect(result.tilt).toBeCloseTo(results[0].tilt, 8);
    expect(result.x).toBeCloseTo(results[0].x, 5);
  }
});

it('gates tilt while paused and removes its sensor listener on unmount', async () => {
  await mount();
  const subscription = Accelerometer.addListener.mock.results[0].value;
  const updateTilt = controls.updateTilt;
  controls.tiltTarget.current = 0.2;
  await update({ isPaused: true }, () => {
    expect(updateTilt(1 / 60, 180)).toBeNull();
  });
  await act(async () => { renderer.unmount(); });
  renderer = null;
  expect(subscription.remove).toHaveBeenCalledTimes(1);
});
