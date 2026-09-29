import React from 'react';
import PlayerShip from '../../components/canvas/PlayerShip';

// Inspect production component output; no native rasterization is required to
// verify that every hull/exhaust coordinate receives the same camera offset.
jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Path: 'Path', Rect: 'Rect',
  LinearGradient: 'LinearGradient', vec: (x, y) => ({ x, y }),
}));

const flatten = element => [
  element,
  ...React.Children.toArray(element.props.children).flatMap(flatten),
];

describe('Phase 0 player exhaust camera coordinates', () => {
  const props = {
    player: { x: 100, y: 200, width: 40, height: 22, shield: true },
    flameLength: 20,
    flameWidth: 8,
    inBonusRound: true,
    hitFlash: 0.5,
  };

  it.each([[7, -3], [-4, 5]])('applies shake (%i, %i) exactly once to hull, exhaust and gradients', (ox, oy) => {
    const original = flatten(PlayerShip({ ...props, ox: 0, oy: 0 }));
    const shifted = flatten(PlayerShip({ ...props, ox, oy }));
    expect(shifted).toHaveLength(original.length);
    original.forEach((node, index) => {
      const actual = shifted[index];
      expect(actual.type).toBe(node.type);
      ['x', 'cx'].forEach(key => {
        if (typeof node.props[key] === 'number') {
          expect(actual.props[key]).toBeCloseTo(node.props[key] + ox, 10);
        }
      });
      ['y', 'cy'].forEach(key => {
        if (typeof node.props[key] === 'number') {
          expect(actual.props[key]).toBeCloseTo(node.props[key] + oy, 10);
        }
      });
      ['start', 'end'].forEach(key => {
        if (node.props[key]) {
          expect(actual.props[key].x).toBeCloseTo(node.props[key].x + ox, 10);
          expect(actual.props[key].y).toBeCloseTo(node.props[key].y + oy, 10);
        }
      });
      ['width', 'height', 'r', 'color', 'colors'].forEach(key => {
        expect(actual.props[key]).toEqual(node.props[key]);
      });
    });
  });
});
