/**
 * screenshake.js - Screen Shake Effect System
 * 
 * Provides camera shake effects for impacts, explosions, and boss attacks.
 * Uses a decaying intensity model with random offset per frame.
 * 
 * @module screenshake
 */

/**
 * @typedef {Object} ScreenshakeState
 * @property {number} time - Remaining shake duration
 * @property {number} duration - Total shake duration
 * @property {number} intensity - Maximum shake offset in pixels
 */

/**
 * Create a new screenshake state object
 * @returns {ScreenshakeState} Initial screenshake state
 */
export function createScreenshake() {
  return {
    time: 0,
    duration: 0,
    intensity: 0
  };
}

/**
 * Trigger a screen shake effect
 * @param {ScreenshakeState} state - Screenshake state to modify
 * @param {number} [intensity=6] - Maximum shake offset in pixels
 * @param {number} [duration=0.18] - Duration in seconds
 */
export function triggerScreenshake(state, intensity = 6, duration = 0.18) {
  state.intensity = intensity;
  state.duration = duration;
  state.time = duration;
}

/**
 * Update screenshake and get current offset
 * Call each frame to get the camera offset to apply
 * @param {ScreenshakeState} state - Screenshake state to update
 * @param {number} dt - Delta time in seconds
 * @returns {{ox: number, oy: number}} Current frame offset in pixels
 */
export function updateScreenshake(state, dt) {
  if (state.time <= 0) return { ox: 0, oy: 0 };
  state.time -= dt;
  const progress = state.time / state.duration;
  const falloff = progress * state.intensity;
  const ox = (Math.random() * 2 - 1) * falloff;
  const oy = (Math.random() * 2 - 1) * falloff;
  return { ox, oy };
}
