import { makeFlightPath, sampleFlightPath } from './flightPaths';

export const FLIGHT = Object.freeze({ ENTERING: 'ENTERING', FORMATION: 'FORMATION',
  BREAKAWAY: 'BREAKAWAY', ATTACKING: 'ATTACKING', RETURNING: 'RETURNING', EXITING: 'EXITING' });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const point = (x, y) => ({ x, y });
const center = enemy => enemy.x + enemy.size / 2;

export function formationPosition(enemy, time) {
  const phase = (time - enemy.formationBornAt) * 1.15;
  const settle = Math.min(1, enemy.flightElapsed / 0.35);
  return { x: enemy.formationX + Math.sin(phase) * 3.5 * settle,
    y: enemy.formationY + Math.sin(phase * 0.7) * 1.5 * settle };
}

function entranceFamily(stage, level, waveId) {
  if (stage === 'stage1' && level === 1) return waveId % 3 === 0 ? 'sweep' : 'cascade';
  const choices = stage === 'stage1' && level === 2 ? ['cascade', 'fan', 'sweep']
    : ['sweep', 'fan', 'crossover', 'cascade'];
  return choices[waveId % choices.length];
}

function entrancePath(enemy, family, index, count, width, height) {
  const slot = point(enemy.formationX, enemy.formationY);
  const side = index % 2 ? 1 : -1;
  let start = point(enemy.x, enemy.y), c1, c2;
  if (family === 'fan') {
    start = point(width / 2 - enemy.size / 2 + (index - (count - 1) / 2) * 7, -enemy.size - index * 6);
    c1 = point(width / 2 + side * 12, height * 0.03);
    c2 = point(slot.x + side * width * 0.13, height * 0.11);
  } else if (family === 'crossover' && count > 1) {
    start = point(side < 0 ? width * 0.08 : width * 0.92 - enemy.size, -enemy.size - index * 7);
    c1 = point(width / 2 - side * width * 0.1, height * 0.015);
    c2 = point(width / 2 + side * width * 0.12, height * 0.12);
  } else if (family === 'sweep') {
    // The first quiet level retains its existing above-screen spawn location.
    if (count > 1) start = point(side < 0 ? width * 0.06 : width * 0.94 - enemy.size, -enemy.size - index * 7);
    c1 = point(start.x - side * width * 0.11, height * 0.025);
    c2 = point(slot.x - side * width * 0.13, height * 0.105);
  } else {
    if (count > 1) start = point(width * 0.24, -enemy.size - index * 7);
    c1 = point(start.x + width * 0.1, height * 0.015);
    c2 = point(slot.x + width * 0.075, height * 0.12);
  }
  return { start, path: makeFlightPath([start, c1, c2, slot], width, height, enemy.baseSpeed ?? enemy.speed) };
}

/** Called only after admission trimming. No extra enemies or RNG calls. */
export function prepareFlightWave(enemies, { width, height, time, stage, level, waveId }) {
  if (!enemies.length) return [];
  const count = enemies.length;
  const family = entranceFamily(stage, level, waveId);
  const group = count < 2 || level === 1 ? 'single'
    : level === 2 ? 'pair' : ['mirror', 'leader', 'pincer'][waveId % 3];
  const prepared = enemies.map((enemy, index) => {
    const formationX = clamp(enemy.x, 8, width - enemy.size - 8);
    const formationY = clamp(height * 0.16, 90, 145) + (enemy.pattern === 'dive' ? Math.abs(index - (count - 1) / 2) * 8 : 0);
    const base = { ...enemy, formationId: waveId, formationSlot: index, flightLevel: level,
      formationX, formationY, formationBornAt: time, flightState: FLIGHT.ENTERING,
      flightElapsed: 0, pathElapsed: 0, pathProgress: 0, flightAge: 0, flightCycle: 0,
      entranceFamily: family, groupStyle: group, attackFamily: null, targetSnapshot: null,
      returnDestination: point(formationX, formationY), heading: 0, anticipation: 0 };
    const { start, path } = entrancePath(base, family, index, count, width, height);
    return { ...base, x: start.x, y: start.y, path, entranceDelay: count > 1 ? index * 0.16 : 0 };
  });
  const longest = Math.max(...prepared.map(enemy => enemy.path.duration + enemy.entranceDelay));
  const hold = level === 1 ? 5.2 : level === 2 ? 3.2 : level === 3 ? 2.5 : 2.1;
  return prepared.map((enemy, index) => {
    let offset = 0;
    if (group === 'pair') offset = index < 2 ? index * 0.2 : 1.4;
    else if (group === 'mirror' || group === 'pincer') offset = index === 0 || index === count - 1 ? index === 0 ? 0 : 0.18 : 1.3 + index * 0.3;
    else if (group === 'leader') offset = index < 3 ? index * 0.22 : 1.5 + index * 0.2;
    return { ...enemy, attackAt: time + longest + hold + offset
      + (enemy.type === 'shooter' ? 0.65 : enemy.type === 'tank' ? 0.8 : enemy.type === 'dive' ? -0.35 : 0) };
  });
}

