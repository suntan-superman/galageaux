import { cubicPosition, cubicTangent, easePath, makeFlightPath, sampleFlightPath } from '../../engine/flightPaths';
import { FLIGHT, prepareFlightWave, advanceEnemyFlight, formationPosition } from '../../engine/enemyFlight';
import { createGameSession, stepGameSession, commandGameSession } from '../../engine/gameSimulation';
import { createEnemy } from '../../engine/spawner';
import { calculateDifficultySettings } from '../../engine/difficulty';
import waves from '../../config/waves.json';

const FRAME = 1 / 60;
const player = { x: 180, y: 640, width: 40, height: 22 };
const random = () => 0.75;
const raw = (type = 'grunt', x = 100) => createEnemy({ type, x, y: -24, baseSpeed: 90, pattern: 'line', random });
const prepare = (members = [raw()], options = {}) => prepareFlightWave(members, {
  width: 400, height: 800, time: 0, stage: 'stage1', level: 1, waveId: 1, ...options,
});
const advance = (enemy, dt, time, position = player, level = 1) => advanceEnemyFlight(enemy, dt,
  { width: 400, height: 800, time, level, player: position });
const runUntil = (enemy, wanted, max = 45, position = player, level = 1, startTime = 0) => {
  let time = startTime;
  while (enemy && enemy.flightState !== wanted && time - startTime < max) {
    time += FRAME;
    enemy = advance(enemy, FRAME, time, position, level);
  }
  return { enemy, time };
};
const seeded = seed => {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
};

describe('screen-relative production cubic flight math', () => {
  const points = [{ x: 0, y: 0 }, { x: 0.2, y: 0.1 }, { x: 0.8, y: 0.9 }, { x: 1, y: 1 }];
  it('hits both exact endpoints and clamps out-of-range progress', () => {
    expect(cubicPosition(points, -4)).toEqual(points[0]);
    expect(cubicPosition(points, 1)).toEqual(points[3]);
    expect(cubicPosition(points, 4)).toEqual(points[3]);
    expect(easePath(-1)).toBe(0);
    expect(easePath(2)).toBe(1);
  });
  it('uses the path tangent rather than a live player vector', () => {
    expect(cubicTangent(points, 0).x).toBeCloseTo(0.6);
    expect(cubicTangent(points, 1).y).toBeCloseTo(0.3);
  });
  it('scales normalized positions across screen sizes and fixes elapsed-time completion', () => {
    const path = makeFlightPath([{ x: 0, y: -20 }, { x: 30, y: 20 }, { x: 80, y: 90 }, { x: 100, y: 120 }], 400, 800, 100);
    expect(path.duration).toBeGreaterThan(0);
    expect(sampleFlightPath(path, 0, 400, 800)).toMatchObject({ x: 0, y: -20, progress: 0 });
    expect(sampleFlightPath(path, path.duration * 0.5, 400, 800).progress).toBe(0.5);
    expect(sampleFlightPath(path, path.duration * 2, 400, 800)).toMatchObject({ x: 100, y: 120, progress: 1 });
    expect(sampleFlightPath(path, path.duration, 800, 1600)).toMatchObject({ x: 200, y: 240 });
  });
});

