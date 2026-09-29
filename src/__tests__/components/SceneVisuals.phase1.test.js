import React from 'react';
import Background from '../../components/canvas/Background';
import StarField from '../../components/canvas/StarField';
import Powerups from '../../components/canvas/Powerups';
import { getStageTheme } from '../../engine/sceneVisuals';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Path: 'Path', Rect: 'Rect',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', vec: (x, y) => ({ x, y }),
}));

const flatten = element => element && typeof element === 'object'
  ? [element, ...React.Children.toArray(element.props.children).flatMap(flatten)] : [];

describe('production scene rendering contracts (not native rasterization)', () => {
  it.each(['stage1', 'stage2', 'stage3'])('uses a real base gradient and two soft radial falloffs for %s', stage => {
    const nodes = flatten(Background({ width: 400, height: 800, stage, time: 4 }));
    const gradients = nodes.filter(node => node.type === 'LinearGradient');
    expect(gradients).toHaveLength(1);
    expect(gradients[0].props.colors).toBe(getStageTheme(stage).space);
    const radial = nodes.filter(node => node.type === 'RadialGradient');
    expect(radial).toHaveLength(2);
    radial.forEach(node => expect(node.props.colors[node.props.colors.length - 1]).toMatch(/00$/));
  });

  it('keeps full-screen base coverage fixed even when legacy offsets are supplied', () => {
    const nodes = flatten(Background({ width: 400, height: 800, ox: 9, oy: -7 }));
    expect(nodes.find(node => node.type === 'Rect').props).toMatchObject({ x: 0, y: 0, width: 400, height: 800 });
  });

  it('adds glow only to explicitly selected near stars and uses stable identities', () => {
    const stars = Object.freeze([
      Object.freeze({ id: 'far', x: 1, y: 2, size: 1, color: '200,200,220', layer: 'far', glow: true }),
      Object.freeze({ id: 'near-plain', x: 3, y: 4, size: 2, color: '200,200,220', layer: 'near', glow: false }),
      Object.freeze({ id: 'near-glow', x: 5, y: 6, size: 2, color: '200,200,220', layer: 'near', glow: true }),
    ]);
    const nodes = flatten(StarField({ stars, time: 3, ox: 7, oy: -2 }));
    expect(nodes.filter(node => node.type === 'Circle')).toHaveLength(4);
    expect(nodes.filter(node => node.type === 'Group').map(node => node.key)).toEqual(expect.arrayContaining([
      expect.stringContaining('far'), expect.stringContaining('near-plain'), expect.stringContaining('near-glow'),
    ]));
    expect(nodes.filter(node => node.type === 'Circle')[0].props).toMatchObject({ cx: 8, cy: 0 });
    expect(stars[0].x).toBe(1);
  });

  it('keeps every collectible at its authoritative position/size with an upright glyph and no text', () => {
    const powerups = ['double', 'triple', 'spread', 'rapid', 'shield', 'slow'].map((kind, index) => Object.freeze({
      id: `pickup-${index}`, kind, x: 100 + index * 25, y: 200, size: 20, rotation: 50,
    }));
    Object.freeze(powerups);
    const nodes = flatten(Powerups({ powerups, time: 3, ox: 8, oy: -3 }));
    const groups = nodes.filter(node => node.type === 'Group');
    expect(groups).toHaveLength(6);
    groups.forEach((group, index) => {
      expect(group.props.transform).toEqual([{ translateX: powerups[index].x + 8 }, { translateY: 197 }, { scale: 1 }]);
      expect(group.key).toContain(powerups[index].id);
    });
    expect(nodes.filter(node => node.type === 'Path')).toHaveLength(18);
    expect(nodes.filter(node => node.type === 'Circle')).toHaveLength(6);
    expect(nodes.some(node => node.type === 'Text')).toBe(false);
    expect(powerups[0]).toMatchObject({ x: 100, y: 200, size: 20, rotation: 50 });
  });

  it('cannot advance decorative phases from wall time during a frozen render', () => {
    const now = jest.spyOn(Date, 'now').mockImplementation(() => { throw new Error('wall clock'); });
    try {
      expect(() => Background({ width: 400, height: 800, time: 3 })).not.toThrow();
      expect(() => StarField({ stars: [{ id: 'star', x: 0, y: 0, layer: 'mid', size: 1, color: '200,200,220' }], time: 3 })).not.toThrow();
      expect(() => Powerups({ powerups: [{ id: 'pickup', kind: 'slow', x: 0, y: 0, size: 20 }], time: 3 })).not.toThrow();
    } finally { now.mockRestore(); }
  });
});
