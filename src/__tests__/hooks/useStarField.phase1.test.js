import { advanceStarField, createStarField } from '../../hooks/useStarField';
import { STAR_COLORS } from '../../engine/sceneVisuals';

describe('presentation starfield lifecycle', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([[0.1, 'far', 15, 40], [0.5, 'mid', 40, 80], [0.9, 'near', 80, 140]])(
    'preserves 100 stars and the existing %s random sequence / %s speed band', (roll, layer, minSpeed, maxSpeed) => {
      const random = jest.spyOn(Math, 'random').mockReturnValue(roll);
      const stars = createStarField(400, 800);
      expect(stars).toHaveLength(100);
      // The pre-visual implementation samples nine values per star.
      expect(random).toHaveBeenCalledTimes(900);
      expect(new Set(stars.map(star => star.id)).size).toBe(100);
      expect(stars.filter(star => star.glow).length).toBeLessThanOrEqual(10);
      for (const star of stars) {
        expect(star.layer).toBe(layer);
        expect(star.speed).toBeGreaterThanOrEqual(minSpeed);
        expect(star.speed).toBeLessThan(maxSpeed);
        expect(STAR_COLORS).toContain(star.color);
        if (layer !== 'near') expect(star.glow).toBe(false);
      }
    }
  );

  it('has equivalent linear travel after equal time at 30/60/120 updates without changing identity', () => {
    const original = Object.freeze({ id: 'star-1', x: 10, y: 100, speed: 55, size: 2, layer: 'mid' });
    const expected = [30, 60, 120].map(hz => {
      let stars = [original];
      for (let step = 0; step < hz; step++) stars = advanceStarField(stars, 1 / hz, 400, 800);
      expect(stars[0].id).toBe(original.id);
      expect(stars[0]).not.toHaveProperty('twinkle');
      return stars[0].y;
    });
    expected.forEach(y => expect(y).toBeCloseTo(155, 8));
    expect(original.y).toBe(100);
  });

  it('preserves wrap placement and uses randomness only for a wrapped horizontal position', () => {
    const rng = jest.fn(() => 0.25);
    const stars = Object.freeze([
      Object.freeze({ id: 'wrapping', x: 200, y: 799, speed: 80 }),
      Object.freeze({ id: 'staying', x: 100, y: 200, speed: 20 }),
    ]);
    const next = advanceStarField(stars, 0.1, 400, 800, rng);
    expect(next[0]).toEqual({ id: 'wrapping', x: 100, y: -5, speed: 80 });
    expect(next[1]).toEqual({ id: 'staying', x: 100, y: 202, speed: 20 });
    expect(rng).toHaveBeenCalledTimes(1);
  });
});
