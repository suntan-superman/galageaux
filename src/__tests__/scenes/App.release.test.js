import React from 'react';
import { act, create } from 'react-test-renderer';
import { createGameSession, stepGameSession } from '../../engine/gameSimulation';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView',
  StatusBar: 'StatusBar', ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'ios' }, StyleSheet: { create: styles => styles },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Rect: 'Rect', Circle: 'Circle', LinearGradient: 'LinearGradient',
  vec: (x, y) => ({ x, y }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}),
}));
jest.mock('../../../constants/firebase', () => { throw new Error('Firebase initialized in offline V1'); });
jest.mock('../../engine/audio', () => ({
  initializeAudio: jest.fn(async () => ({ success: true })), playMusic: jest.fn(async () => {}),
  playSound: jest.fn(), getAudioSettings: jest.fn(() => ({ musicEnabled: true })),
}));
jest.mock('../../scenes/SplashScreen', () => 'SplashScreen');
jest.mock('../../scenes/GameScreen', () => 'GameScreen');
jest.mock('../../scenes/ShowMeDemo', () => 'ShowMeDemo');
jest.mock('../../scenes/AchievementsScreen', () => 'AchievementsScreen');
jest.mock('../../scenes/SettingsScreen', () => 'SettingsScreen');
jest.mock('../../components/AudioStatusBadge', () => 'AudioStatusBadge');
jest.mock('../../components/GameErrorFallback', () => 'GameErrorFallback');
jest.mock('../../i18n', () => ({ formatScore: value => Number(value).toLocaleString('en-US') }));

const firebaseEnvNames = [
  'EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
];

it('starts App, opens local Stats, and starts core play with no Firebase configuration', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const previous = Object.fromEntries(firebaseEnvNames.map(name => [name, process.env[name]]));
  firebaseEnvNames.forEach(name => { delete process.env[name]; });
  let screen;
  try {
    const App = require('../../../App').default;
    await act(async () => { screen = create(<App />); });
    await act(async () => screen.root.findByType('SplashScreen').props.onFinish());
    const labels = screen.root.findAllByType('TouchableOpacity').map(node => node.props.accessibilityLabel);
    expect(labels).toEqual(expect.arrayContaining(['PLAY', 'SHOW ME HOW', 'ACHIEVEMENTS', 'SETTINGS', 'STATS']));
    expect(labels).not.toContain('ACCOUNT');
    await act(async () => screen.root.findAllByType('TouchableOpacity')
      .find(node => node.props.accessibilityLabel === 'STATS').props.onPress());
    expect(screen.root.findAllByType('Text').some(node => node.props.children === 'No runs yet. Play a game to build your stats.')).toBe(true);
    await act(async () => screen.root.findAllByType('TouchableOpacity')
      .find(node => node.props.onPress && node.findAllByType('Text').some(text => text.props.children === '← Back'))
      .props.onPress());
    await act(async () => screen.root.findAllByType('TouchableOpacity')
      .find(node => node.props.accessibilityLabel === 'PLAY').props.onPress());
    expect(screen.root.findByType('GameScreen').props.showFirstPlayCue).toBe(true);
    const first = createGameSession(390, 844);
    const next = stepGameSession(first, 1 / 60, {}, () => 0.5);
    expect(next.state.phase).toBe('playing');
    expect(next.state.enemies.length).toBeGreaterThan(0);
  } finally {
    if (screen) await act(async () => screen.unmount());
    firebaseEnvNames.forEach(name => {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    });
  }
});
