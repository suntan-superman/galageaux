/**
 * powerups.js - Powerup System
 * 
 * Defines and manages weapon powerups that drop from defeated enemies.
 * Each powerup temporarily enhances player weapons.
 * 
 * @module powerups
 */

/**
 * Available powerup types
 * @enum {string}
 */
export const POWERUP_TYPES = {
  /** Fires two bullets side by side */
  DOUBLE_SHOT: 'double',
  /** Fires three bullets in a slight spread */
  TRIPLE_SHOT: 'triple',
  /** Fires five bullets in a wide spread pattern */
  SPREAD_SHOT: 'spread',
  /** Reduces fire cooldown significantly */
  RAPID_FIRE: 'rapid'
};

/**
 * Duration in seconds for each powerup effect
 * @constant {Object.<string, number>}
 */
export const POWERUP_DURATION = {
  [POWERUP_TYPES.DOUBLE_SHOT]: 10,
  [POWERUP_TYPES.TRIPLE_SHOT]: 10,
  [POWERUP_TYPES.SPREAD_SHOT]: 10,
  [POWERUP_TYPES.RAPID_FIRE]: 10
};

/**
 * @typedef {Object} Powerup
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {string} kind - Powerup type from POWERUP_TYPES
 * @property {number} size - Hitbox size in pixels
 * @property {number} speed - Fall speed in pixels/second
 * @property {number} rotation - Current rotation in radians
 * @property {boolean} collected - Whether the powerup has been collected
 */

/**
 * Create a new powerup at the given position
 * @param {number} x - X position (usually enemy death location)
 * @param {number} y - Y position
 * @param {string|null} [kind=null] - Specific powerup type, or random if null
 * @returns {Powerup} New powerup object
 */
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

/**
 * Update powerup position (falling and rotating)
 * @param {Powerup} powerup - Powerup to update
 * @param {number} dt - Delta time in seconds
 * @returns {Powerup} Updated powerup (new object)
 */
export function updatePowerup(powerup, dt) {
  return {
    ...powerup,
    y: powerup.y + powerup.speed * dt,
    rotation: powerup.rotation + dt * 2
  };
}

/**
 * Apply powerup effect to player state
 * @param {Object} player - Current player state
 * @param {string} powerupKind - Type of powerup collected
 * @returns {Object} Updated player state with powerup applied
 */
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

/**
 * Get display color for a powerup type
 * @param {string} kind - Powerup type
 * @returns {string} Hex color string
 */
export function getPowerupColor(kind) {
  const colors = {
    [POWERUP_TYPES.DOUBLE_SHOT]: '#38bdf8',  // Blue
    [POWERUP_TYPES.TRIPLE_SHOT]: '#22c55e',  // Green
    [POWERUP_TYPES.SPREAD_SHOT]: '#a855f7',  // Purple
    [POWERUP_TYPES.RAPID_FIRE]: '#f97316'    // Orange
  };
  return colors[kind] || '#e5e7eb';
}