describe('explicit flight states and ownership', () => {
  it('enters visibly, settles, anticipates, attacks, returns to its reserved slot, and exits', () => {
    let enemy = prepare()[0];
    const identity = [enemy.formationId, enemy.formationSlot];
    expect(enemy.flightState).toBe(FLIGHT.ENTERING);
    let time = 0;
    for (let i = 0; i < 60; i++) { time += FRAME; enemy = advance(enemy, FRAME, time); }
    expect(enemy.y + enemy.size).toBeGreaterThan(0);
    ({ enemy, time } = runUntil(enemy, FLIGHT.FORMATION, 45, player, 1, time));
    expect(enemy).toBeTruthy();
    ({ enemy, time } = runUntil(enemy, FLIGHT.BREAKAWAY, 45, player, 1, time));
    expect(enemy.targetSnapshot).toEqual({ x: 200, y: 651 });
    expect(enemy.anticipation).toBe(1);
    ({ enemy, time } = runUntil(enemy, FLIGHT.ATTACKING, 45, player, 1, time));
    expect(enemy.attackFamily).toBe('shallow');
    ({ enemy, time } = runUntil(enemy, FLIGHT.RETURNING, 45, player, 1, time));
    ({ enemy, time } = runUntil(enemy, FLIGHT.FORMATION, 45, player, 1, time));
    expect(enemy.flightCycle).toBe(1);
    expect([enemy.formationId, enemy.formationSlot]).toEqual(identity);
    expect(enemy.x).toBeCloseTo(enemy.returnDestination.x);
    expect(enemy.y).toBeCloseTo(enemy.returnDestination.y);
    ({ enemy, time } = runUntil(enemy, FLIGHT.EXITING, 45, player, 1, time));
    ({ enemy } = runUntil(enemy, 'DONE', 45, player, 1, time));
    expect(enemy).toBeNull();
  });

  it('keeps a shared formation clock and unique slots after admission trimming', () => {
    const wave = prepare([raw('grunt', 90), raw('shooter', 130), raw('dive', 170)], { level: 2, waveId: 7, time: 12 });
    expect(wave.map(enemy => enemy.formationSlot)).toEqual([0, 1, 2]);
    expect(new Set(wave.map(enemy => `${enemy.formationId}:${enemy.formationSlot}`)).size).toBe(3);
    expect(wave.map(enemy => enemy.formationBornAt)).toEqual([12, 12, 12]);
    const settled = wave.map(enemy => ({ ...enemy, flightState: FLIGHT.FORMATION, flightElapsed: 1 }));
    const drift = settled.map(enemy => formationPosition(enemy, 13).x - enemy.formationX);
    expect(drift[0]).toBeCloseTo(drift[1]);
    expect(drift[1]).toBeCloseTo(drift[2]);
  });

  it.each(['cascade', 'sweep', 'fan', 'crossover'])('%s enters from outside and ends at the assigned slot', family => {
    // Authored wave order selects each family without changing spawn probabilities.
    const ids = { cascade: 3, sweep: 4, fan: 1, crossover: 2 };
    const wave = prepare([raw('grunt', 130), raw('grunt', 160)], { level: 4, waveId: ids[family] });
    expect(wave[0].entranceFamily).toBe(family);
    wave.forEach(enemy => {
      expect(enemy.y).toBeLessThan(0);
      const end = sampleFlightPath(enemy.path, enemy.path.duration, 400, 800);
      expect(end.x).toBeCloseTo(enemy.formationX);
      expect(end.y).toBeCloseTo(enemy.formationY);
    });
  });

  it('uses shallow first-level attacks and type-specific later families', () => {
    const cases = [['grunt', 1, 'shallow'], ['dive', 2, 'deep'], ['scout', 4, 'swing'],
      ['kamikaze', 4, 'targeted'], ['tank', 4, 'shallow'], ['elite', 4, 'hook']];
    for (const [type, level, family] of cases) {
      const initial = prepare([raw(type)], { level })[0];
      const ready = { ...initial, flightState: FLIGHT.FORMATION, x: initial.formationX, y: initial.formationY };
      const next = advance(ready, FRAME, ready.attackAt + FRAME, player, level);
      expect(next.flightState).toBe(FLIGHT.BREAKAWAY);
      expect(next.attackFamily).toBe(family);
    }
  });

  it('gives later dive and elite ships a second bounded breakaway without changing first-level calm', () => {
    for (const type of ['dive', 'elite']) {
      const initial = prepare([raw(type)], { level: 4 })[0];
      const returned = { ...initial, flightState: FLIGHT.FORMATION, flightCycle: 1,
        flightElapsed: 1.34, x: initial.formationX, y: initial.formationY };
      expect(advance(returned, FRAME, 10).flightState).toBe(FLIGHT.BREAKAWAY);
      const complete = { ...returned, flightCycle: 2, flightElapsed: 1.54 };
      expect(advance(complete, FRAME, 10).flightState).toBe(FLIGHT.EXITING);
    }
    const early = prepare([raw('dive')], { level: 1 })[0];
    expect(advance({ ...early, flightState: FLIGHT.FORMATION, flightCycle: 1,
      flightElapsed: 1.54 }, FRAME, 10).flightState).toBe(FLIGHT.EXITING);
  });

  it('commits one target snapshot and never steers toward later player positions, including kamikaze', () => {
    const initial = prepare([raw('kamikaze')], { level: 4 })[0];
    const ready = { ...initial, flightState: FLIGHT.FORMATION, x: initial.formationX, y: initial.formationY };
    const committed = advance(ready, FRAME, ready.attackAt + FRAME, { ...player, x: 20 }, 4);
    expect(committed.targetSnapshot.x).toBe(40);
    const changed = { ...player, x: 340 };
    let first = committed, second = committed, time = ready.attackAt + FRAME;
    for (let i = 0; i < 200; i++) {
      time += FRAME;
      first = advance(first, FRAME, time, player, 4);
      second = advance(second, FRAME, time, changed, 4);
      expect(first).toEqual(second);
      if (first.flightState === FLIGHT.RETURNING) break;
    }
    expect(first.targetSnapshot.x).toBe(40);
    expect(first.x).toBeLessThan(200);
  });

  it('staggered pair and follow-the-leader ordering stay authored and mirror endpoints leave a gap', () => {
    const pair = prepare([raw('grunt', 130), raw('grunt', 165), raw('grunt', 200)], { level: 2, waveId: 2 });
    expect(pair[1].attackAt - pair[0].attackAt).toBeCloseTo(0.2);
    const leader = prepare([raw('dive', 90), raw('dive', 125), raw('dive', 160)], { level: 4, waveId: 1 });
    expect(leader[0].groupStyle).toBe('leader');
    expect(leader[1].attackAt - leader[0].attackAt).toBeCloseTo(0.22);
    expect(leader[2].attackAt - leader[1].attackAt).toBeCloseTo(0.22);
    const mirror = prepare([raw('dive', 130), raw('dive', 166)], { level: 4, waveId: 3 });
    expect(mirror[0].groupStyle).toBe('mirror');
    const attackEnds = mirror.map(enemy => {
      const ready = { ...enemy, flightState: FLIGHT.FORMATION, x: enemy.formationX, y: enemy.formationY };
      const start = advance(ready, FRAME, ready.attackAt + FRAME, player, 4);
      const attack = advance({ ...start, flightElapsed: 0.3 }, FRAME, ready.attackAt + 0.3, player, 4);
      return sampleFlightPath(attack.path, attack.path.duration, 400, 800).x + enemy.size / 2;
    });
    expect(attackEnds[1] - attackEnds[0]).toBeGreaterThan(80);
    expect((attackEnds[0] + attackEnds[1]) / 2).toBeCloseTo(200);
  });

  it('bounds bank, freezes it in pause, and keeps path speed subject to slow', () => {
    const initial = prepare()[0];
    const normal = advance(initial, FRAME, FRAME);
    const slow = advance({ ...initial, speed: initial.speed * 0.6 }, FRAME, FRAME);
    expect(slow.pathElapsed).toBeCloseTo(normal.pathElapsed * 0.6);
    expect(Math.abs(normal.heading)).toBeLessThanOrEqual(0.48);
    const state = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true,
      enemies: [{ ...normal, id: 'flight-1' }] };
    const paused = commandGameSession(state, { type: 'pause' }).state;
    expect(stepGameSession(paused, 10).state.enemies[0]).toEqual({ ...normal, id: 'flight-1' });
  });

  it('times out a malformed invisible resident instead of retaining it forever', () => {
    const enemy = prepare()[0];
    expect(advance({ ...enemy, flightAge: 45 }, FRAME, 45)).toBeNull();
    expect(advance({ ...enemy, x: Number.NaN }, FRAME, 0)).toBeNull();
  });

  it('does not teleport at entrance, attack, return or exit boundaries', () => {
    let enemy = prepare()[0], largestStep = 0, boundaries = 0;
    for (let i = 1; enemy && i < 60 * 40; i++) {
      const before = enemy;
      enemy = advance(enemy, FRAME, i * FRAME);
      if (!enemy) break;
      largestStep = Math.max(largestStep, Math.hypot(enemy.x - before.x, enemy.y - before.y));
      if (enemy.flightState !== before.flightState) {
        boundaries++;
        expect(Math.hypot(enemy.x - before.x, enemy.y - before.y)).toBeLessThan(6);
      }
    }
    expect(boundaries).toBe(6);
    expect(largestStep).toBeLessThan(9);
  });
});

