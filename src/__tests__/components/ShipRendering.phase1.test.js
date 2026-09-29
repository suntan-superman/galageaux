import React from 'react';
import { Skia } from '@shopify/react-native-skia';
import PlayerShip from '../../components/canvas/PlayerShip';
import { PlayerBullets, EnemyBullets, MuzzleFlashes } from '../../components/canvas/Bullets';
import { MAX_PLAYER_BANK } from '../../engine/shipVisuals';
import { PALETTE } from '../../constants/visualTheme';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Path: 'Path', Rect: 'Rect', Line: 'Line',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', vec: (x, y) => ({ x, y }),
  Skia: { Path: { MakeFromSVGString: jest.fn(svg => Object.freeze({ svg })) } },
}));

const flatten = element => [element, ...React.Children.toArray(element.props.children).flatMap(flatten)];
const player = Object.freeze({ x: 100, y: 200, width: 40, height: 22, shield: false });
const bullet = Object.freeze({ id: 'session:7', x: 10, y: 20, width: 4, height: 14, vx: 200, vy: 0 });

describe('production local ship drawing', () => {
  it('banks around the translated ship center without mutating the authoritative player', () => {
    const ship = PlayerShip({ player, bank: 0.1, velocityX: 100, time: 0.2, ox: 3, oy: -2 });
    expect(ship.props.transform).toEqual([{ translateX: 123 }, { translateY: 209 }]);
    const banking = flatten(ship).find(node => node.props.transform?.some(transform => transform.rotate !== undefined));
    expect(banking.props.transform).toEqual([{ rotate: 0.1 }, { scaleX: 1 }, { scaleY: 1 }]);
    expect(player).toEqual({ x: 100, y: 200, width: 40, height: 22, shield: false });
  });

  it('clamps external bank props to the documented eight-degree limit', () => {
    for (const bank of [-100, 100]) {
      const tree = flatten(PlayerShip({ player, bank }));
      const transform = tree.flatMap(node => node.props.transform || []).find(item => item.rotate !== undefined);
      expect(transform.rotate).toBe(Math.sign(bank) * MAX_PLAYER_BANK);
    }
  });

  it('reuses parsed local geometry across movement, bank, time and size changes', () => {
    const initialCalls = Skia.Path.MakeFromSVGString.mock.calls.length;
    const first = flatten(PlayerShip({ player, time: 0 })).filter(node => node.type === 'Path').map(node => node.props.path);
    const second = flatten(PlayerShip({ player: { ...player, x: 500, width: 60 }, bank: 0.12, time: 1 })).filter(node => node.type === 'Path').map(node => node.props.path);
    expect(initialCalls).toBe(5);
    expect(Skia.Path.MakeFromSVGString).toHaveBeenCalledTimes(initialCalls);
    expect(second).toEqual(first);
    first.forEach(path => expect(Object.isFrozen(path)).toBe(true));
  });

  it('uses thin transparent shield/bonus boundaries instead of filled bright disks', () => {
    const tree = flatten(PlayerShip({ player: { ...player, shield: true }, inBonusRound: true, time: 0.2 }));
    const shield = tree.find(node => node.type === 'Circle' && node.props.color === PALETTE.shield);
    const bonus = tree.find(node => node.type === 'Circle' && node.props.color === PALETTE.bonus);
    expect(shield.props.style).toBe('stroke');
    expect(shield.props.strokeWidth).toBeLessThanOrEqual(1.2);
    expect(bonus.props.style).toBe('stroke');
    expect(bonus.props.strokeWidth).toBeLessThanOrEqual(1);
    expect(bonus.props.opacity).toBeLessThan(0.4);
  });
});

describe('production projectile drawing', () => {
  it.each([PlayerBullets, EnemyBullets])('keeps the authoritative AABB core while velocity only changes the tail', render => {
    const element = render({ bullets: [bullet], ox: 3, oy: -2 });
    expect(element.props.children[0].key).toBe(bullet.id);
    const tree = flatten(element);
    const group = tree.find(node => node.type === 'Group');
    expect(group.props.transform).toEqual([{ translateX: 15 }, { translateY: 25 }]);
    expect(group.props.transform.some(item => item.rotate !== undefined)).toBe(false);
    const core = tree.find(node => node.type === 'Rect');
    expect(core.props).toMatchObject({ x: -2, y: -7, width: 4, height: 14 });
    const trail = tree.find(node => node.type === 'Line');
    expect(trail.props.p2.x).toBeLessThan(trail.props.p1.x);
    expect(trail.props.p2.y).toBe(trail.props.p1.y);
    expect(bullet).toEqual({ id: 'session:7', x: 10, y: 20, width: 4, height: 14, vx: 200, vy: 0 });
  });

  it('keeps entity identity when array order changes', () => {
    const other = { ...bullet, id: 'session:8', x: 50 };
    const keysByPosition = bullets => Object.fromEntries(flatten(PlayerBullets({ bullets }))
      .filter(node => node.type === 'Group')
      .map(node => [node.props.transform[0].translateX, node.key]));
    expect(keysByPosition([bullet, other])).toEqual(keysByPosition([other, bullet]));
  });

  it('reduces rapid-fire glow without changing core geometry or colors', () => {
    const normal = flatten(PlayerBullets({ bullets: [bullet] }));
    const rapid = flatten(PlayerBullets({ bullets: [bullet], rapidFire: true }));
    for (const type of ['Line', 'Circle']) {
      expect(rapid.find(node => node.type === type).props.opacity).toBeLessThan(normal.find(node => node.type === type).props.opacity);
    }
    expect(rapid.find(node => node.type === 'Rect').props).toEqual(normal.find(node => node.type === 'Rect').props);
  });

  it('uses separate cool-friendly/warm-hostile gradients with only three draw primitives each', () => {
    const friendly = flatten(PlayerBullets({ bullets: [bullet] }));
    const hostile = flatten(EnemyBullets({ bullets: [bullet] }));
    expect(friendly.find(node => node.type === 'Rect').props.children.props.colors).toContain(PALETTE.friendly);
    expect(hostile.find(node => node.type === 'Rect').props.children.props.colors).toContain(PALETTE.hostileEdge);
    for (const tree of [friendly, hostile]) {
      expect(tree.filter(node => ['Rect', 'Line', 'Circle'].includes(node.type))).toHaveLength(3);
    }
  });

  it('keeps existing muzzle positions/lifetimes with clamped short flash opacity', () => {
    const tree = flatten(MuzzleFlashes({ flashes: [{ id: 'shot', x: 20, y: 30, life: 0.1 }], ox: 2, oy: 3 }));
    expect(tree.find(node => node.type === 'Group').props.transform).toEqual([{ translateX: 22 }, { translateY: 33 }]);
    expect(tree.filter(node => node.type === 'Circle')).toHaveLength(3);
    for (const life of [-1, 0, 0.05, 0.1, 10]) {
      const circles = flatten(MuzzleFlashes({ flashes: [{ x: 0, y: 0, life }] })).filter(node => node.type === 'Circle');
      circles.forEach(node => {
        expect(node.props.opacity).toBeGreaterThanOrEqual(0);
        expect(node.props.opacity).toBeLessThanOrEqual(1);
        expect(node.props.r).toBeLessThanOrEqual(8);
      });
    }
  });
});
