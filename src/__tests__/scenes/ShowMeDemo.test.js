import React from 'react';
import { act, create } from 'react-test-renderer';
import ShowMeDemo from '../../scenes/ShowMeDemo';
import { DEMO_DURATION, DEMO_STEPS, demoStepIndex, getDemoFrame } from '../../scenes/showMeDemoTimeline';

let mockAppStateChange;
const mockRemoveAppState = jest.fn();
let mockWidth = 390, mockHeight = 844;
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: mockWidth, height: mockHeight }),
  AppState: { addEventListener: (_event, callback) => {
    mockAppStateChange = callback;
    return { remove: mockRemoveAppState };
  } },
}));
jest.mock('react-native-safe-area-context', () => ({
  initialWindowMetrics: { insets: { top: 59, bottom: 34 } },
}));
jest.mock('@shopify/react-native-skia', () => ({ Canvas: 'Canvas', Circle: 'Circle' }));
jest.mock('../../components/canvas', () => ({
  Background: 'Background', StarField: 'StarField', PlayerShip: 'PlayerShip',
  Enemies: 'Enemies', BossShip: 'BossShip', PlayerBullets: 'PlayerBullets',
  EnemyBullets: 'EnemyBullets', Powerups: 'Powerups',
}));
jest.mock('../../components/BossHealthBar', () => 'BossHealthBar');

const frame = time => getDemoFrame(time, 366, 476);

describe('Show Me practice storyboard', () => {
  it('teaches an actual sequence with straight shots, +100 grunt, +125 quick combo, and ordinary-enemy progress', () => {
    expect(DEMO_STEPS).toHaveLength(8);
    expect(frame(0)).toMatchObject({ score: 0, kills: 0, lives: 5, shield: false });
    expect(frame(0).player.x).toBeLessThan(frame(5.1).player.x);
    expect(frame(4.1).bullets.length).toBeGreaterThan(0);
    expect(frame(6.31)).toMatchObject({ score: 100, kills: 1, popup: '+100' });
    expect(frame(7.76)).toMatchObject({ score: 225, kills: 2, popup: '+125 · 2-KILL COMBO' });
    expect(DEMO_STEPS[1].text).toContain('Press and hold FIRE');
    expect(DEMO_STEPS[2].text).toContain('1.25× bonus');
    expect(DEMO_STEPS[6].text).toContain('0/8 counter tracks normal kills');
  });

  it('shows a guaranteed practice-only shield drop falling into the ship and blocking an orange projectile', () => {
    const earlyDrop = frame(8.6).powerups[0];
    const lateDrop = frame(11.9).powerups[0];
    expect(earlyDrop.kind).toBe('shield');
    expect(lateDrop.y).toBeGreaterThan(earlyDrop.y);
    expect(frame(12.09).powerups[0].y + 20).toBeGreaterThan(frame(12.09).player.y);
    expect(frame(12.2).powerups).toEqual([]);
    expect(frame(12.2).player.shield).toBe(true);
    expect(frame(14.4).enemyBullets.map(bullet => bullet.id)).toContain('practice-blocked');
    expect(frame(15.09).enemyBullets[0].y + 14).toBeGreaterThan(frame(15.09).player.y);
    expect(frame(15.2)).toMatchObject({ lives: 5, shield: false, popup: 'BLOCKED!' });
    expect(frame(15.2).enemyBullets).toEqual([]);
    expect(DEMO_STEPS[3].text).toContain('real run, enemy shield drops are random');
  });

  it('keeps boss-hit score unchanged until the +1000 defeat and makes a distinct dodge window', () => {
    expect(frame(16).boss.hp).toBe(100);
    expect(frame(17.7).boss.hp).toBe(100);
    expect(frame(17.8).boss.hp).toBeLessThan(100);
    expect(frame(18).boss.hp).toBeLessThan(100);
    expect(frame(18).score).toBe(225);
    expect(frame(20).boss.hp).toBe(58);
    expect(frame(20).player.x).toBeGreaterThan(frame(19).player.x);
    expect(frame(19.5).enemyBullets.length).toBeGreaterThan(0);
    expect(frame(23.49).boss.hp).toBeGreaterThan(0);
    expect(frame(23.5)).toMatchObject({ score: 1225, popup: '+1,000 BOSS!' });
    expect(frame(23.5).boss).toMatchObject({ hp: 0, alive: false, encounterState: 'DYING' });
    expect(frame(DEMO_DURATION).done).toBe(true);
    expect(demoStepIndex(DEMO_DURATION)).toBe(7);
  });

  it('is deterministic and bounded, including for an oversized or invalid clock', () => {
    expect(frame(14.7)).toEqual(frame(14.7));
    expect(getDemoFrame(NaN, 366, 476)).toEqual(frame(0));
    expect(getDemoFrame(999, 366, 476)).toEqual(frame(DEMO_DURATION));
    for (let tick = 0; tick <= 270; tick++) {
      const snapshot = frame(tick / 10);
      expect(snapshot.bullets.length).toBeLessThanOrEqual(8);
      expect(snapshot.enemyBullets.length).toBeLessThanOrEqual(5);
      expect(snapshot.powerups.length).toBeLessThanOrEqual(1);
      expect(snapshot.enemies.length).toBeLessThanOrEqual(1);
      expect(snapshot.lives).toBe(5);
    }
  });
});

