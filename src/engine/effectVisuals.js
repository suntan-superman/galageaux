/** Pure presentation math. No random draws, gameplay mutations or independent clocks. */
import { EFFECTS, PALETTE } from '../constants/visualTheme';

export const IMPACT_VISUALS = Object.freeze({
  contactLife: 0.085, sparkLife: 0.16, shieldLife: 0.28,
  contactRadius: 3.6, maxSparkLength: 9, maxFragmentWidth: 5,
  ordinaryBurstCount: 12, ordinarySparkCount: 4,
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
export const lifeFraction = effect => effect?.maxLife > 0 ? clamp(effect.life / effect.maxLife, 0, 1) : 0;

/** Midpoint of the actual discrete overlap; this is not a swept collision estimate. */
export function overlapContact(projectile, target) {
  const width = target.width ?? target.size;
  const height = target.height ?? target.size;
  return {
    x: (Math.max(projectile.x, target.x) + Math.min(projectile.x + projectile.width, target.x + width)) / 2,
    y: (Math.max(projectile.y, target.y) + Math.min(projectile.y + projectile.height, target.y + height)) / 2,
  };
}

export function getParticleVisual(particle) {
  const fraction = lifeFraction(particle);
  const alpha = clamp(particle.alpha ?? fraction, 0, fraction);
  const radius = clamp(particle.radius, 0, 8);
  const kind = particle.type === 'shieldRipple' ? 'ring'
    : particle.type === 'contact' ? 'contact'
    : particle.type === 'debris' || particle.visualKind === 'fragment' ? 'fragment'
    : ['spark', 'impact', 'contactSpark'].includes(particle.type) ? 'spark' : 'energy';
  const speed = Math.hypot(particle.vx || 0, particle.vy || 0);
  const ringStart = clamp(particle.initialRadius ?? 26, 0, 40);
  const ringEnd = clamp(particle.maxRadius ?? ringStart + 12, ringStart, 52);
  return {
    kind,
    opacity: alpha * (kind === 'contact' || kind === 'ring' ? alpha : 1) * EFFECTS.impact,
    radius: kind === 'ring' ? ringStart + (ringEnd - ringStart) * (1 - fraction) : radius,
    width: kind === 'spark' ? clamp(speed * 0.045, 2, IMPACT_VISUALS.maxSparkLength) : clamp(radius * 1.5, 1, IMPACT_VISUALS.maxFragmentWidth),
    height: kind === 'spark' ? clamp(radius * 0.8, 0.7, 1.5) : clamp(radius * 0.7, 0.8, 2.3),
    rotation: kind === 'fragment' ? particle.rotation || 0 : Math.atan2(particle.vy || 0, particle.vx || 0),
    color: kind === 'fragment' ? PALETTE.metal : particle.color || PALETTE.core,
  };
}

export function getExplosionVisual(explosion) {
  const fraction = lifeFraction(explosion), progress = 1 - fraction;
  const maxRadius = clamp(explosion.maxRadius, 0, 80);
  const age = Math.max(0, (explosion.maxLife || 0) - (explosion.life || 0));
  return {
    radius: Math.min(maxRadius, 2 + (maxRadius - 2) * (1 - fraction ** 3)),
    ringAlpha: 0.8 * fraction ** 2 * EFFECTS.impact,
    ringWidth: 0.75 + 1.25 * fraction,
    energyRadius: maxRadius * (0.25 + 0.55 * progress),
    energyAlpha: 0.34 * fraction ** 2 * EFFECTS.impact,
    coreRadius: Math.min(8, 2 + maxRadius * 0.1) * fraction,
    coreAlpha: clamp(1 - age / 0.065, 0, 1) * EFFECTS.impact,
  };
}
