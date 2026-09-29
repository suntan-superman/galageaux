/**
 * Code-native visual review with installed Skia 2.2.12 / CanvasKit CPU surfaces.
 * Run: node --preserve-symlinks --preserve-symlinks-main scripts/render-phase1-preview.cjs
 * No browser, downloads, native configuration or mocked drawing primitives.
 * Images omit native HUD/overlays and are NOT iPhone screenshots/performance evidence.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const React = require('react');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const skiaRoot = path.join(root, 'node_modules/@shopify/react-native-skia/lib/commonjs');
const output = path.join(root, '.tmp/phase1-preview');
const width = 390, height = 844;
const h = React.createElement;

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}

async function main() {
  const originalResolve = Module._resolveFilename;
  const originalLoad = Module._load;
  const originalJS = Module._extensions['.js'];
  const originalRandom = Math.random;
  try {
    // Select the package's real web platform/Skia implementations in Node.
    // The generic package entry selects native files without Metro's platform resolver.
    Module._resolveFilename = function (request, parent, ...args) {
      const filename = originalResolve.call(this, request, parent, ...args);
      if (filename === path.join(skiaRoot, 'Platform/Platform.js')) return path.join(skiaRoot, 'Platform/Platform.web.js');
      if (filename === path.join(skiaRoot, 'skia/Skia.js')) return path.join(skiaRoot, 'skia/Skia.web.js');
      return filename;
    };
    global.CanvasKit = await require('canvaskit-wasm/full')({
      wasmBinary: fs.readFileSync(require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm')),
    });
    const headless = require(path.join(skiaRoot, 'headless'));
    const exports = { ...headless, ...headless.getSkiaExports(), ...require(path.join(skiaRoot, 'skia/core')) };
    Module._load = function (request, parent, isMain) {
      if (request === '@shopify/react-native-skia') return exports;
      return originalLoad.call(this, request, parent, isMain);
    };
    // Transform only project JavaScript in memory; leave installed packages untouched.
    Module._extensions['.js'] = function (module, filename) {
      if (!filename.startsWith(path.join(root, 'src') + path.sep)) return originalJS(module, filename);
      const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, babelrc: false, configFile: false,
        plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
      });
      module._compile(code, filename);
    };

    const canvas = require(path.join(root, 'src/components/canvas'));
    const BossHealthBar = require(path.join(root, 'src/components/BossHealthBar')).default;
    const { createStarField, advanceStarField } = require(path.join(root, 'src/hooks/useStarField'));
    const { createGameSession, stepGameSession } = require(path.join(root, 'src/engine/gameSimulation'));
    const { createEnemy } = require(path.join(root, 'src/engine/spawner'));
    const { createBoss } = require(path.join(root, 'src/engine/boss'));
    const { createPlayerBullets } = require(path.join(root, 'src/engine/projectiles'));
    const { generateBossBullets } = require(path.join(root, 'src/engine/boss-patterns'));
    const { checkBulletEnemyCollisions } = require(path.join(root, 'src/engine/collisionHandlers'));
    const particles = require(path.join(root, 'src/engine/particles'));
    const { Group } = exports;

    Math.random = seeded(20260929);
    const stars = advanceStarField(createStarField(width, height), 3, width, height);
    let calm = createGameSession(width, height);
    for (let frame = 0; frame < 180; frame++) calm = stepGameSession(calm, 1 / 60, {}, () => 0.25).state;

    // Explicit visual fixture, not an asserted live campaign encounter. Entity
    // constructors and velocities come from production modules; rendering is real.
    const combat = createGameSession(width, height);
    combat.player = { ...combat.player, x: 238, shield: true, weaponType: 'spread', weaponLevel: 3 };
    combat.enemies = ['grunt', 'shooter', 'dive', 'shooter'].map((type, index) => ({
      ...createEnemy({ type, x: [46, 137, 278, 324][index], y: [245, 335, 268, 390][index], baseSpeed: 100, pattern: 'line' }),
      id: `preview-enemy-${index}`,
    }));
    combat.boss = { ...createBoss('stage1', width), y: 160, hp: 78 };
    const moved = (bullet, time, id) => ({ ...bullet, id, x: bullet.x + bullet.vx * time, y: bullet.y + bullet.vy * time });
    combat.bullets = [0.15, 0.45, 0.75, 1.05].flatMap((age, volley) =>
      createPlayerBullets(combat.player).map((bullet, index) => moved(bullet, age, `preview-friendly-${volley}-${index}`)));
    combat.enemyBullets = generateBossBullets(combat.boss, 'spread', 'stage1', 258, 686)
      .map((bullet, index) => moved(bullet, 0.9, `preview-hostile-${index}`));
    combat.powerups = ['double', 'triple', 'spread', 'rapid', 'shield', 'slow'].map((kind, index) => ({
      id: `preview-powerup-${kind}`, kind, x: 48 + index * 53, y: 554, size: 20, rotation: 0,
    }));
    // A final-HP shooter hit uses the real collision handler's ordinary-death
    // budget: four contact particles plus twelve burst particles/four sparks.
    const ordinaryDestruction = (x, y) => checkBulletEnemyCollisions(
      [{ id: 'preview-killing-shot', x: x - 2, y, width: 4, height: 14, vx: 0, vy: -420 }],
      [{ ...createEnemy({ type: 'shooter', x: x - 13, y: y - 13, baseSpeed: 0, pattern: 'line' }), hp: 1 }]
    ).results;
    const combatDeath = ordinaryDestruction(85, 392);
    combat.explosions = combatDeath.explosions.map(effect => particles.updateExplosion(effect, 0.065));
    combat.particles = particles.updateParticles([
      ...combatDeath.particles,
      ...particles.spawnContactParticles(151, 346, { targetId: 'preview-enemy-1', color: '#f97316' }),
    ], 0.025);
    combat.muzzleFlashes = [{ id: 'preview-muzzle', x: 258, y: combat.player.y - 14, life: 0.05 }];

    const scene = (state, stage, time = 3, bank = 0) => h(React.Fragment, null,
      h(canvas.Background, { width, height, stage, time }),
      h(Group, null,
        h(canvas.StarField, { stars, time }),
        h(canvas.PlayerShip, { player: state.player, bank, velocityX: bank ? 220 : 0, time }),
        h(canvas.Enemies, { enemies: state.enemies }),
        h(canvas.BossShip, { boss: state.boss, screenWidth: width, showHealthBar: false }),
        h(canvas.Explosions, { explosions: state.explosions, ox: 0, oy: 0 }),
        h(canvas.Particles, { particles: state.particles, ox: 0, oy: 0 }),
        h(canvas.Powerups, { powerups: state.powerups, time }),
        h(canvas.MuzzleFlashes, { flashes: state.muzzleFlashes }),
        h(canvas.PlayerBullets, { bullets: state.bullets }),
        h(canvas.EnemyBullets, { bullets: state.enemyBullets })),
      state.boss?.alive && h(BossHealthBar, { health: state.boss.hp, maxHealth: state.boss.maxHp,
        x: width / 2 - 100, y: 112, width: 200, height: 10 }));

    // Normal-scale contact sheet, left-to-right within each row:
    // bank -8/0/+8 degrees (neutral powered thrust); contact 0/.04/.1 seconds;
    // ordinary destruction 0/.065/.15 seconds; shield ripple 0/.1/.25 seconds.
    // Every age is derived independently from the same production effect seed.
    const contact = particles.spawnContactParticles(0, 0, { vx: 0, vy: -420 });
    const destruction = ordinaryDestruction(0, 0);
    const shield = particles.spawnShieldRipple(0, 0, 26);
    if (destruction.particles.length !== 20) throw new Error(`Ordinary destruction budget changed: ${destruction.particles.length}`);
    const columns = [65, 195, 325];
    const effectTiles = (rowY, ages, initialParticles, initialExplosions = []) => ages.map((age, index) =>
      h(Group, { key: `${rowY}-${age}`, transform: [{ translateX: columns[index] }, { translateY: rowY }] },
        h(canvas.Explosions, { explosions: initialExplosions.map(effect => particles.updateExplosion(effect, age)).filter(Boolean), ox: 0, oy: 0 }),
        h(canvas.Particles, { particles: particles.updateParticles(initialParticles, age), ox: 0, oy: 0 })));
    const contactSheet = h(React.Fragment, null,
      h(canvas.Background, { width, height, stage: 'stage1', time: 3 }),
      ...[-8, 0, 8].map((degrees, index) => h(canvas.PlayerShip, {
        key: `bank-${degrees}`,
        player: { ...calm.player, x: columns[index] - 20, y: 120 - 11, width: 40, height: 22, shield: false },
        bank: degrees * Math.PI / 180, velocityX: 0, time: 3,
      })),
      ...effectTiles(320, [0, 0.04, 0.1], contact),
      ...effectTiles(520, [0, 0.065, 0.15], destruction.particles, destruction.explosions),
      ...effectTiles(720, [0, 0.1, 0.25], shield));

    fs.mkdirSync(output, { recursive: true });
    const render = async (filename, element, imageWidth = width) => {
      const surface = headless.makeOffscreenSurface(imageWidth, height);
      let image;
      try {
        image = await headless.drawOffscreen(surface, element);
        const bytes = image.encodeToBytes();
        fs.writeFileSync(path.join(output, filename), bytes);
        console.log(`${filename}: ${imageWidth}x${height}, ${bytes.length} bytes`);
      } finally { image?.dispose(); surface.dispose(); }
    };
    await render('stage1-calm.png', scene(calm, 'stage1'));
    await render('combat-spread-shield.png', scene(combat, 'stage1', 3, 0.1));
    await render('stage-themes-left-to-right-1-2-3.png', h(React.Fragment, null,
      ...['stage1', 'stage2', 'stage3'].map((stage, index) => h(Group, {
        key: stage, transform: [{ translateX: index * width }], clip: { x: 0, y: 0, width, height },
      }, scene(combat, stage, 3, 0.1)))), width * 3);
    await render('bank-contact-destruction-shield-timing.png', contactSheet);
    console.log('Timing sheet rows: bank -8/0/+8 deg; contact 0/.04/.1 s; ordinary destruction 0/.065/.15 s (20 initial particles); shield ripple 0/.1/.25 s.');
    console.log('Production Skia/CanvasKit CPU previews only; no native HUD, touch, audio, FPS, or iPhone equivalence claim.');
  } finally {
    Module._resolveFilename = originalResolve;
    Module._load = originalLoad;
    Module._extensions['.js'] = originalJS;
    Math.random = originalRandom;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
