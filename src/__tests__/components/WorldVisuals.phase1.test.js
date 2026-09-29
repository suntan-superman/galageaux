import React from 'react';
import Enemies from '../../components/canvas/Enemies';
import BossShip from '../../components/canvas/BossShip';
import BossHealthBar from '../../components/BossHealthBar';
import HitFlash from '../../components/HitFlash';
import { PALETTE, PRESENTATION } from '../../constants/visualTheme';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Rect: 'Rect', Path: 'Path',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', vec: (x, y) => ({ x, y }),
  Skia: { Path: { MakeFromSVGString: path => path } },
}));
jest.mock('react-native', () => ({ View: 'View', StyleSheet: { create: x => x } }));
const flatten = element => !React.isValidElement(element) ? [] : [element, ...React.Children.toArray(element.props.children).flatMap(flatten)];

describe('Phase 1 world materials and overlay contracts', () => {
  it.each(['grunt', 'shooter', 'dive', 'scout', 'tank', 'elite', 'kamikaze'])('%s keeps its configured coordinates and local size transform', type => {
    const enemy = Object.freeze({ id: '1:5', type, x: 30, y: 50, size: 24, canShoot: true });
    const tree = Enemies({ enemies: Object.freeze([enemy]), ox: 3, oy: -4 });
    const group = flatten(tree).find(node => node.type === 'Group');
    expect(tree.props.children[0].key).toBe('1:5');
    expect(group.props.transform).toEqual([{ translateX: 33 }, { translateY: 46 }, { scale: 24 }]);
    expect(enemy).toMatchObject({ x: 30, y: 50, size: 24 });
  });
  it('lights only the enemy whose actual contact id matches', () => {
    const enemies = [{ id: 'a', type: 'grunt', x: 0, y: 0, size: 24 }, { id: 'b', type: 'grunt', x: 40, y: 0, size: 24 }];
    const nodes = flatten(Enemies({ enemies, hitFlashes: { b: 0.5 } }));
    expect(nodes.filter(node => node.type === 'Path' && node.props.color === PALETTE.core)).toHaveLength(1);
  });
  it('banks an enemy only inside its authoritative unrotated position and size transform', () => {
    const enemy = Object.freeze({ id: 'banked', type: 'dive', x: 40, y: 80, size: 24,
      flightState: 'ATTACKING', heading: 0.3, anticipation: 0.5 });
    const tree = Enemies({ enemies: [enemy], ox: 2, oy: -3 });
    const outer = tree.props.children[0];
    expect(outer.props.transform).toEqual([{ translateX: 42 }, { translateY: 77 }, { scale: 24 }]);
    const inner = flatten(outer).find(node => node !== outer && node.type === 'Group');
    expect(inner.props.transform).toEqual([{ translateX: 0.5 }, { translateY: 0.5 },
      { rotate: 0.3 }, { translateX: -0.5 }, { translateY: -0.5 }]);
    expect(flatten(outer).some(node => node.type === 'Path' && node.props.style === 'stroke' && node.props.opacity === 0.325)).toBe(true);
    expect(enemy).toMatchObject({ x: 40, y: 80 });
  });
  it('draws the new boss silhouette inside the preserved AABB with a bounded local contact flash', () => {
    const boss = Object.freeze({ x: 100, y: 90, width: 80, height: 60, hp: 60, maxHp: 100, alive: true });
    const nodes = flatten(BossShip({ boss, hitFlash: 0.5, showHealthBar: false }));
    const body = nodes.find(node => node.type === 'Group' && node.props.transform?.[0]?.translateX === 100);
    expect(body.props.transform).toEqual([{ translateX: 100 }, { translateY: 90 }]);
    expect(nodes.some(node => node.type === 'Path' && String(node.props.path).startsWith('M 4 18'))).toBe(true);
    expect(nodes.find(node => node.type === 'Path' && node.props.color === PALETTE.core).props.opacity).toBe(0.25);
    expect(nodes.some(node => node.type === BossHealthBar)).toBe(false);
    expect(boss).toMatchObject({ hp: 60, width: 80, height: 60, x: 100, y: 90 });
  });
  it('draws true boss health immediately with a separate non-authoritative trailing band', () => {
    const nodes = flatten(BossHealthBar({ health: 25, maxHealth: 100, trailingHealth: 50, x: 10, y: 112, width: 200, height: 10 }));
    const trail = nodes.find(node => node.type === 'Rect' && node.props.color === PALETTE.core);
    const actual = nodes.find(node => node.type === 'Rect' && node.props.color === PALETTE.hostile);
    expect(trail.props.width).toBe(98);
    expect(actual.props.width).toBe(49);
    expect(trail.props.y).toBe(114);
  });
  it('bounds player screen tint and never intercepts input', () => {
    const flash = HitFlash({ intensity: 2 });
    expect(flash.props.pointerEvents).toBe('none');
    expect(flash.props.style[1].opacity).toBe(PRESENTATION.damageTintOpacity);
    expect(HitFlash({ intensity: 0 })).toBeNull();
  });
});
