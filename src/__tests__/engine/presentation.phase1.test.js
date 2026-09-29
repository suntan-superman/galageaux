import { createPresentationState, advancePresentation, getWorldOffset, getDamageFlash, getHitFlashes } from '../../engine/presentation';
import { createGameSession } from '../../engine/gameSimulation';
import { PRESENTATION } from '../../constants/visualTheme';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const scene = () => createGameSession(390, 844);

describe('one-way Phase 1 presentation observer', () => {
  it('observes motion without changing any authoritative player/simulation field', () => {
    const initial = scene();
    const visual = createPresentationState(initial);
    const state = freeze({ ...initial, player: { ...initial.player, x: initial.player.x + 20 } });
    const before = JSON.stringify(state);
    const result = advancePresentation(visual, state, 0.05);
    expect(result.velocityX).toBe(400);
    expect(result.bank).toBeGreaterThan(0);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.playerX).toBe(state.player.x);
  });
  it('does not lose touch displacement during zero-time command commits', () => {
    const state = scene(), visual = createPresentationState(state);
    state.player.x += 20;
    const commandVisual = advancePresentation(visual, state, 0);
    expect(commandVisual).toBe(visual);
    expect(advancePresentation(commandVisual, state, 0.1).velocityX).toBe(200);
  });
  it('stops physics immediately while only the displayed bank settles', () => {
    const state = scene();
    let visual = createPresentationState(state);
    state.player.x += 20;
    visual = advancePresentation(visual, state, 0.1);
    const bank = visual.bank, x = state.player.x;
    visual = advancePresentation(visual, state, 0.1);
    expect(visual.velocityX).toBe(0);
    expect(visual.bank).toBeGreaterThan(0);
    expect(visual.bank).toBeLessThan(bank);
    expect(state.player.x).toBe(x);
  });
  it.each(['paused', 'tutorial', 'lost', 'won'])('freezes decorative time and bank in %s', phase => {
    const state = scene(), visual = { ...createPresentationState(state), time: 2, bank: 0.1 };
    state.phase = phase;
    expect(advancePresentation(visual, state, 20)).toBe(visual);
  });
  it('ages transition decoration without moving the ship', () => {
    const state = scene(), visual = { ...createPresentationState(state), bank: 0.1 };
    state.phase = 'transition';
    const result = advancePresentation(visual, freeze(state), 0.05);
    expect(result.time).toBe(0.05);
    expect(result.velocityX).toBe(0);
    expect(result.bank).toBeLessThan(visual.bank);
  });
  it('clamps hitches and ignores invalid elapsed time', () => {
    const state = scene(), visual = createPresentationState(state);
    expect(advancePresentation(visual, state, 100).time).toBe(PRESENTATION.maxStep);
    for (const dt of [-1, NaN, Infinity]) expect(advancePresentation(visual, state, dt)).toBe(visual);
  });
  it('resets all decorative history on session change', () => {
    const old = { ...createPresentationState(scene()), time: 30, bank: 0.1, velocityX: 100, bossHealth: 50 };
    const fresh = createGameSession(390, 844, false, 2);
    expect(advancePresentation(old, fresh, 0)).toEqual(createPresentationState(fresh));
  });
  it('eases only the trailing boss-health band, never actual health', () => {
    const state = scene();
    state.boss = { alive: true, hp: 100 };
    const initial = createPresentationState(state);
    state.boss.hp = 60;
    const result = advancePresentation(initial, freeze(state), 0.06);
    expect(result.bossHealth).toBeGreaterThan(60);
    expect(result.bossHealth).toBeLessThan(100);
    expect(state.boss.hp).toBe(60);
  });
  it('clears the health trail between bosses', () => {
    const state = scene();
    expect(advancePresentation({ ...createPresentationState(state), bossHealth: 50 }, state, 0.1).bossHealth).toBeNull();
  });
  it('scales both shake axes coherently without mutating the corrected timer result', () => {
    const offset = freeze({ ox: 10, oy: -6 });
    expect(getWorldOffset(offset)).toEqual({ ox: 4.5, oy: -2.7 });
    expect(offset).toEqual({ ox: 10, oy: -6 });
    expect(getWorldOffset()).toEqual({ ox: 0, oy: 0 });
  });
  it('limits player tint to 140ms of the existing 400ms feedback timer', () => {
    expect(getDamageFlash(1)).toBe(1);
    expect(getDamageFlash(1 - 0.07 * 2.5)).toBeCloseTo(0.5);
    expect(getDamageFlash(1 - 0.14 * 2.5)).toBeCloseTo(0);
    expect(getDamageFlash(0.5)).toBe(0);
    expect(getDamageFlash(0)).toBe(0);
  });
  it('builds target hit lights only from live contact cores in one bounded pass', () => {
    const effects = freeze([
      { type: 'contact', target: 'enemy', targetId: '1:2', life: 0.04, maxLife: 0.08 },
      { type: 'contact', target: 'enemy', targetId: '1:2', life: 0.08, maxLife: 0.08 },
      { type: 'contact', target: 'boss', life: 0.02, maxLife: 0.08 },
      { type: 'spark', target: 'boss', life: 1, maxLife: 1 },
      { type: 'contact', target: 'enemy', targetId: 'gone', life: 0, maxLife: 0 },
    ]);
    expect(getHitFlashes(effects)).toEqual({ enemy: { '1:2': 1 }, boss: 0.25 });
  });
});
