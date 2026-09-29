/** Pure presentation data. No gameplay configuration or entity writes. */
import { EFFECTS, PALETTE } from '../constants/visualTheme';

export const STAGE_THEMES = Object.freeze({
  stage1: Object.freeze({
    space: Object.freeze(['#07162b', '#030915', '#01040c']),
    nebula: Object.freeze(['#187b9c', '#39407a']),
  }),
  stage2: Object.freeze({
    space: Object.freeze(['#150b25', '#080713', '#03040a']),
    nebula: Object.freeze(['#7750a5', '#9c487f']),
  }),
  stage3: Object.freeze({
    space: Object.freeze(['#1c0b12', '#0c070e', '#030409']),
    nebula: Object.freeze(['#9b3d40', '#9a552f']),
  }),
});

export const STAR_COLORS = Object.freeze(['171,198,222', '220,234,248', '130,182,207']);
const STAR_LAYERS = Object.freeze({
  far: Object.freeze({ alpha: 0.2, twinkle: 0.025, size: 0.7 }),
  mid: Object.freeze({ alpha: 0.36, twinkle: 0.04, size: 0.67 }),
  near: Object.freeze({ alpha: 0.55, twinkle: 0.055, size: 0.55 }),
});
const seconds = time => Number.isFinite(time) ? time : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getStageTheme(stage = 'stage1') {
  return STAGE_THEMES[stage] || STAGE_THEMES.stage1;
}

export function getNebulaVisuals(stage, width, height, time = 0) {
  const theme = getStageTheme(stage);
  const radius = Math.min(width * 0.84, height * 0.38);
  return [
    { x: width * 0.1, y: height * 0.15, radius, color: theme.nebula[0],
      opacity: (0.13 + Math.sin(seconds(time) * 0.24) * 0.012 * EFFECTS.motion) * EFFECTS.background },
    { x: width * 0.94, y: height * 0.27, radius: radius * 0.82, color: theme.nebula[1],
      opacity: (0.105 + Math.sin(seconds(time) * 0.19 + 1.4) * 0.01 * EFFECTS.motion) * EFFECTS.background },
  ];
}

/** Twinkle is calculated once, here, from the screen's shared visual clock. */
export function getStarVisuals(star, time = 0) {
  const layer = star.layer === 'near' ? 'near' : star.layer === 'mid' ? 'mid' : 'far';
  const settings = STAR_LAYERS[layer];
  const twinkle = Math.sin(seconds(time) * (star.twinkleSpeed || 1) * 0.24 + (star.twinkleOffset || 0));
  const alpha = settings.alpha + twinkle * settings.twinkle * EFFECTS.motion;
  const radius = Math.max(0, star.size || 0) * settings.size
    * (layer === 'near' ? 1 + twinkle * 0.025 * EFFECTS.motion : 1);
  return {
    alpha: clamp(alpha, 0, 1), size: radius,
    glow: layer === 'near' && star.glow === true,
    glowAlpha: clamp(alpha * 0.09 * EFFECTS.glow, 0, 1),
  };
}

// Cached local-space glyph strings: stable geometry, upright within a 20-unit badge.
export const POWERUP_GLYPHS = Object.freeze({
  double: 'M6 14V6 M3.5 8.5L6 6L8.5 8.5 M14 14V6 M11.5 8.5L14 6L16.5 8.5',
  triple: 'M5 15V5 M3 7L5 5L7 7 M10 15V5 M8 7L10 5L12 7 M15 15V5 M13 7L15 5L17 7',
  spread: 'M10 15L4 5 M10 15V4 M10 15L16 5 M3 8L4 5L7 6 M8 6L10 4L12 6 M13 6L16 5L17 8',
  rapid: 'M11.5 3L5 11H9L8 17L15 8H11Z',
  shield: 'M4 5L10 3L16 5L15 11Q14 14 10 17Q6 14 5 11Z',
  slow: 'M5 4H15 M5 16H15 M6 4V6L14 14V16 M14 4V6L6 14V16',
});
const POWERUP_COLORS = Object.freeze({
  double: PALETTE.friendly, triple: '#9dd6ff', spread: PALETTE.boss,
  rapid: PALETTE.bonus, shield: PALETTE.shield, slow: '#99b3d8',
});
const POWERUP_PHASES = Object.freeze({ double: 0, triple: 0.7, spread: 1.4, rapid: 2.1, shield: 2.8, slow: 3.5 });

export function getPowerupVisuals(kind, time = 0) {
  const pulse = Math.sin(seconds(time) * 2.4 + (POWERUP_PHASES[kind] || 0)) * EFFECTS.motion;
  return {
    color: POWERUP_COLORS[kind] || PALETTE.core,
    glyph: POWERUP_GLYPHS[kind] || 'M10 5V15 M5 10H15',
    glyphStyle: kind === 'rapid' ? 'fill' : 'stroke',
    glowRadius: 12.2 * (1 + pulse * 0.04),
    glowOpacity: (0.12 + pulse * 0.015) * EFFECTS.glow,
    borderOpacity: 0.86 + pulse * 0.04,
  };
}
