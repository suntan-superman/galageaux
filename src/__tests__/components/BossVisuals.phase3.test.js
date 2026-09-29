import React from 'react';
import BossShip from '../../components/canvas/BossShip';
import BossHealthBar from '../../components/BossHealthBar';
import BossAnnouncement from '../../components/BossAnnouncement';
import { BOSS_IDENTITY, BOSS_STATE } from '../../engine/bossEncounter';

jest.mock('@shopify/react-native-skia', () => ({
  Group: 'Group', Circle: 'Circle', Rect: 'Rect', Path: 'Path',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient',
  vec: (x, y) => ({ x, y }), Skia: { Path: { MakeFromSVGString: path => path } },
}));
jest.mock('react-native', () => ({ View: 'View', Text: 'Text', StyleSheet: { create: value => value } }));

const nodes = element => !React.isValidElement(element) ? []
  : [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
const boss = Object.freeze({ x: 100, y: 165, width: 80, height: 60, hp: 80, maxHp: 100,
  alive: true, encounterState: BOSS_STATE.READY, phaseIndex: 0, stateElapsed: 0 });

describe('Phase 3 boss presentation contracts', () => {
  it('gives all three guardians distinct cached hulls and accent colors without changing collision dimensions', () => {
    const hulls = ['stage1', 'stage2', 'stage3'].map(stage => {
      const drawn = nodes(BossShip({ boss, stage, ox: 3, oy: -2, showHealthBar: false }));
      const body = drawn.find(node => node.type === 'Group' && node.props.transform?.[0]?.translateX === 103);
      expect(body.props.transform).toEqual([{ translateX: 103 }, { translateY: 163 }]);
      expect(drawn.some(node => node.type === 'Path' && node.props.color === BOSS_IDENTITY[stage].color)).toBe(true);
      return drawn.find(node => node.type === 'Path' && node.props.children?.type === 'LinearGradient').props.path;
    });
    expect(new Set(hulls).size).toBe(3);
    expect(boss).toMatchObject({ x: 100, y: 165, width: 80, height: 60 });
  });

  it('uses the core for radial tells and emitters for aimed/spread tells', () => {
    const radial = nodes(BossShip({ boss: { ...boss, encounterState: BOSS_STATE.TELEGRAPHING,
      telegraph: 1, attackFamily: 'radial' }, showHealthBar: false }));
    const aimed = nodes(BossShip({ boss: { ...boss, encounterState: BOSS_STATE.TELEGRAPHING,
      telegraph: 1, attackFamily: 'aimed' }, showHealthBar: false }));
    const core = drawn => drawn.find(node => node.type === 'Circle' && node.props.cx === 40 && node.props.cy === 27
      && node.props.color === '#bff6ff');
    const emitter = drawn => drawn.find(node => node.type === 'Circle' && node.props.cx === 16 && node.props.cy === 38);
    expect(core(radial).props.r).toBeGreaterThan(core(aimed).props.r);
    expect(emitter(aimed).props.r).toBeGreaterThan(emitter(radial).props.r);
  });

  it('updates hull accents on each configured phase without changing the silhouette', () => {
    const first = nodes(BossShip({ boss, stage: 'stage3', showHealthBar: false }));
    const final = nodes(BossShip({ boss: { ...boss, phaseIndex: 3 }, stage: 'stage3', showHealthBar: false }));
    const hull = drawn => drawn.find(node => node.type === 'Path' && node.props.children?.type === 'LinearGradient').props.path;
    expect(hull(first)).toBe(hull(final));
    expect(final.some(node => node.type === 'Path' && node.props.color === BOSS_IDENTITY.stage3.phaseColors[3])).toBe(true);
    expect(final.some(node => node.type === 'Circle' && node.props.color === '#fff1d5')).toBe(false);
  });

  it('hides the hull during announcement, then fades the dead hull before overlay begins', () => {
    expect(BossShip({ boss: { ...boss, encounterState: BOSS_STATE.ANNOUNCING } })).toBeNull();
    const dying = { ...boss, alive: false, hp: 0, encounterState: BOSS_STATE.DYING, deathElapsed: 0.5 };
    expect(nodes(BossShip({ boss: dying, showHealthBar: false })).some(node => node.type === 'Path')).toBe(true);
    expect(BossShip({ boss: { ...dying, deathElapsed: 0.91 } })).toBeNull();
  });

  it('keeps authoritative health immediate, with distinct trailing health and exact phase markers', () => {
    const drawn = nodes(BossHealthBar({ health: 25, maxHealth: 100, trailingHealth: 50,
      x: 100, y: 147, width: 200, height: 10, phaseThresholds: [70, 40, 0], phasePulse: 0.5 }));
    const actual = drawn.find(node => node.type === 'Rect' && node.props.width === 49);
    const trail = drawn.find(node => node.type === 'Rect' && node.props.width === 98);
    const markers = drawn.filter(node => node.type === 'Rect' && node.props.width === 1);
    expect(actual.props.x).toBe(102);
    expect(trail.props.x).toBe(102);
    expect(markers.map(node => node.props.x)).toEqual([238.7, 179.9]);
  });

  it('flashes only the true filled portion on a successful hit without inventing HP', () => {
    const drawn = nodes(BossHealthBar({ health: 25, maxHealth: 100, trailingHealth: 50,
      x: 100, y: 147, width: 200, height: 10, hitPulse: 1 }));
    expect(drawn.find(node => node.type === 'Rect' && node.props.opacity === 0.5)
      .props.width).toBe(49);
    expect(drawn.find(node => node.type === 'Rect' && node.props.opacity === 0.45)
      .props.width).toBe(98);
  });

  it('announces by simulation clock without intercepting touch', () => {
    const announcing = { ...boss, encounterState: BOSS_STATE.ANNOUNCING, stateElapsed: 0.5 };
    expect(BossAnnouncement({ boss: { ...announcing, stateElapsed: 0.2 }, stage: 'stage2' })).toBeNull();
    const banner = BossAnnouncement({ boss: announcing, stage: 'stage2', top: 160 });
    expect(banner.props.pointerEvents).toBe('none');
    expect(banner.props.style[1]).toEqual({ top: 160, opacity: 1 });
    expect(nodes(banner).filter(node => node.type === 'Text').map(node => node.props.children))
      .toEqual(['WARNING · STAGE GUARDIAN', 'VIOLET WRAITH']);
    expect(BossAnnouncement({ boss: { ...announcing, encounterState: BOSS_STATE.ENTERING,
      stateElapsed: 0.25 }, stage: 'stage2' })).toBeNull();
  });
});
