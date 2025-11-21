export const POWERUP_TYPES = {
  DOUBLE_SHOT: 'double',
  TRIPLE_SHOT: 'triple',
  SPREAD_SHOT: 'spread',
  RAPID_FIRE: 'rapid'
};

export const POWERUP_DURATION = {
  [POWERUP_TYPES.DOUBLE_SHOT]: 10,
  [POWERUP_TYPES.TRIPLE_SHOT]: 10,
  [POWERUP_TYPES.SPREAD_SHOT]: 10,
  [POWERUP_TYPES.RAPID_FIRE]: 10
};

export function createPowerup(x, y, kind = null) {
  const kinds = [
    POWERUP_TYPES.DOUBLE_SHOT,
    POWERUP_TYPES.TRIPLE_SHOT,
    POWERUP_TYPES.SPREAD_SHOT,
    POWERUP_TYPES.RAPID_FIRE
  ];
  
  return {
    x,
    y,
    kind: kind || kinds[Math.floor(Math.random() * kinds.length)],
    size: 20,
    speed: 70,
    rotation: 0,
    collected: false
  };
}

export function updatePowerup(powerup, dt) {
  return {
    ...powerup,
    y: powerup.y + powerup.speed * dt,
    rotation: powerup.rotation + dt * 2
  };
}

export function applyPowerupEffect(player, powerupKind) {
  const updates = { ...player };
  
  if (powerupKind === POWERUP_TYPES.DOUBLE_SHOT) {
    updates.weaponLevel = Math.max(2, Math.min(3, updates.weaponLevel + 1));
    updates.weaponType = POWERUP_TYPES.DOUBLE_SHOT;
  } else if (powerupKind === POWERUP_TYPES.TRIPLE_SHOT) {
    updates.weaponLevel = 3;
    updates.weaponType = POWERUP_TYPES.TRIPLE_SHOT;
  } else if (powerupKind === POWERUP_TYPES.SPREAD_SHOT) {
    updates.weaponLevel = 3;
    updates.weaponType = POWERUP_TYPES.SPREAD_SHOT;
  } else if (powerupKind === POWERUP_TYPES.RAPID_FIRE) {
    updates.rapidFire = true;
    updates.fireCooldown = 0.12;
  }
  
  return updates;
}

export function getPowerupColor(kind) {
  const colors = {
    [POWERUP_TYPES.DOUBLE_SHOT]: '#38bdf8',
    [POWERUP_TYPES.TRIPLE_SHOT]: '#22c55e',
    [POWERUP_TYPES.SPREAD_SHOT]: '#a855f7',
    [POWERUP_TYPES.RAPID_FIRE]: '#f97316'
  };
  return colors[kind] || '#e5e7eb';
}

