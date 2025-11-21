import bossConfig from '../config/boss.json';

export function createBoss(stageKey, width) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return null;
  return {
    hp: cfg.hp,
    maxHp: cfg.hp,
    x: width / 2 - 40,
    y: -120,
    width: 80,
    height: 60,
    targetY: cfg.enterY,
    speed: cfg.speed,
    phaseIndex: 0,
    fireCooldown: 1.2,
    alive: true
  };
}

export function updateBoss(boss, dt, stageKey) {
  if (!boss) return null;
  const cfg = bossConfig[stageKey];
  if (!cfg) return boss;

  if (boss.y < boss.targetY) {
    boss.y += boss.speed * dt;
  } else {
    boss.x += Math.sin(Date.now() / 600) * 20 * dt;
  }

  boss.fireCooldown -= dt;
  return boss;
}

export function bossCurrentPattern(boss, stageKey) {
  const cfg = bossConfig[stageKey];
  if (!cfg) return 'radial';
  const hpRatio = boss.hp / boss.maxHp;
  for (const phase of cfg.phases) {
    if (hpRatio * 100 > phase.hpThreshold) {
      return phase.pattern;
    }
  }
  return cfg.phases[cfg.phases.length - 1].pattern;
}
