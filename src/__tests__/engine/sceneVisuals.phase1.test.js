import { getStageTheme, STAGE_THEMES, getNebulaVisuals, getStarVisuals, getPowerupVisuals, POWERUP_GLYPHS } from '../../engine/sceneVisuals';
import { PALETTE } from '../../constants/visualTheme';

describe('deterministic background and collectible presentation', () => {
  it.each(['stage1', 'stage2', 'stage3'])('selects the %s theme without modifying it', stage => {
    expect(getStageTheme(stage)).toBe(STAGE_THEMES[stage]);
    expect(getStageTheme(stage).space).toHaveLength(3);
    expect(getStageTheme(stage).nebula).toHaveLength(2);
    expect(Object.isFrozen(getStageTheme(stage).space)).toBe(true);
  });

  it('falls back to the opening palette without activating dormant stages', () => {
    expect(Object.keys(STAGE_THEMES)).toEqual(['stage1', 'stage2', 'stage3']);
    expect(getStageTheme('stage4')).toBe(STAGE_THEMES.stage1);
    expect(getStageTheme()).toBe(STAGE_THEMES.stage1);
    expect(new Set(Object.values(STAGE_THEMES).map(theme => theme.space.join())).size).toBe(3);
  });

  it.each(['stage1', 'stage2', 'stage3'])('keeps %s nebula layers faint, bounded and off the center lane', stage => {
    for (let time = 0; time < 100; time += 0.5) {
      const layers = getNebulaVisuals(stage, 400, 800, time);
      expect(layers).toHaveLength(2);
      for (const layer of layers) {
        expect(layer.opacity).toBeGreaterThanOrEqual(0.09);
        expect(layer.opacity).toBeLessThanOrEqual(0.145);
        expect(layer.radius).toBeGreaterThan(0);
        expect(layer.radius).toBeLessThanOrEqual(304);
        expect(layer.y).toBeLessThan(800 * 0.3);
        expect(Math.abs(layer.x - 200)).toBeGreaterThan(150);
      }
    }
  });

  it.each(['far', 'mid', 'near'])('bounds %s star brightness and restrained twinkle', layer => {
    const star = Object.freeze({ size: 2, layer, twinkleSpeed: 2.5, twinkleOffset: 0.7, glow: true });
    for (let time = 0; time < 30; time += 0.1) {
      const visual = getStarVisuals(star, time);
      expect(visual.alpha).toBeGreaterThan(0);
      expect(visual.alpha).toBeLessThanOrEqual(0.61);
      expect(visual.size).toBeGreaterThan(0);
      expect(visual.size).toBeLessThanOrEqual(2);
      expect(visual.glow).toBe(layer === 'near');
      expect(visual.glowAlpha).toBeLessThanOrEqual(0.055);
    }
    expect(getStarVisuals({ ...star, glow: false }, 5).glow).toBe(false);
  });

  it('uses only supplied visual time, not wall-clock time or randomness', () => {
    const now = jest.spyOn(Date, 'now').mockImplementation(() => { throw new Error('wall clock'); });
    const random = jest.spyOn(Math, 'random').mockImplementation(() => { throw new Error('random render'); });
    try {
      const star = { size: 2, layer: 'near', twinkleSpeed: 1.2, twinkleOffset: 0.7 };
      expect(getStarVisuals(star, 3)).toEqual(getStarVisuals(star, 3));
      expect(getNebulaVisuals('stage2', 400, 800, 3)).toEqual(getNebulaVisuals('stage2', 400, 800, 3));
      expect(getPowerupVisuals('shield', 3)).toEqual(getPowerupVisuals('shield', 3));
      expect(getStarVisuals(star, NaN)).toEqual(getStarVisuals(star, 0));
    } finally { now.mockRestore(); random.mockRestore(); }
  });

  it('assigns six distinct upright procedural glyphs and stable colors', () => {
    const kinds = ['double', 'triple', 'spread', 'rapid', 'shield', 'slow'];
    expect(Object.keys(POWERUP_GLYPHS)).toEqual(kinds);
    expect(new Set(kinds.map(kind => getPowerupVisuals(kind).glyph)).size).toBe(6);
    for (const kind of kinds) {
      const initial = getPowerupVisuals(kind, 0);
      const later = getPowerupVisuals(kind, 100);
      expect(initial.glyph).toBe(later.glyph);
      expect(initial.color).toBe(later.color);
      expect(initial.glyphStyle).toBe(kind === 'rapid' ? 'fill' : 'stroke');
    }
    expect(getPowerupVisuals('shield').color).toBe(PALETTE.shield);
  });

  it.each(['double', 'triple', 'spread', 'rapid', 'shield', 'slow'])('keeps the %s collectible pulse small without resizing its body', kind => {
    for (let time = 0; time < 10; time += 0.1) {
      const visual = getPowerupVisuals(kind, time);
      expect(visual.glowRadius).toBeGreaterThanOrEqual(11.7);
      expect(visual.glowRadius).toBeLessThan(12.7);
      expect(visual.glowOpacity).toBeGreaterThan(0.1);
      expect(visual.glowOpacity).toBeLessThanOrEqual(0.14);
      expect(visual.borderOpacity).toBeGreaterThanOrEqual(0.8);
      expect(visual.borderOpacity).toBeLessThanOrEqual(0.91);
      expect(visual).not.toHaveProperty('x');
      expect(visual).not.toHaveProperty('y');
      expect(visual).not.toHaveProperty('rotation');
    }
  });
});