describe('Show Me screen lifecycle and controls', () => {
  let renderer;
  const onBack = jest.fn(), onPlay = jest.fn();
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    jest.clearAllMocks();
    mockWidth = 390; mockHeight = 844;
  });
  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = null;
    jest.useRealTimers();
  });
  const mount = () => act(() => { renderer = create(<ShowMeDemo onBack={onBack} onPlay={onPlay} />); });
  const texts = () => renderer.root.findAllByType('Text').map(node => node.props.children).filter(value => typeof value === 'string');
  const press = testID => act(() => renderer.root.findByProps({ testID }).props.onPress());

  it('animates, can replay or skip, and does not launch a campaign until Play Now', () => {
    mount();
    expect(texts()).toContain('1 · LINE UP');
    expect(texts()).toContain('PRACTICE REPLAY · NO SCORE SAVED');
    act(() => jest.advanceTimersByTime(3500));
    expect(texts()).toContain('2 · FIRE STRAIGHT UP');
    press('demo-skip');
    expect(texts()).toContain('8 · CLEAR THE STAGES');
    expect(onPlay).not.toHaveBeenCalled();
    press('demo-replay');
    expect(texts()).toContain('1 · LINE UP');
    press('demo-play');
    expect(onPlay).toHaveBeenCalledTimes(1);
    press('demo-back');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('stops clock while backgrounded and removes both listeners and timer on unmount', () => {
    mount();
    act(() => jest.advanceTimersByTime(1000));
    expect(texts()).toContain('1 · LINE UP');
    act(() => mockAppStateChange('background'));
    act(() => jest.advanceTimersByTime(5000));
    expect(texts()).toContain('1 · LINE UP');
    act(() => mockAppStateChange('active'));
    act(() => jest.advanceTimersByTime(3300));
    expect(texts()).toContain('2 · FIRE STRAIGHT UP');
    act(() => renderer.unmount());
    renderer = null;
    expect(mockRemoveAppState).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps boss HUD, hull, and player in separate lanes on a short portrait screen', () => {
    mockWidth = 320; mockHeight = 568;
    mount();
    expect(renderer.root.findByType('Canvas').props.style).toEqual({ width: 296, height: 250 });
    act(() => jest.advanceTimersByTime(18000));
    const boss = renderer.root.findByType('BossShip').props.boss;
    const bar = renderer.root.findByType('BossHealthBar').props;
    const player = renderer.root.findByType('PlayerShip').props.player;
    expect(bar.y + bar.height).toBeLessThan(boss.y);
    expect(boss.y + boss.height).toBeLessThan(player.y);
    expect(bar.x).toBeGreaterThan(0);
    expect(bar.x + bar.width).toBeLessThan(296);
  });
});
