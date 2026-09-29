/* Read-only differential diagnostic: production engine vs committed Phase 0.5.
 * Run with Node's --preserve-symlinks --preserve-symlinks-main flags on Windows.
 * No checkout, generated files, native code, network, or test-local engine copy.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { transformSync } = require('@babel/core');
const commonjs = require('@babel/plugin-transform-modules-commonjs');

const root = path.resolve(__dirname, '..');
const baseline = process.argv[2] || '00cc50f8992c0211b1a32783752fd51cba2db863';
if (!/^[0-9a-f]{40}$/i.test(baseline)) throw new Error('Pass a full 40-character baseline commit hash');
const sourceCache = new Map();
const codeCache = new Map();
const currentHashes = new Map();
const omittedVisualFields = new Set([
  'particles', 'explosions', 'shake', 'screenOffset', 'scoreTexts', 'muzzleFlashes',
  'playerHitFlash', 'hudPulse', 'levelBanner',
]);
const canonical = value => JSON.stringify(value, (_, item) => {
  if (typeof item === 'number' && !Number.isFinite(item)) return { nonfinite: String(item) };
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  }
  return item;
});
const gameplay = state => Object.fromEntries(Object.entries(state).filter(([key]) => !omittedVisualFields.has(key)));

function source(revision, filename) {
  const key = revision + ':' + filename;
  if (!sourceCache.has(key)) {
    const value = revision === 'current'
      ? fs.readFileSync(path.join(root, filename), 'utf8')
      : execFileSync('git', ['-c', 'safe.directory=' + root.replace(/\\/g, '/'), 'show', revision + ':' + filename], { cwd: root, encoding: 'utf8' });
    sourceCache.set(key, value);
    if (revision === 'current') currentHashes.set(filename, crypto.createHash('sha256').update(value).digest('hex'));
  }
  return sourceCache.get(key);
}

function world(revision, seed) {
  let state = seed >>> 0;
  const calls = { global: 0, step: 0 };
  const next = kind => {
    calls[kind]++;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const seededMath = Object.create(Math);
  seededMath.random = () => next('global');
  const context = vm.createContext({ Math: seededMath, console,
    Date: class extends Date { static now() { return 1700000000000; } },
  });
  const modules = new Map();
  function load(filename) {
    filename = path.posix.normalize(filename.replace(/\\/g, '/'));
    if (!path.posix.extname(filename)) filename += '.js';
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const raw = source(revision, filename);
    if (filename.endsWith('.json')) module.exports = JSON.parse(raw);
    else {
      const key = revision + ':' + filename;
      if (!codeCache.has(key)) codeCache.set(key, transformSync(raw, {
        filename, configFile: false, babelrc: false, plugins: [commonjs],
      }).code);
      const execute = new vm.Script('(function(require,module,exports){\n' + codeCache.get(key) + '\n})', { filename }).runInContext(context);
      execute(request => {
        if (!request.startsWith('.')) throw new Error('Unexpected external engine dependency: ' + request);
        return load(path.posix.join(path.posix.dirname(filename), request));
      }, module, module.exports);
    }
    return module.exports;
  }
  return { engine: load('src/engine/gameSimulation.js'), load, calls, random: () => next('step') };
}

function firstDifference(a, b, location = 'state') {
  if (canonical(a) === canonical(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const difference = firstDifference(a[key], b[key], location + '.' + key);
      if (difference) return difference;
    }
  }
  return location + ': baseline=' + canonical(a) + ', current=' + canonical(b);
}

let totalChecks = 0;
const summaries = [];
function scenario(name, seed, setup, drive) {
  const old = world(baseline, seed), current = world('current', seed);
  let states = [old, current].map(w => setup(w));
  let checks = 0;
  const eventCounts = {};
  function compare(results, label) {
    const fields = [
      ['gameplay', gameplay(results[0].state), gameplay(results[1].state)],
      ['events', results[0].events, results[1].events],
      ['RNG calls', old.calls, current.calls],
    ];
    for (const [kind, expected, actual] of fields) {
      const difference = firstDifference(expected, actual, kind);
      if (difference) throw new Error(name + ' / ' + label + ' / ' + difference);
    }
    states = results.map(result => result.state);
    results[0].events.forEach(event => { eventCounts[event.type] = (eventCounts[event.type] || 0) + 1; });
    checks++; totalChecks++;
  }
  compare(states.map(state => ({ state, events: [] })), 'initial');
  const api = {
    get states() { return states; },
    fixture: (change, label = 'fixture') => compare([old, current].map((w, index) => ({ state: change(states[index], w), events: [] })), label),
    step: (dt, input = {}, label = 'step') => compare([old, current].map((w, index) => w.engine.stepGameSession(states[index], dt, typeof input === 'function' ? input(states[index]) : input, w.random)), label),
    command: (command, label = command.type) => compare([old, current].map((w, index) => w.engine.commandGameSession(states[index], command)), label),
    advance: (seconds, hz = 60, input = {}) => {
      for (let frame = 0; frame < Math.round(seconds * hz); frame++) api.step(1 / hz, input, 'frame ' + frame + ' at ' + hz + 'Hz');
    },
  };
  drive(api);
  const final = states[0];
  const result = { name, checks, randomCalls: { ...old.calls }, events: eventCounts,
    final: { phase: final.phase, stage: final.currentStage, level: final.level, score: final.score, lives: final.player.lives } };
  summaries.push(result);
  console.log('PASS ' + JSON.stringify(result));
}

const session = w => w.engine.createGameSession(400, 800);
const quiet = w => ({ ...session(w), initialWaveSpawned: true, bossSpawned: true });
const shot = (x, y, id = 'fixture-shot') => ({ id, x, y, width: 4, height: 14, vx: 0, vy: 0 });

for (const [seconds, hz, seed] of [[30, 30, 17], [60, 60, 987], [120, 120, 4567]]) {
  scenario('opening autofire ' + seconds + 's @' + hz + 'Hz', seed, w => {
    const state = session(w);
    state.autoFire = true;
    // The 120s stress fixture cannot terminate early; ordinary 30/60s runs use five lives.
    if (seconds === 120) state.player.lives = 50;
    return state;
  }, api => api.advance(seconds, hz, state => ({ playerX: 180 + Math.sin(state.time * 0.7) * 140 })));
}

scenario('all ordinary HP types and clustered kills', 81723, quiet, api => {
  for (const type of ['grunt', 'shooter', 'dive', 'scout', 'tank', 'elite', 'kamikaze']) {
    api.fixture((state, w) => ({ ...state, enemies: [{ ...w.load('src/engine/spawner').createEnemy({ type, x: 100, y: 200, baseSpeed: 0, pattern: 'line' }), id: 'fixture-' + type, fireCooldown: 100 }] }), type);
    const hp = api.states[0].enemies[0].hp;
    for (let hit = 0; hit < hp; hit++) {
      api.fixture(state => ({ ...state, bullets: [shot(state.enemies[0].x, state.enemies[0].y)] }));
      api.step(1 / 60, {}, type + ' hit ' + hit);
    }
  }
  api.fixture((state, w) => {
    const enemies = Array.from({ length: 6 }, (_, index) => ({ ...w.load('src/engine/spawner').createEnemy({ type: 'tank', x: 30 + index * 50, y: 200, baseSpeed: 0, pattern: 'line' }), id: 'cluster-' + index, fireCooldown: 100 }));
    return { ...state, enemies, bullets: enemies.flatMap((enemy, index) => Array.from({ length: 4 }, (_, hit) => shot(enemy.x, enemy.y, 'cluster-shot-' + index + '-' + hit))) };
  });
  api.step(1 / 60);
  api.advance(1);
});

scenario('shield absorption, damage, loss and terminal freeze', 2347, quiet, api => {
  api.fixture((state, w) => ({ ...state, powerups: [w.load('src/engine/powerups').createPowerup(state.player.x, state.player.y, 'shield')] }));
  api.step(1 / 60);
  for (const lives of [5, 5, 1]) {
    api.fixture(state => ({ ...state, player: { ...state.player, lives }, enemyBullets: [shot(state.player.x, state.player.y)] }));
    api.step(1 / 60);
  }
  api.advance(5);
});

scenario('pickup refresh/replacement, expiry and pause', 619, quiet, api => {
  for (const kind of ['double', 'double', 'triple', 'spread', 'rapid', 'shield', 'slow']) {
    api.fixture((state, w) => ({ ...state, powerups: [w.load('src/engine/powerups').createPowerup(state.player.x, state.player.y, kind)] }));
    api.step(1 / 60);
    api.command({ type: 'fire' });
    api.advance(0.5);
  }
  api.command({ type: 'pause' }); api.step(100);
  api.command({ type: 'move', x: 5 }); api.command({ type: 'fire' });
  api.command({ type: 'resume' }); api.advance(11);
});

scenario('all boss stages/pattern thresholds, hits, transitions and victory', 91234, quiet, api => {
  api.fixture(state => ({ ...state, player: { ...state.player, lives: 50 } }));
  for (const stage of ['stage1', 'stage2', 'stage3']) {
    api.fixture((state, w) => ({ ...state, currentStage: stage, phase: 'boss', bossSpawned: true,
      boss: { ...w.load('src/engine/boss').createBoss(stage, 400), y: 100 }, bullets: [], enemyBullets: [] }));
    const phases = world('current', 1).load('src/config/boss.json')[stage].phases;
    for (const phase of phases) {
      api.fixture(state => ({ ...state, boss: { ...state.boss, hp: phase.hpThreshold + 1 } }));
      api.advance(2, 60, state => ({ playerX: 180 + Math.sin(state.time) * 150 }));
    }
    // Verify an actual nonfatal hit, then death with a hostile shot in the same frame.
    api.fixture(state => ({ ...state, boss: { ...state.boss, hp: 2 }, bullets: [shot(state.boss.x + 10, state.boss.y + 10)] }));
    api.step(1 / 60);
    api.fixture(state => ({ ...state, bullets: [shot(state.boss.x + 10, state.boss.y + 10)], enemyBullets: [shot(state.player.x, state.player.y)] }));
    api.step(1 / 60);
    api.command({ type: 'pause' }); api.step(30); api.command({ type: 'resume' });
    api.advance(2.2);
  }
  api.advance(5);
});

scenario('tutorial, command gating and bounded irregular frames', 33, w => w.engine.createGameSession(400, 800, true), api => {
  api.step(100); api.command({ type: 'move', x: 10 }); api.command({ type: 'fire' });
  api.command({ type: 'start' }); api.command({ type: 'toggleAutoFire' });
  const schedule = [1 / 120, 1 / 30, 1 / 60, 0.099, 1 / 90, 0.12];
  for (let index = 0; index < 300; index++) api.step(schedule[index % schedule.length], { playerX: 180 + Math.sin(index / 20) * 120 });
  api.command({ type: 'pause' }); api.step(100); api.command({ type: 'resume' });
  api.advance(1);
});

console.log(JSON.stringify({ baseline, scenarios: summaries.length, comparisons: totalChecks,
  omittedVisualFields: [...omittedVisualFields], currentSourceSHA256: Object.fromEntries([...currentHashes].sort()),
  note: 'Gameplay projection, complete ordered event batches and separate global/step RNG call counts matched at every checkpoint. This is not a device/rendering/FPS test.' }, null, 2));
