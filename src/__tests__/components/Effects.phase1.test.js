import React from 'react';
import { Explosions, Particles } from '../../components/canvas/Effects';
import { GAMEPLAY } from '../../constants/game';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Rect: 'Rect', RadialGradient: 'RadialGradient',
  vec: (x, y) => ({ x, y }),
}));
// Powerup glyphs have their own production component coverage.
jest.mock('../../components/canvas/Powerups', () => 'Powerups', { virtual: true });
const flatten = element => [element, ...React.Children.toArray(element.props.children).flatMap(flatten)];
const particle = { id: 'particle-1', x: 10, y: 20, radius: 2, life: 0.5, maxLife: 1, vx: 10, vy: 20 };

it('renders a debris fragment with real rotation and fading opacity', () => {
  const nodes = flatten(Particles({ particles: [{ ...particle, type: 'debris', rotation: 0.7 }], ox: 3, oy: -2 }));
  const fragment = nodes.find(node => node.type === 'Group');
  expect(fragment.props).toMatchObject({ origin: { x: 13, y: 18 }, transform: [{ rotate: 0.7 }], opacity: 0.5 });
  expect(nodes.filter(node => node.type === 'Rect')).toHaveLength(2);
  expect(nodes.filter(node => node.type === 'Circle')).toHaveLength(0);
});

it('renders sparks as short oriented streaks instead of circles', () => {
  const nodes = flatten(Particles({ particles: [{ ...particle, type: 'spark', vx: 0, vy: -100 }], ox: 0, oy: 0 }));
  expect(nodes.find(node => node.type === 'Group').props.transform).toEqual([{ rotate: -Math.PI / 2 }]);
  expect(nodes.find(node => node.type === 'Rect').props.width).toBeLessThanOrEqual(9);
  expect(nodes.some(node => node.type === 'Circle')).toBe(false);
});

it('renders a transparent shield ripple using strokes only', () => {
  const nodes = flatten(Particles({ particles: [{ ...particle, type: 'shieldRipple', initialRadius: 26, maxRadius: 38 }], ox: 0, oy: 0 }));
  const rings = nodes.filter(node => node.type === 'Circle');
  expect(rings).toHaveLength(2);
  expect(rings.every(node => node.props.style === 'stroke')).toBe(true);
  expect(rings.every(node => node.props.r === 32)).toBe(true);
});

it('uses an expanding thin shockwave and local radial energy falloff', () => {
  const ex = Object.freeze({ id: 'explosion-1', x: 10, y: 20, life: 0.15, maxLife: 0.25, maxRadius: 26, radius: 0 });
  const nodes = flatten(Explosions({ explosions: [ex], ox: 3, oy: -2 }));
  const ring = nodes.find(node => node.type === 'Circle' && node.props.style === 'stroke');
  expect(ring.props).toMatchObject({ cx: 13, cy: 18 });
  expect(ring.props.r).toBeGreaterThan(2);
  expect(ring.props.r).toBeLessThanOrEqual(26);
  expect(ring.props.strokeWidth).toBeLessThanOrEqual(2);
  expect(nodes.filter(node => node.type === 'RadialGradient')).toHaveLength(1);
  expect(ex.radius).toBe(0);
});

it('uses effect IDs as stable keys and enforces existing render ceilings', () => {
  const particles = Array.from({ length: 400 }, (_, index) => ({ ...particle, id: `particle-${index}` }));
  const rendered = Particles({ particles, ox: 0, oy: 0 }).props.children;
  expect(rendered).toHaveLength(GAMEPLAY.MAX_PARTICLES);
  expect(rendered[0].key).toBe('particle-100');
  const explosions = Array.from({ length: 30 }, (_, index) => ({ id: `ex-${index}`, x: 0, y: 0, life: 1, maxLife: 1, maxRadius: 26 }));
  const renderedExplosions = Explosions({ explosions, ox: 0, oy: 0 }).props.children;
  expect(renderedExplosions).toHaveLength(GAMEPLAY.MAX_EXPLOSIONS);
  expect(renderedExplosions[0].key).toBe('ex-10');
});