function attackFamily(enemy, level) {
  if (level === 1) return 'shallow';
  if (enemy.type === 'kamikaze') return 'targeted';
  if (enemy.type === 'tank' || enemy.type === 'grunt') return 'shallow';
  if (level === 2) return enemy.type === 'dive' ? 'deep' : 'shallow';
  if (enemy.groupStyle === 'mirror' || enemy.groupStyle === 'pincer') return 'swing';
  if (enemy.type === 'elite') return 'hook';
  if (enemy.type === 'scout') return 'swing';
  if (enemy.type === 'dive') return 'deep';
  return level >= 4 && enemy.formationSlot % 3 === 0 ? 'hook' : 'shallow';
}

function attackPath(enemy, width, height) {
  const side = enemy.groupStyle === 'mirror' || enemy.groupStyle === 'pincer'
    ? enemy.formationSlot === 0 ? -1 : 1 : enemy.formationSlot % 2 ? 1 : -1;
  const family = enemy.attackFamily;
  const start = point(enemy.x, enemy.y);
  const target = enemy.targetSnapshot;
  const depth = family === 'shallow' ? 0.46 : family === 'deep' ? 0.65 : family === 'swing' ? 0.57 : 0.61;
  let endX = start.x + side * width * (family === 'swing' ? 0.3 : family === 'hook' ? 0.2 : 0.13);
  let endY = height * depth;
  if (family === 'targeted') {
    endX = target.x - enemy.size / 2;
    endY = clamp(target.y - 85, height * 0.56, height * 0.76);
  } else if (enemy.groupStyle === 'mirror' || enemy.groupStyle === 'pincer') {
    endX = width / 2 + side * width * (enemy.groupStyle === 'pincer' ? 0.11 : 0.18) - enemy.size / 2;
  }
  const end = point(clamp(endX, width * 0.06, width * 0.94 - enemy.size), endY);
  const c1 = point(clamp(start.x + side * width * (family === 'hook' ? 0.25 : 0.08), 0, width - enemy.size),
    start.y + (family === 'hook' ? -height * 0.045 : height * 0.12));
  const c2 = point(clamp(end.x + side * width * (family === 'swing' ? 0.12 : -0.075), 0, width - enemy.size),
    end.y - height * 0.13);
  return makeFlightPath([start, c1, c2, end], width, height, enemy.baseSpeed ?? enemy.speed);
}

function returnPath(enemy, width, height) {
  const side = enemy.x < width / 2 ? -1 : 1;
  const end = enemy.returnDestination;
  return makeFlightPath([point(enemy.x, enemy.y),
    point(clamp(enemy.x + side * width * 0.1, 0, width - enemy.size), enemy.y - height * 0.15),
    point(clamp(end.x + side * width * 0.12, 0, width - enemy.size), end.y + height * 0.13), end],
  width, height, enemy.baseSpeed ?? enemy.speed);
}

function exitPath(enemy, width, height) {
  const side = enemy.formationX < width / 2 ? -1 : 1;
  return makeFlightPath([point(enemy.x, enemy.y), point(enemy.x + side * width * 0.08, enemy.y - height * 0.05),
    point(clamp(enemy.x + side * width * 0.15, -enemy.size, width), height * 0.015),
    point(clamp(enemy.x + side * width * 0.2, -enemy.size, width), -enemy.size * 2)],
  width, height, enemy.baseSpeed ?? enemy.speed);
}

