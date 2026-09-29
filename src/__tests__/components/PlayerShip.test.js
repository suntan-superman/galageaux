import React from 'react';
import PlayerShip from '../../components/canvas/PlayerShip';

// Inspect production component output; no native rasterization is required to
// verify that every hull/exhaust coordinate receives the same camera offset.
jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Path: 'Path', Rect: 'Rect',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', vec: (x, y) => ({ x, y }),
  Skia: { Path: { MakeFromSVGString: svg => Object.freeze({ svg }) } },
}));

// Local cached geometry now moves via groups. Compare fully composed affine
// coordinates rather than requiring each primitive to contain camera offsets.
const IDENTITY = [1, 0, 0, 1, 0, 0];
const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const transformMatrix = transforms => (transforms || []).reduce((matrix, transform) => {
  const [key, value] = Object.entries(transform)[0];
  const next = [...IDENTITY];
  if (key === 'translateX') next[4] = value;
  if (key === 'translateY') next[5] = value;
  if (key === 'scaleX') next[0] = value;
  if (key === 'scaleY') next[3] = value;
  if (key === 'skewX') next[2] = Math.tan(value);
  if (key === 'rotate') {
    next[0] = next[3] = Math.cos(value);
    next[1] = Math.sin(value); next[2] = -Math.sin(value);
  }
  return multiply(matrix, next);
}, IDENTITY);
const position = (matrix, x, y) => ({
  x: matrix[0] * x + matrix[2] * y + matrix[4],
  y: matrix[1] * x + matrix[3] * y + matrix[5],
});
const flatten = (element, parent = IDENTITY) => {
  const matrix = multiply(parent, transformMatrix(element.props.transform));
  return [{ element, matrix }, ...React.Children.toArray(element.props.children).flatMap(child => flatten(child, matrix))];
};

describe('Phase 0 player exhaust camera coordinates', () => {
  const props = {
    player: { x: 100, y: 200, width: 40, height: 22, shield: true },
    flameLength: 20,
    flameWidth: 8,
    inBonusRound: true,
    hitFlash: 0.5,
    bank: 0.1,
    velocityX: 180,
    time: 0.3,
  };

  it.each([[7, -3], [-4, 5]])('applies shake (%i, %i) exactly once to hull, exhaust and gradients', (ox, oy) => {
    const original = flatten(PlayerShip({ ...props, ox: 0, oy: 0 }));
    const shifted = flatten(PlayerShip({ ...props, ox, oy }));
    expect(shifted).toHaveLength(original.length);
    original.forEach(({ element: node, matrix }, index) => {
      const { element: actual, matrix: shiftedMatrix } = shifted[index];
      expect(actual.type).toBe(node.type);
      expect(shiftedMatrix.slice(0, 4)).toEqual(matrix.slice(0, 4));
      expect(shiftedMatrix[4]).toBeCloseTo(matrix[4] + ox, 10);
      expect(shiftedMatrix[5]).toBeCloseTo(matrix[5] + oy, 10);
      if (typeof (node.props.x ?? node.props.cx) === 'number') {
        const before = position(matrix, node.props.x ?? node.props.cx, node.props.y ?? node.props.cy);
        const after = position(shiftedMatrix, actual.props.x ?? actual.props.cx, actual.props.y ?? actual.props.cy);
        expect(after.x).toBeCloseTo(before.x + ox, 10);
        expect(after.y).toBeCloseTo(before.y + oy, 10);
      }
      ['start', 'end'].forEach(key => {
        if (node.props[key]) {
          const before = position(matrix, node.props[key].x, node.props[key].y);
          const after = position(shiftedMatrix, actual.props[key].x, actual.props[key].y);
          expect(after.x).toBeCloseTo(before.x + ox, 10);
          expect(after.y).toBeCloseTo(before.y + oy, 10);
        }
      });
      ['width', 'height', 'r', 'color', 'colors', 'path'].forEach(key => {
        expect(actual.props[key]).toEqual(node.props[key]);
      });
    });
  });
});
