import React from 'react';
import Enemies from '../../components/canvas/Enemies';
import BossShip from '../../components/canvas/BossShip';
import BossHealthBar from '../../components/BossHealthBar';
import HitFlash from '../../components/HitFlash';
import { PALETTE, PRESENTATION } from '../../constants/visualTheme';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Rect: 'Rect', Path: 'Path',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', vec: (x, y) => ({ x, y }),
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
  it('preserves boss silhouette and positions while adding a bounded local contact flash', () => {
    const boss = Object.freeze({ x: 100, y: 90, width: 80, height: 60, hp: 60, maxHp: 100, alive: true });
    const nodes = flatten(BossShip({ boss, hitFlash: 0.5, showHealthBar: false }));
    const body = nodes.find(node => node.type === 'Rect' && node.props.x === 100 && node.props.y === 90);
    expect(body.props).toMatchObject({ width: 80, height: 60 });
    expect(nodes.find(node => node.type === 'Rect' && node.props.color === PALETTE.core).props.opacity).toBe(0.375);
    expect(nodes.some(node => node.type === BossHealthBar)).toBe(false);
    expect(boss.hp).toBe(60);
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