describe('live simulation collision, pacing and reproducibility', () => {
  it.each(Object.values(FLIGHT))('removes a bullet-killed %s enemy without duplicating its reserved slot', stateName => {
    const initial = prepare()[0];
    const path = makeFlightPath([{ x: 100, y: 100 }, { x: 105, y: 110 }, { x: 110, y: 120 }, { x: 115, y: 130 }], 400, 800, 90);
    const enemy = { ...initial, id: '1:20', x: 100, y: 100, formationX: 100, formationY: 100,
      flightState: stateName, flightElapsed: 0, pathElapsed: 0, entranceDelay: 0, path,
      attackAt: 100, hp: 1, canShoot: false };
    const snapshot = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true,
      enemies: [enemy], bullets: [{ id: '1:21', x: 101, y: 102, width: 4, height: 14, vx: 0, vy: 0 }] };
    const result = stepGameSession(snapshot, FRAME, {}, random);
    expect(result.state.enemies).toHaveLength(0);
    expect(result.events.filter(event => event.type === 'enemyKilled')).toHaveLength(1);
    expect(snapshot.enemies).toHaveLength(1);
  });

  it('keeps first ten-second Stage 1 enemy quantity, interval and cap unchanged', () => {
    let state = createGameSession(400, 800);
    const settings = calculateDifficultySettings(waves.stage1, 1, false);
    const spawnTimes = [];
    for (let i = 0; i < 600; i++) {
      const count = state.totalEnemiesSpawned;
      state = stepGameSession(state, FRAME, {}, random).state;
      if (state.totalEnemiesSpawned > count) spawnTimes.push(state.time);
      expect(state.enemies.length).toBeLessThanOrEqual(settings.maxEnemies);
    }
    expect(settings.spawnInterval).toBeCloseTo(3.2);
    expect(spawnTimes).toHaveLength(4);
    expect(spawnTimes.slice(1).map((time, i) => time - spawnTimes[i])).toEqual(expect.arrayContaining([
      expect.closeTo(3.2, 1), expect.closeTo(3.2, 1), expect.closeTo(3.2, 1),
    ]));
    expect(state.enemies.every(enemy => enemy.flightState && enemy.formationSlot === 0)).toBe(true);
  });

  it('releases completed flights so a no-shoot opening cannot stall its spawn quota', () => {
    let state = createGameSession(400, 800), largest = 0;
    for (let i = 0; i < 60 * 90; i++) {
      state = stepGameSession(state, FRAME, {}, random).state;
      largest = Math.max(largest, state.enemies.length);
      expect(state.enemies.every(enemy => enemy.flightAge <= 45 && enemy.y <= state.height)).toBe(true);
    }
    expect(largest).toBeLessThanOrEqual(4);
    expect(state.totalEnemiesSpawned).toBeGreaterThan(4);
  });

  it.each([1, 2, 3, 4])('retains Stage 1 level %i admission cap and configured wave size', level => {
    const settings = calculateDifficultySettings(waves.stage1, level, false);
    let state = { ...createGameSession(400, 800), level };
    state = stepGameSession(state, FRAME, {}, () => 0.05).state;
    expect(state.enemies.length).toBeLessThanOrEqual(settings.formationSize);
    expect(state.enemies.length).toBeLessThanOrEqual(settings.maxEnemies);
    expect(state.totalEnemiesSpawned).toBe(state.enemies.length);
    expect(new Set(state.enemies.map(enemy => enemy.id)).size).toBe(state.enemies.length);
  });

  it('never shortens the existing hostile-fire cooldown because of flight transitions', () => {
    let state = { ...createGameSession(400, 800), initialWaveSpawned: true, bossSpawned: true };
    const shooter = prepare([raw('shooter')])[0];
    state.enemies = [{ ...shooter, id: '1:50', flightState: FLIGHT.FORMATION, x: shooter.formationX,
      y: shooter.formationY, fireCooldown: 0.01, attackAt: 100 }];
    const shots = [];
    for (let i = 0; i < 600; i++) {
      const result = stepGameSession(state, FRAME, {}, random);
      state = result.state;
      if (state.enemyBullets.length > shots.length) shots.push(state.time);
    }
    expect(shots.length).toBeGreaterThan(0);
    for (let i = 1; i < shots.length; i++) expect(shots[i] - shots[i - 1]).toBeGreaterThanOrEqual(4.5 - FRAME);
  });

  it('replays exactly with the same seed, initial snapshot, input and frame schedule', () => {
    const replay = seed => {
      let state = createGameSession(400, 800), rng = seeded(seed);
      for (let i = 0; i < 900; i++) state = stepGameSession(state, FRAME,
        { playerX: 180 + Math.sin(i / 30) * 80 }, rng).state;
      return { enemies: state.enemies, enemyBullets: state.enemyBullets,
        totalEnemiesSpawned: state.totalEnemiesSpawned, nextFormationId: state.nextFormationId };
    };
    expect(replay(23)).toEqual(replay(23));
  });

  it('has close endpoints under equal-time 60Hz and 120Hz schedules', () => {
    const initial = prepare()[0];
    const simulate = dt => {
      let enemy = initial, time = 0;
      for (let i = 0; i < Math.round(2 / dt); i++) { time += dt; enemy = advance(enemy, dt, time); }
      return enemy;
    };
    const a = simulate(1 / 60), b = simulate(1 / 120);
    expect(a.flightState).toBe(b.flightState);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(2);
  });
});
