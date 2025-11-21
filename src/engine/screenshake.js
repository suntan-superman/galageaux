export function createScreenshake() {
  return {
    time: 0,
    duration: 0,
    intensity: 0
  };
}

export function triggerScreenshake(state, intensity = 6, duration = 0.18) {
  state.intensity = intensity;
  state.duration = duration;
  state.time = duration;
}

export function updateScreenshake(state, dt) {
  if (state.time <= 0) return { ox: 0, oy: 0 };
  state.time -= dt;
  const progress = state.time / state.duration;
  const falloff = progress * state.intensity;
  const ox = (Math.random() * 2 - 1) * falloff;
  const oy = (Math.random() * 2 - 1) * falloff;
  return { ox, oy };
}
