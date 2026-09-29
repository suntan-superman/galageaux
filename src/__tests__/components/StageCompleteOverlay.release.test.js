import React from 'react';
import { act, create } from 'react-test-renderer';
import StageCompleteOverlay from '../../components/StageCompleteOverlay';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: styles => styles },
}));

let screen;
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; });

it('renders YOU WIN and the grouped final score only on final victory', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { screen = create(<StageCompleteOverlay visible currentStage="stage3"
    allStages={['stage1', 'stage2', 'stage3']} score={12345} onRetry={jest.fn()} onExit={jest.fn()} />); });
  const text = screen.root.findAllByType('Text').map(node => node.props.children);
  expect(text).toEqual(expect.arrayContaining(['YOU WIN', 'FINAL SCORE', '12,345', 'PLAY AGAIN', 'MAIN MENU']));
  expect(screen.root.findAllByType('TouchableOpacity')).toHaveLength(2);
  await act(async () => screen.update(<StageCompleteOverlay visible currentStage="stage1"
    allStages={['stage1', 'stage2', 'stage3']} score={12345} />));
  const interim = screen.root.findAllByType('Text').map(node => node.props.children);
  expect(interim).not.toContain('YOU WIN');
  expect(interim).not.toContain('FINAL SCORE');
});
