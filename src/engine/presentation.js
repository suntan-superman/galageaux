import { updatePlayerMotion } from './shipVisuals';
import { EFFECTS, PRESENTATION } from '../constants/visualTheme';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function createPresentationState(snapshot) {
  return { sessionId: snapshot.sessionId, time: 0, playerX: snapshot.player.x,
    velocityX: 0, bank: 0, bossHealth: snapshot.boss?.hp ?? null };
}

/** A one-way, display-only observer. The authoritative snapshot is never written.
 * Sample displacement across RAFs (including intervening touch commands), not
 * across React commits. A command without elapsed time cannot erase that sample.
 */
export function advancePresentation(previous, snapshot, elapsed = 0) {
  const current = previous.sessionId === snapshot.sessionId ? previous : createPresentationState(snapshot);
  const active = ['playing', 'bonus', 'boss', 'bossDeath', 'transition'].includes(snapshot.phase);
  const dt = active && Number.isFinite(elapsed) ? clamp(elapsed, 0, PRESENTATION.maxStep) : 0;
  if (!dt) return current;
  const velocityX = ['transition', 'bossDeath'].includes(snapshot.phase) ? 0 : (snapshot.player.x - current.playerX) / dt;
  const hp = snapshot.boss?.alive ? snapshot.boss.hp : null;
  // Actual HP is always drawn immediately. This is only its short trailing band.
  const bossHealth = hp === null ? null : current.bossHealth === null || hp > current.bossHealth
    ? hp : hp + (current.bossHealth - hp) * Math.exp(-dt / PRESENTATION.healthTrailSeconds);
  return { ...current, time: current.time + dt, playerX: snapshot.player.x, velocityX,
    bank: updatePlayerMotion(current.bank, velocityX, dt), bossHealth };
}

export function getWorldOffset(offset = {}) {
  const gain = PRESENTATION.cameraScale * clamp(EFFECTS.shake, 0, 1);
  return { ox: (offset.ox || 0) * gain, oy: (offset.oy || 0) * gain };
}

/** Reinterpret Phase 0's 0.4 s timer as a short visual flash; do not change it. */
export function getDamageFlash(intensity = 0) {
  const age = (1 - clamp(intensity, 0, 1)) / 2.5;
  return clamp(1 - age / PRESENTATION.damageFlashSeconds, 0, 1) * EFFECTS.impact;
}

export function getHitFlashes(particles) {
  const enemy = Object.create(null);
  let boss = 0;
  for (const particle of particles) {
    if (particle.type !== 'contact' || !(particle.maxLife > 0)) continue;
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    if (particle.target === 'boss') boss = Math.max(boss, alpha);
    else if (particle.targetId != null) enemy[particle.targetId] = Math.max(enemy[particle.targetId] || 0, alpha);
  }
  return { enemy, boss };
}
