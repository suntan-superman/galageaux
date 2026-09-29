import { getExplosionVisual, getParticleVisual, lifeFraction, overlapContact, IMPACT_VISUALS } from '../../engine/effectVisuals';
import { spawnShieldRipple, updateParticles } from '../../engine/particles';

it('computes an inclusive overlap midpoint without modifying collision coordinates', () => {
  const bullet = Object.freeze({ x: 24, y: 10, width: 4, height: 14 });
  const target = Object.freeze({ x: 0, y: 0, size: 24 });
  expect(overlapContact(bullet, target)).toEqual({ x: 24, y: 17 });
  expect(bullet).toEqual({ x: 24, y: 10, width: 4, height: 14 });
});

it.each([[-1, 1, 0], [2, 1, 1], [0.5, 1, 0.5], [1, 0, 0]])(
  'clamps lifetime %s/%s to a safe alpha envelope', (life, maxLife, expected) => {
    expect(lifeFraction({ life, maxLife })).toBe(expected);
  },
);

it.each([26, 34, 80])('bounds the %s-point shockwave throughout its existing lifetime', maxRadius => {
  const maxLife = maxRadius === 80 ? 0.6 : 0.25;
  let previousRadius = 0, previousAlpha = 1;
  for (let step = 0; step <= 20; step++) {
    const effect = Object.freeze({ maxRadius, maxLife, life: maxLife * (1 - step / 20) });
    const visual = getExplosionVisual(effect);
    expect(visual.radius).toBeGreaterThanOrEqual(previousRadius);
    expect(visual.radius).toBeLessThanOrEqual(maxRadius);
    expect(visual.ringAlpha).toBeLessThanOrEqual(previousAlpha);
    expect(visual.ringAlpha).toBeGreaterThanOrEqual(0);
    expect(visual.ringWidth).toBeGreaterThanOrEqual(0.75);
    expect(visual.ringWidth).toBeLessThanOrEqual(2);
    previousRadius = visual.radius; previousAlpha = visual.ringAlpha;
  }
  expect(previousAlpha).toBe(0);
});

it('separates a brief destruction core from longer energy/ring decay', () => {
  const fresh = getExplosionVisual({ maxRadius: 26, maxLife: 0.25, life: 0.25 });
  const later = getExplosionVisual({ maxRadius: 26, maxLife: 0.25, life: 0.18 });
  expect(fresh.coreAlpha).toBe(1);
  expect(fresh.radius).toBe(2);
  expect(later.coreAlpha).toBe(0);
  expect(later.ringAlpha).toBeGreaterThan(0);
  expect(later.energyAlpha).toBeLessThan(fresh.energyAlpha);
});

it.each([[100, 0, 0], [0, 100, Math.PI / 2], [-100, 0, Math.PI], [0, -100, -Math.PI / 2]])(
  'aligns a short spark to velocity (%s,%s)', (vx, vy, rotation) => {
    const p = Object.freeze({ type: 'spark', vx, vy, radius: 1, life: 0.2, maxLife: 0.4 });
    const visual = getParticleVisual(p);
    expect(visual.kind).toBe('spark');
    expect(visual.rotation).toBeCloseTo(rotation);
    expect(visual.width).toBeLessThanOrEqual(IMPACT_VISUALS.maxSparkLength);
    expect(visual.opacity).toBe(0.5);
  },
);

it('honors fragment rotation and particle alpha rather than drawing opaque circles', () => {
  const p = Object.freeze({ type: 'debris', rotation: 1.2, vx: 100, vy: 0, radius: 3, life: 0.5, maxLife: 1, alpha: 0.4 });
  expect(getParticleVisual(p)).toMatchObject({ kind: 'fragment', rotation: 1.2, opacity: 0.4 });
  expect(getParticleVisual({ ...p, type: 'default', visualKind: 'fragment' }).kind).toBe('fragment');
  expect(getParticleVisual({ ...p, alpha: 4 }).opacity).toBe(0.5);
});

it('keeps shield ripple expansion/fade bounded and expires it on existing particle time', () => {
  const original = spawnShieldRipple(10, 20)[0];
  expect(getParticleVisual(original)).toMatchObject({ kind: 'ring', radius: 26, opacity: 1 });
  const halfway = updateParticles([original], 0.14)[0];
  expect(getParticleVisual(halfway)).toMatchObject({ kind: 'ring', radius: 32, opacity: 0.25 });
  expect(halfway.x).toBe(10); expect(halfway.y).toBe(20);
  expect(getParticleVisual({ ...original, life: 0 }).radius).toBe(38);
  expect(updateParticles([halfway], 0.15)).toEqual([]);
  expect(original.life).toBe(0.28);
});

it('new contact and ripple visual math uses no random draws', () => {
  const random = jest.spyOn(Math, 'random');
  try {
    spawnShieldRipple(10, 20).forEach(getParticleVisual);
    getExplosionVisual({ maxLife: 0.25, life: 0.2, maxRadius: 26 });
    expect(random).not.toHaveBeenCalled();
  } finally { random.mockRestore(); }
});
