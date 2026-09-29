import { EFFECTS } from '../constants/visualTheme';

export const MAX_PLAYER_BANK = 8 * Math.PI / 180;
const BANK_SPEED = 300;
const BANK_RESPONSE = 0.09;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** Visual rotation only: never feeds back into authoritative movement. */
export function updatePlayerMotion(previousBank, velocityX, dt) {
  const target = clamp(finite(velocityX) / BANK_SPEED, -1, 1) * MAX_PLAYER_BANK * EFFECTS.motion;
  const previous = clamp(finite(previousBank), -MAX_PLAYER_BANK, MAX_PLAYER_BANK);
  const blend = -Math.expm1(-Math.max(0, finite(dt)) / BANK_RESPONSE);
  return clamp(previous + (target - previous) * blend, -MAX_PLAYER_BANK, MAX_PLAYER_BANK);
}

/** Small powered flame with a movement-biased tip; all lengths are local pixels. */
export function getThrusterVisuals(velocityX, time, bonus = false) {
  const movement = clamp(finite(velocityX) / BANK_SPEED, -1, 1);
  const speed = Math.abs(movement);
  const clock = finite(time);
  return {
    length: 14 + Math.sin(clock * 18) * 2 + speed * 3 + (bonus ? 1 : 0),
    width: 6.5 + Math.sin(clock * 13) * 0.35 + speed * 0.5 + (bonus ? 0.2 : 0),
    bias: -movement * 2.5 * EFFECTS.motion,
    intensity: (0.72 + speed * 0.2 + (bonus ? 0.08 : 0)) * EFFECTS.glow,
    trailLength: 4 + speed * 2
  };
}

/**
 * Velocity-oriented decorative tail around an unchanged AABB-centered core.
 * Tail points are local to center; neither this helper nor the renderer rotates
 * or mutates the projectile's collision box or trajectory.
 */
export function getProjectileVisual(bullet, friendly = true) {
  const width = Math.max(0, finite(bullet.width, 4));
  const height = Math.max(0, finite(bullet.height, 14));
  const vx = finite(bullet.vx);
  const vy = finite(bullet.vy, (friendly ? -1 : 1) * finite(bullet.speed));
  const speed = Math.hypot(vx, vy);
  const direction = speed > 0 ? { x: vx / speed, y: vy / speed } : { x: 0, y: friendly ? -1 : 1 };
  const tailLength = friendly ? clamp(speed / 70, 4, 10) : clamp(speed / 140, 2, 4);
  const rear = Math.min(height / 2, 4);
  return {
    center: { x: finite(bullet.x) + width / 2, y: finite(bullet.y) + height / 2 },
    direction,
    angle: Math.atan2(direction.y, direction.x),
    tailStart: { x: -direction.x * rear, y: -direction.y * rear },
    tailEnd: { x: -direction.x * (rear + tailLength), y: -direction.y * (rear + tailLength) },
    tailLength
  };
}
