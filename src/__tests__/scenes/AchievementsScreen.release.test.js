import React from 'react';
import { act, create } from 'react-test-renderer';
import AchievementsScreen from '../../scenes/AchievementsScreen';
import * as achievements from '../../engine/achievements';

const mockItems = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async key => mockItems.get(key) ?? null),
  setItem: jest.fn(async (key, value) => { mockItems.set(key, value); }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('react-native', () => {
  class Value {
    interpolate() { return 0.3; }
  }
  const animation = () => ({ start: () => {} });
  return {
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
    StyleSheet: { create: styles => styles },
    Animated: { Value, View: 'AnimatedView', spring: animation, timing: animation,
      sequence: animation, loop: animation },
  };
});

let renderer;
const textNodes = root => root.findAllByType('Text')
  .map(node => [node.props.children].flat(Infinity).join(''));
const cardFor = title => renderer.root.findAllByType('AnimatedView')
  .find(node => textNodes(node).includes(title));
const mount = async () => {
  await act(async () => { renderer = create(<AchievementsScreen onBack={() => {}} />); });
};

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockItems.clear();
  await achievements.resetAchievements();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = null;
});

it('renders a fresh gallery with zero completion and locked cards', async () => {
  await mount();
  const texts = textNodes(renderer.root);
  expect(texts).toContain(`0/${Object.keys(achievements.ACHIEVEMENTS).length}`);
  expect(texts).toContain('0%');
  expect(textNodes(cardFor('First Blood'))).toContain('🔒');
  expect(textNodes(cardFor('First Blood'))).not.toContain('✓');
  expect(texts).not.toContain('NEW!');
});

it('renders persisted achievement IDs as unlocked, counts them, and keeps other cards locked', async () => {
  await achievements.checkAchievements({ kills: 1, bosses: 1, level: 6, stageComplete: 1 });
  await mount();

  const texts = textNodes(renderer.root);
  expect(texts).toContain(`5/${Object.keys(achievements.ACHIEVEMENTS).length}`);
  expect(texts).toContain(`${Math.round(5 / Object.keys(achievements.ACHIEVEMENTS).length * 100)}%`);
  expect(texts).toContain('1/3'); // one of the three Combat achievements
  expect(texts).toContain('1/2'); // one of the two Boss achievements
  expect(textNodes(cardFor('First Blood'))).toContain('✓');
  expect(textNodes(cardFor('Boss Slayer'))).toContain('✓');
  expect(textNodes(cardFor('Legend'))).toContain('✓');
  expect(textNodes(cardFor('Sharpshooter'))).toContain('🔒');
  expect(textNodes(cardFor('Sharpshooter'))).not.toContain('✓');
  expect(texts).not.toContain('NEW!');
});

it('shows stage-specific locked progress instead of using the number of stages as progress', async () => {
  await achievements.checkAchievements({ stageComplete: 2 });
  await mount();

  expect(textNodes(cardFor('Stage Clear'))).toContain('0%');
  expect(textNodes(cardFor('Veteran Pilot'))).toContain('✓');
  expect(textNodes(cardFor('Ace Pilot'))).toContain('0%');
});
