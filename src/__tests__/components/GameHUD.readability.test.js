import React from 'react';
import GameHUD from '../../components/GameHUD';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: value => value },
}));

const nodes = element => !React.isValidElement(element) ? []
  : [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
const values = element => nodes(element).filter(node => node.type === 'Text')
  .map(node => React.Children.toArray(node.props.children).join(''));
const base = { score: 1787, currentStage: 'stage1', level: 3, levelKills: 0,
  levelTarget: 8, lives: 2, hasShield: false, isPaused: false,
  onPauseToggle: jest.fn(), onExit: jest.fn() };

describe('compact gameplay HUD', () => {
  it('calls the ordinary-enemy counter enemies and keeps controls in a fitted, measured top strip', () => {
    const onLayout = jest.fn();
    const tree = GameHUD({ ...base, top: 67, onLayout });
    expect(values(tree)).toEqual(expect.arrayContaining([
      'SCORE', '1,787', 'STAGE', '1', 'LIVES', '♥ 2', 'PAUSE',
      'Level 03 · 0/8 enemies', 'NO SHIELD', 'Exit',
    ]));
    const hud = nodes(tree).find(node => node.type === 'View' && node.props.onLayout === onLayout);
    expect(hud.props.style[1].top).toBe(67);
    expect(hud.props.style[0]).toMatchObject({ left: 12, right: 12 });
    expect(nodes(tree).filter(node => node.type === 'Text' && node.props.children !== 'Exit')
      .every(node => node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit)).toBe(true);
    expect(nodes(tree).find(node => node.props.accessibilityLabel === 'Pause game').props.onPress)
      .toBe(base.onPauseToggle);
  });

  it('replaces the wave counter with an actionable boss label and names the shield state', () => {
    const active = GameHUD({ ...base, isBossEncounter: true, hasShield: true });
    expect(values(active)).toContain('BOSS FIGHT · Hit the ship');
    expect(values(active)).toContain('SHIELD ACTIVE');
    expect(values(active).some(value => value.includes('0/8'))).toBe(false);
    const defeated = GameHUD({ ...base, isBossEncounter: true, bossDefeated: true, isPaused: true });
    expect(values(defeated)).toContain('GUARDIAN DEFEATED');
    expect(values(defeated)).toContain('RESUME');
    expect(nodes(defeated).find(node => node.props.accessibilityLabel === 'Resume game')).toBeDefined();
  });
});