const bank = (heading, previous, dt) => {
  const target = clamp(heading * 0.65, -0.48, 0.48);
  return previous + (target - previous) * (1 - Math.exp(-dt / 0.12));
};

/** Returns null only on a completed exit or a failed/expired authored flight. */
export function advanceEnemyFlight(enemy, dt, { width, height, time, level, player }) {
  if (!enemy.flightState) return enemy;
  const flightAge = enemy.flightAge + dt;
  if (flightAge > 45 || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) return null;
  const flightElapsed = enemy.flightElapsed + dt;
  const speedFactor = enemy.speed / Math.max(1, enemy.baseSpeed ?? enemy.speed);
  const pathElapsed = enemy.pathElapsed + dt * speedFactor;
  if (enemy.flightState === FLIGHT.ENTERING) {
    if (flightElapsed < enemy.entranceDelay) return { ...enemy, flightElapsed, flightAge };
    const sample = sampleFlightPath(enemy.path, Math.max(0, pathElapsed - enemy.entranceDelay), width, height);
    const done = sample.progress >= 1;
    return { ...enemy, x: sample.x, y: sample.y, flightState: done ? FLIGHT.FORMATION : FLIGHT.ENTERING,
      flightElapsed: done ? 0 : flightElapsed, pathElapsed, pathProgress: sample.progress,
      heading: bank(done ? 0 : sample.heading, enemy.heading, dt), flightAge };
  }
  if (enemy.flightState === FLIGHT.FORMATION) {
    const position = formationPosition({ ...enemy, flightElapsed }, time);
    const authoredLevel = enemy.flightLevel ?? level;
    const repeatAttacker = authoredLevel >= 2 && ['dive', 'elite'].includes(enemy.type);
    const shouldAttack = enemy.flightCycle === 0 ? time >= enemy.attackAt
      : enemy.flightCycle === 1 && repeatAttacker && flightElapsed >= 1.35;
    if (shouldAttack) {
      return { ...enemy, ...position, flightState: FLIGHT.BREAKAWAY, flightElapsed: 0,
        targetSnapshot: point(player.x + player.width / 2, player.y + player.height / 2),
        attackFamily: attackFamily(enemy, authoredLevel), heading: bank(position.x < width / 2 ? -0.25 : 0.25, enemy.heading, dt),
        anticipation: 1, flightAge };
    }
    if (enemy.flightCycle > 0 && (!repeatAttacker || enemy.flightCycle > 1) && flightElapsed >= 1.55) {
      return { ...enemy, ...position, flightState: FLIGHT.EXITING, flightElapsed: 0, pathElapsed: 0,
        pathProgress: 0, path: exitPath({ ...enemy, ...position }, width, height), flightAge };
    }
    return { ...enemy, ...position, flightElapsed, heading: bank(0, enemy.heading, dt), anticipation: 0, flightAge };
  }
  if (enemy.flightState === FLIGHT.BREAKAWAY) {
    if (flightElapsed < 0.28) return { ...enemy, flightElapsed, flightAge,
      heading: bank(enemy.formationX < width / 2 ? -0.35 : 0.35, enemy.heading, dt),
      anticipation: Math.sin(Math.PI * flightElapsed / 0.28) };
    return { ...enemy, flightState: FLIGHT.ATTACKING, flightElapsed: 0, pathElapsed: 0, pathProgress: 0,
      path: attackPath(enemy, width, height), anticipation: 0, flightAge };
  }
  const sample = sampleFlightPath(enemy.path, pathElapsed, width, height);
  const moved = { ...enemy, x: sample.x, y: sample.y, flightElapsed, pathElapsed,
    pathProgress: sample.progress, heading: bank(sample.heading, enemy.heading, dt), flightAge };
  if (sample.progress < 1) return moved;
  if (enemy.flightState === FLIGHT.ATTACKING) return { ...moved, flightState: FLIGHT.RETURNING,
    flightElapsed: 0, pathElapsed: 0, pathProgress: 0, path: returnPath(moved, width, height) };
  if (enemy.flightState === FLIGHT.RETURNING) return { ...moved, flightState: FLIGHT.FORMATION,
    flightElapsed: 0, pathElapsed: 0, pathProgress: 1, flightCycle: enemy.flightCycle + 1,
    x: enemy.returnDestination.x, y: enemy.returnDestination.y };
  return null; // EXITING completed above the viewport.
}
