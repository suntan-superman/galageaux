/** Deterministic, presentation-only storyboard. It never creates a game session. */
export const DEMO_DURATION = 27;

export const DEMO_STEPS = Object.freeze([
  { start: 0, title: '1 · LINE UP', text: 'Tilt left or right to move. To drag, turn Tilt Control off in Pause.' },
  { start: 3.2, title: '2 · FIRE STRAIGHT UP', text: 'Press and hold FIRE, or enable Auto-Fire in Pause. Move under an enemy so shots connect.' },
  { start: 6.3, title: '3 · BUILD POINTS', text: 'A grunt gives +100. A quick second kill adds +125: a 2-kill combo with a 1.25× bonus.' },
  { start: 8.5, title: '4 · COLLECT A SHIELD', text: 'This practice drop is guaranteed. In a real run, enemy shield drops are random—not bought with points.' },
  { start: 12.6, title: '5 · BLOCK ONE HIT', text: 'The shield absorbs one orange shot without losing a life. It also expires after 4 seconds.' },
  { start: 16, title: '6 · WEAR DOWN THE BOSS', text: 'Time-lapse: the boss has 100 HP. Many hits chip its bar; boss hits do not score points.' },
  { start: 19.5, title: '7 · DODGE & REALIGN', text: 'Dodge orange volleys, then shoot again. The 0/8 counter tracks normal kills, not boss HP.' },
  { start: 23.5, title: '8 · CLEAR THE STAGES', text: 'Boss defeated: +1,000 points. Clear all three stages to win the game.' },
]);

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const mix = (a, b, u) => a + (b - a) * clamp(u, 0, 1);
const progress = (time, start, end) => clamp((time - start) / (end - start), 0, 1);

export function demoStepIndex(seconds) {
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, DEMO_DURATION);
  for (let index = DEMO_STEPS.length - 1; index >= 0; index--) {
    if (time >= DEMO_STEPS[index].start) return index;
  }
  return 0;
}

function playerCenter(time, width) {
  if (time < 5.1) return mix(width * 0.23, width * 0.56, progress(time, 0, 5.1));
  if (time < 6.7) return mix(width * 0.56, width * 0.68, progress(time, 6.3, 6.7));
  if (time < 17) return mix(width * 0.68, width * 0.5, progress(time, 16, 17));
  if (time < 20.1) return mix(width * 0.5, width * 0.78, progress(time, 19.4, 20.1));
  return mix(width * 0.78, width * 0.5, progress(time, 20.6, 21.2));
}

function upwardBullet(shotAt, time, width, playerY, targetY, index) {
  if (time < shotAt) return null;
  const speed = (playerY - targetY) / 1.1;
  const y = playerY - 8 - (time - shotAt) * speed;
  if (y < -20) return null;
  return { id: `demo-player-${index}`, x: playerCenter(shotAt, width) - 2, y,
    width: 4, height: 14, vx: 0, vy: -speed, speed };
}

function bossHp(time) {
  if (time < 17.75) return 100; // First shown shot has to reach the boss before the bar changes.
  if (time < 19.5) return Math.max(58, Math.ceil(mix(100, 58, progress(time, 17.75, 19.5))));
  if (time < 20.6) return 58; // A short dodge window: damage does not rise by itself.
  return Math.max(0, Math.ceil(mix(58, 0, progress(time, 20.6, 23.5))));
}

export function getDemoFrame(seconds, width, height) {
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, DEMO_DURATION);
  const w = Math.max(240, Number.isFinite(width) ? width : 360);
  const h = Math.max(250, Number.isFinite(height) ? height : 440);
  const playerY = h - 58;
  const enemyY = Math.max(108, h * 0.28);
  const cx = playerCenter(time, w);
  const shield = time >= 12.1 && time < 15.1;
  const enemies = [];
  if (time < 6.3) enemies.push({ id: 'practice-grunt-1', type: 'grunt', hp: 1, size: 24,
    x: w * 0.56 - 12, y: enemyY });
  if (time >= 6.3 && time < 7.75) enemies.push({ id: 'practice-grunt-2', type: 'grunt', hp: 1, size: 24,
    x: w * 0.68 - 12, y: enemyY });
  if (time >= 12.6 && time < 15.1) enemies.push({ id: 'practice-shooter', type: 'shooter', hp: 2,
    canShoot: true, size: 26, x: w * 0.68 - 13, y: enemyY });

  const powerups = time >= 8.5 && time < 12.1 ? [{ id: 'practice-shield', kind: 'shield', size: 20,
    x: w * 0.68 - 10, y: mix(enemyY + 18, playerY - 10, progress(time, 8.5, 12.1)) }] : [];

  const earlyShots = [3.4, 3.9, 4.35, 5.1, 6.65];
  const bossShots = Array.from({ length: 40 }, (_, index) => 16.65 + index * 0.17)
    .filter(shotAt => shotAt < 23.35 && (shotAt < 19.35 || shotAt > 20.9));
  const shots = [...earlyShots, ...bossShots];
  const bullets = shots.map((shotAt, index) => upwardBullet(shotAt, time, w, playerY, enemyY, index))
    .filter(Boolean)
    .filter(bullet => time < 16 || bullet.id.startsWith('demo-player-') && Number(bullet.id.slice(12)) >= earlyShots.length)
    .slice(-8);

  const enemyBullets = [];
  if (time >= 13.4 && time < 15.1) {
    const y = mix(enemyY + 29, playerY - 10, progress(time, 13.4, 15.1));
    enemyBullets.push({ id: 'practice-blocked', x: w * 0.68 - 2, y, width: 4, height: 14, vx: 0, vy: 160, speed: 160 });
  }
  if (time >= 19 && time < 20.7) {
    const age = time - 19;
    const speed = (playerY - enemyY - 52) / 1.1;
    for (let index = -2; index <= 2; index++) {
      const x = w * 0.5 + index * 21 * age;
      const y = enemyY + 52 + age * speed;
      if (y < h - 12) enemyBullets.push({ id: `practice-volley-${index}`, x: x - 2, y,
        width: 4, height: 14, vx: index * 21, vy: speed, speed });
    }
  }

  const hp = bossHp(time);
  const boss = time >= 16 && time < 24.4 ? {
    x: w * 0.5 - 40, y: enemyY, width: 80, height: 60,
    hp, maxHp: 100, alive: time < 23.5,
    encounterState: time >= 23.5 ? 'DYING' : time >= 18.5 && time < 19 ? 'TELEGRAPHING' : 'READY',
    telegraph: progress(time, 18.5, 19), attackFamily: 'radial',
    phaseIndex: hp > 70 ? 0 : hp > 40 ? 1 : 2,
    deathElapsed: Math.max(0, time - 23.5),
  } : null;

  return {
    time, stepIndex: demoStepIndex(time), done: time >= DEMO_DURATION,
    player: { x: cx - 20, y: playerY, width: 40, height: 22, shield, alive: true },
    enemies, powerups, bullets, enemyBullets, boss,
    score: time >= 23.5 ? 1225 : time >= 7.75 ? 225 : time >= 6.3 ? 100 : 0,
    kills: time >= 7.75 ? 2 : time >= 6.3 ? 1 : 0,
    lives: 5, shield,
    popup: time >= 23.5 && time < 25.4 ? '+1,000 BOSS!' :
      time >= 7.75 && time < 9.4 ? '+125 · 2-KILL COMBO' :
      time >= 6.3 && time < 7.1 ? '+100' :
      time >= 15.1 && time < 16 ? 'BLOCKED!' : null,
  };
}
