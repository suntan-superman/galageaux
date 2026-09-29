import React from 'react';
import { act, create } from 'react-test-renderer';
import FireButton from '../../components/FireButton';
import ControlHintsOverlay from '../../components/ControlHintsOverlay';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
  StyleSheet: { create: styles => styles },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
const mount = async element => { await act(async () => { renderer = create(element); }); };
const textOf = node => typeof node === 'string' ? node : node.children.map(textOf).join('');
const labels = () => renderer.root.findAllByType('Text').map(textOf);
afterEach(async () => { if (renderer) await act(async () => { renderer.unmount(); }); renderer = null; });

describe('FIRE touch control', () => {
  it('preserves single-tap callback when hold callbacks are not supplied', async () => {
    const onFire = jest.fn();
    await mount(<FireButton onFire={onFire} />);
    const button = renderer.root.findByType('TouchableOpacity');
    expect(button.props.onPress).toBe(onFire);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Fire weapon');
    button.props.onPress();
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('starts and ends a hold without issuing a second tap shot on release', async () => {
    const onFire = jest.fn(), onPressIn = jest.fn(), onPressOut = jest.fn();
    await mount(<FireButton onFire={onFire} onPressIn={onPressIn} onPressOut={onPressOut} />);
    const button = renderer.root.findByType('TouchableOpacity');
    expect(button.props.onPress).toBeUndefined();
    expect(button.props.accessibilityHint).toMatch(/Hold to fire/);
    button.props.onPressIn();
    button.props.onPressOut();
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expect(onFire).not.toHaveBeenCalled();
    button.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('exposes disabled status to touch and accessibility, and hides cleanly', async () => {
    const onFire = jest.fn(), onPressIn = jest.fn();
    await mount(<FireButton disabled onFire={onFire} onPressIn={onPressIn} />);
    const button = renderer.root.findByType('TouchableOpacity');
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    button.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    expect(onFire).not.toHaveBeenCalled();
    await act(async () => { renderer.update(<FireButton visible={false} onFire={onFire} />); });
    expect(renderer.toJSON()).toBeNull();
  });
});

describe('How to play guide', () => {
  it('accurately explains controls, score, boss health and the rare shield pickup', async () => {
    await mount(<ControlHintsOverlay visible onDismiss={jest.fn()} />);
    const guide = labels().join(' ');
    expect(guide).toContain('five lives');
    expect(guide).toContain('Turn Tilt Control off');
    expect(guide).toContain('hold it to keep firing');
    expect(guide).toContain('Consecutive kills raise your combo');
    expect(guide).toContain('0/8-style counter tracks ordinary-enemy kills, not boss health');
    expect(guide).toContain('glowing shield-shaped badge');
    expect(guide).toContain('four seconds or absorbs one hit');
    expect(guide).toContain('Points do not unlock shields');
    expect(guide).toContain('one shot is not enough');
    expect(guide).toContain('1,000 points');
    expect(guide).not.toContain('3 lives');
    expect(renderer.root.findByType('ScrollView')).toBeTruthy();
  });

  it('retains the back and dismissal actions', async () => {
    const onBack = jest.fn(), onDismiss = jest.fn();
    await mount(<ControlHintsOverlay visible onDismiss={onDismiss} onBack={onBack} />);
    const buttons = renderer.root.findAllByType('TouchableOpacity');
    buttons[0].props.onPress();
    buttons[1].props.onPress();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
