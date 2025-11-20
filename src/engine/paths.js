
export function diveOffset(t, amplitude = 60) {
  return Math.sin(t * Math.PI * 2) * amplitude;
}
