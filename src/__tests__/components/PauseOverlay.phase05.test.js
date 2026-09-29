import React from 'react';
import { act, create } from 'react-test-renderer';
import PauseOverlay from '../../components/PauseOverlay';

// Inspect the real component's layout/accessibility contracts, not native Yoga
// text measurements. Physical-iPhone checks remain necessary for actual fit.
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
  StyleSheet: { create: styles => styles }, Linking: { openURL: jest.fn() },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
const flattenStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const textOf = node => typeof node === 'string' ? node : node.children.map(textOf).join('');
let renderer;
let props;
const buttons = () => renderer.root.findAllByType('TouchableOpacity');
const button = label => buttons().find(node => textOf(node).startsWith(label));
const text = value => renderer.root.findAllByType('Text').find(node => textOf(node) === value);
const mount = async (extra = {}) => {
  await act(async () => { renderer = create(<PauseOverlay {...props} {...extra} />); });
};

beforeEach(() => {
  props = {
    visible: true, autoFire: true, tiltControl: false, fireButtonPosition: 'left',
    tiltSensitivity: 1.5, soundsEnabled: true, musicEnabled: false, soundVolume: 0.33, musicVolume: 0.55,
    onResume: jest.fn(), onExit: jest.fn(), onToggleAutoFire: jest.fn(), onToggleTiltControl: jest.fn(),
    onToggleFireButtonPosition: jest.fn(), onToggleSounds: jest.fn(), onToggleMusic: jest.fn(),
    onChangeTiltSensitivity: jest.fn(), onChangeSoundVolume: jest.fn(), onChangeMusicVolume: jest.fn(),
  };
});
afterEach(async () => { if (renderer) await act(async () => { renderer.unmount(); }); });

it.each(['1.5', '33%', '55%'])('keeps %s readable in a single nonshrinking numeric field', async value => {
  await mount();
  const numeric = text(value);
  const style = flattenStyle(numeric.props.style);
  expect(numeric.props.numberOfLines).toBe(1);
  expect(style.minWidth).toBeGreaterThanOrEqual(64);
  expect(style.flexShrink).toBe(0);
  expect(style.fontSize).toBeGreaterThanOrEqual(18);
  expect(numeric.props.allowFontScaling).not.toBe(false);
});

it('retains at least 44-point usable touch targets, including steppers and Quit', async () => {
  await mount();
  buttons().forEach(node => {
    const style = flattenStyle(node.props.style);
    expect(style.minHeight ?? style.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(style.minWidth ?? style.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(node.props.accessibilityRole).toMatch(/button|switch/);
  });
});

it('uses the requested compact control hierarchy', async () => {
  await mount();
  const labels = renderer.root.findAllByType('Text').map(textOf);
  const order = ['PAUSED', 'Resume', 'Gameplay', 'Auto-Fire', 'Tilt Control', 'Fire Button',
    'Tilt Sensitivity', 'Audio', 'Sound FX', 'Music', 'Sound Volume', 'Music Volume', 'Quit to Menu'];
  expect(labels.filter(label => order.includes(label))).toEqual(order);
  expect(labels).not.toContain('Take a breather, pilot.');
});

it('removes legal links from this panel only', async () => {
  await mount();
  expect(text('Terms of Service')).toBeUndefined();
  expect(text('Privacy Policy')).toBeUndefined();
});

it('allows narrow/large-text rows to wrap and overflow to scroll without ordinary bounce/chrome', async () => {
  await mount();
  const scroll = renderer.root.findByType('ScrollView');
  expect(scroll.props.bounces).toBe(false);
  expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
  expect(scroll.props.contentInsetAdjustmentBehavior).toBe('automatic');
  expect(flattenStyle(scroll.props.contentContainerStyle)).toMatchObject({
    flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 16,
  });
  for (const id of ['pause-tilt-row', 'pause-sound-row', 'pause-music-row']) {
    const row = renderer.root.findByProps({ testID: id });
    expect(flattenStyle(row.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
  }
});

it('preserves resume/quit/toggle callbacks and fractional setting adjustments', async () => {
  await mount();
  for (const [label, callback] of [
    ['Resume', 'onResume'], ['Auto-Fire', 'onToggleAutoFire'], ['Tilt Control', 'onToggleTiltControl'],
    ['Fire Button', 'onToggleFireButtonPosition'], ['Sound FX', 'onToggleSounds'],
    ['Music', 'onToggleMusic'], ['Quit to Menu', 'onExit'],
  ]) {
    button(label).props.onPress();
    expect(props[callback]).toHaveBeenCalledTimes(1);
  }
  const decrease = buttons().filter(node => textOf(node) === '-');
  const increase = buttons().filter(node => textOf(node) === '+');
  decrease.forEach(node => node.props.onPress());
  increase.forEach(node => node.props.onPress());
  expect(props.onChangeTiltSensitivity.mock.calls).toEqual([[1.4], [1.6]]);
  expect(props.onChangeSoundVolume.mock.calls[0][0]).toBeCloseTo(0.23);
  expect(props.onChangeSoundVolume.mock.calls[1][0]).toBeCloseTo(0.43);
  expect(props.onChangeMusicVolume.mock.calls[0][0]).toBeCloseTo(0.45);
  expect(props.onChangeMusicVolume.mock.calls[1][0]).toBeCloseTo(0.65);
});

it('preserves disabled boundaries and clamps adjustments', async () => {
  await mount({ tiltSensitivity: 0.5, soundVolume: 0, musicVolume: 1 });
  const decrease = buttons().filter(node => textOf(node) === '-');
  const increase = buttons().filter(node => textOf(node) === '+');
  expect(decrease[0].props.disabled).toBe(true);
  expect(decrease[1].props.disabled).toBe(true);
  expect(increase[2].props.disabled).toBe(true);
  decrease[0].props.onPress(); decrease[1].props.onPress(); increase[2].props.onPress();
  expect(props.onChangeTiltSensitivity).toHaveBeenCalledWith(0.5);
  expect(props.onChangeSoundVolume).toHaveBeenCalledWith(0);
  expect(props.onChangeMusicVolume).toHaveBeenCalledWith(1);
});

it('renders nothing when hidden', async () => {
  await mount({ visible: false });
  expect(renderer.toJSON()).toBeNull();
});
