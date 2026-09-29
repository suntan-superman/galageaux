/** Compact screen-relative cubic paths. Positions refer to enemy AABB origins. */
export const clamp01 = value => Math.max(0, Math.min(1, value));
export const easePath = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export function cubicPosition(points, progress) {
  const t = clamp01(progress), q = 1 - t;
  return {
    x: q * q * q * points[0].x + 3 * q * q * t * points[1].x + 3 * q * t * t * points[2].x + t * t * t * points[3].x,
    y: q * q * q * points[0].y + 3 * q * q * t * points[1].y + 3 * q * t * t * points[2].y + t * t * t * points[3].y,
  };
}

export function cubicTangent(points, progress) {
  const t = clamp01(progress), q = 1 - t;
  return {
    x: 3 * q * q * (points[1].x - points[0].x) + 6 * q * t * (points[2].x - points[1].x) + 3 * t * t * (points[3].x - points[2].x),
    y: 3 * q * q * (points[1].y - points[0].y) + 6 * q * t * (points[2].y - points[1].y) + 3 * t * t * (points[3].y - points[2].y),
  };
}

export function makeFlightPath(pixelPoints, width, height, speed) {
  const points = pixelPoints.map(({ x, y }) => ({ x: x / width, y: y / height }));
  // Eight fixed samples are sufficient for duration estimation, never per-frame allocation.
  let length = 0, previous = pixelPoints[0];
  for (let sample = 1; sample <= 8; sample++) {
    const normalized = cubicPosition(points, sample / 8);
    const next = { x: normalized.x * width, y: normalized.y * height };
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
  }
  return { points, duration: Math.max(0.55, length / Math.max(1, speed)) };
}

export function sampleFlightPath(path, elapsed, width, height) {
  const progress = clamp01(elapsed / path.duration);
  const point = cubicPosition(path.points, easePath(progress));
  const tangent = cubicTangent(path.points, easePath(progress));
  return { x: point.x * width, y: point.y * height, progress,
    heading: Math.atan2(tangent.x * width, Math.abs(tangent.y * height) + 20) };
}
