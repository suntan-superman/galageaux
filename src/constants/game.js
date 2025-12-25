/**
 * Game Constants
 * Centralized configuration for all game parameters
 * 
 * Organization:
 * - PLAYER: Player ship properties
 * - BULLET: Projectile settings
 * - ENEMY: Enemy properties
 * - BOSS: Boss fight parameters
 * - POWERUP: Power-up behavior
 * - GAMEPLAY: Core gameplay mechanics
 * - VISUAL: Visual effects and animations
 * - AUDIO: Audio timing and volumes
 * - UI: HUD and overlay settings
 */

// =====================================================
// PLAYER CONFIGURATION
// =====================================================
export const PLAYER = {
  // Movement
  SPEED: 400,                    // Base movement speed (pixels/sec)
  TILT_SENSITIVITY_DEFAULT: 1.5, // Default tilt control sensitivity
  TILT_SENSITIVITY_MIN: 0.5,
  TILT_SENSITIVITY_MAX: 3.0,
  
  // Combat
  FIRE_COOLDOWN: 0.15,           // Seconds between shots (normal)
  RAPID_FIRE_COOLDOWN: 0.08,     // Seconds between shots (rapid fire)
  STARTING_LIVES: 5,
  WEAPON_LEVEL_MAX: 3,
  
  // Invincibility
  HIT_INVINCIBILITY_DURATION: 1.5, // Seconds of invincibility after hit
  
  // Visual
  SHIP_GLOW_RADIUS: 12,
  FLAME_LENGTH_BASE: 20,
  FLAME_LENGTH_VARIANCE: 8,
  FLAME_WIDTH_BASE: 8,
  FLAME_WIDTH_VARIANCE: 2,
  HIT_FLASH_DURATION: 0.3        // Seconds of red flash when hit
};

// =====================================================
// BULLET CONFIGURATION
// =====================================================
export const BULLET = {
  // Player bullets
  PLAYER_SPEED: 800,             // Pixels per second
  PLAYER_SPEED_SPREAD: 420,      // Speed for spread weapon bullets
  
  // Enemy bullets
  ENEMY_BASE_SPEED: 230,
  
  // Spread weapon
  SPREAD_ANGLES: [-0.3, -0.15, 0, 0.15, 0.3], // Radians
  
  // Visual
  TRAIL_LENGTH: 3,
  GLOW_RADIUS: 4
};

// =====================================================
// ENEMY CONFIGURATION
// =====================================================
export const ENEMY = {
  // Spawning
  SPAWN_PADDING: 20,             // Pixels from screen edge
  SPAWN_Y_OFFSET: -40,           // Pixels above screen
  
  // Combat
  FIRE_CHANCE_BASE: 0.0015,      // Per-frame chance to fire
  FIRE_CHANCE_BONUS: 0.00008,    // Additional chance per level
  
  // Formation
  V_FORMATION_COUNT: 5,
  LINE_FORMATION_COUNT: 5,
  
  // Scoring
  BASE_POINTS: 100,
  COMBO_BONUS_MULTIPLIER: 10,    // Points per combo level
  
  // Swooping behavior
  SWOOP_CHANCE: 0.0005           // Per-frame chance to start swoop
};

// =====================================================
// BOSS CONFIGURATION
// =====================================================
export const BOSS = {
  // Combat
  FIRE_COOLDOWN: 1.1,            // Seconds between attacks
  DEFEAT_POINTS: 1000,
  
  // Visual
  EXPLOSION_RADIUS: 80,
  EXPLOSION_DURATION: 0.6,
  PARTICLE_COUNT: 50,
  DEBRIS_COUNT: 30,
  
  // Screen shake on appear/death
  APPEAR_SHAKE_INTENSITY: 12,
  APPEAR_SHAKE_DURATION: 0.4,
  DEATH_SHAKE_INTENSITY: 14,
  DEATH_SHAKE_DURATION: 0.6,
  
  // Stage transition
  STAGE_TRANSITION_DELAY: 2000   // Milliseconds before next stage
};

// =====================================================
// POWERUP CONFIGURATION
// =====================================================
export const POWERUP = {
  // Drop chance (per enemy kill)
  DROP_CHANCE: 0.10,             // 10% base chance
  BOSS_DROP_GUARANTEED: true,
  
  // Movement
  FALL_SPEED: 100,               // Pixels per second
  DRIFT_AMPLITUDE: 30,           // Horizontal drift pixels
  DRIFT_SPEED: 2,                // Drift oscillation speed
  
  // Duration
  SHIELD_DURATION: 8000,         // Milliseconds
  RAPID_FIRE_DURATION: 6000,
  SPREAD_DURATION: 8000,
  
  // Types and weights
  TYPES: ['shield', 'rapid', 'spread', 'weapon', 'life'],
  WEIGHTS: {
    shield: 0.25,
    rapid: 0.25,
    spread: 0.2,
    weapon: 0.2,
    life: 0.1
  }
};

// =====================================================
// GAMEPLAY MECHANICS
// =====================================================
export const GAMEPLAY = {
  // Entity Limits (Performance)
  // These prevent unbounded memory growth during extended play
  MAX_PARTICLES: 300,            // Max concurrent particles
  MAX_EXPLOSIONS: 20,            // Max concurrent explosions
  MAX_PLAYER_BULLETS: 100,       // Max player bullets on screen
  MAX_ENEMY_BULLETS: 150,        // Max enemy bullets on screen
  MAX_ENEMIES: 60,               // Max enemies on screen
  MAX_POWERUPS: 10,              // Max powerups on screen
  MAX_SCORE_TEXTS: 30,           // Max floating score texts
  
  // Combo system
  COMBO_TIMEOUT: 2.0,            // Seconds to maintain combo
  COMBO_MASTER_THRESHOLD: 10,    // For achievement
  COMBO_GOD_THRESHOLD: 25,       // For achievement
  
  // Level progression
  LEVEL_TARGETS: {
    1: 4,   // Easier start
    2: 6,
    3: 8,
    default: (level) => 6 + level * 3
  },
  
  // Bonus round
  BONUS_ROUND_INTERVAL: 5,       // Every N levels
  BONUS_ROUND_DURATION: 15,      // Seconds
  BONUS_SPAWN_INTERVAL: 0.4,     // Seconds between spawns
  
  // Difficulty scaling
  DIFFICULTY_MULTIPLIERS: {
    easy: 0.7,
    normal: 1.0,
    hard: 1.3
  },
  
  // Score thresholds (for achievements)
  SCORE_CHASER: 50000,
  SCORE_KING: 100000
};

// =====================================================
// VISUAL EFFECTS
// =====================================================
export const VISUAL = {
  // Starfield
  STAR_COUNT: 100,
  STAR_COLORS: ['56,189,248', '248,250,252', '244,114,182'],
  STAR_LAYERS: {
    far: { speed: [15, 40], size: [0.8, 1.8] },
    mid: { speed: [40, 80], size: [1.2, 2.7] },
    near: { speed: [80, 140], size: [2, 4] }
  },
  STAR_SCROLL_SPEED: 1.0,
  
  // Nebula background
  NEBULA_PULSE_MIN: 0.25,
  NEBULA_PULSE_VARIANCE: 0.2,
  NEBULA_PULSE_SPEED: 1500,      // Milliseconds per cycle
  
  // Particles
  EXPLOSION_PARTICLES: 12,
  IMPACT_SPARK_COUNT: 6,
  PARTICLE_GRAVITY: 200,
  
  // Screen shake
  SHAKE_DECAY: 0.9,              // Per-frame multiplier
  
  // Animations
  HUD_PULSE_SCALE: 0.08,         // Scale increase on pulse
  SCORE_TEXT_LIFETIME: 1.5,      // Seconds floating score displays
  LEVEL_BANNER_DURATION: 2.0,    // Seconds level announcement shows
  
  // Colors
  COLORS: {
    player: '#38bdf8',
    playerGlow: '#0ea5e9',
    shield: '#22c55e',
    damage: '#f87171',
    boss: '#a855f7',
    powerupShield: '#22c55e',
    powerupRapid: '#fbbf24',
    powerupSpread: '#3b82f6',
    powerupWeapon: '#a855f7',
    powerupLife: '#f43f5e',
    combo: '#fbbf24',
    score: '#38bdf8'
  }
};

// =====================================================
// AUDIO SETTINGS
// =====================================================
export const AUDIO = {
  // Default volumes
  SOUND_VOLUME_DEFAULT: 0.7,
  MUSIC_VOLUME_DEFAULT: 0.5,
  
  // Sound effect volumes (relative multipliers)
  VOLUMES: {
    playerShoot: 0.5,
    playerShootRapid: 0.4,
    playerShootSpread: 0.5,
    enemyHit: 0.4,
    enemyDestroy: 0.6,
    powerupCollect: 0.7,
    playerHit: 0.8,
    playerDeath: 0.9,
    bossAppear: 0.9,
    bossDeath: 0.8,
    uiClick: 0.6,
    levelUp: 0.7,
    shieldActivate: 0.6,
    comboIncrease: 0.4
  }
};

// =====================================================
// UI CONFIGURATION
// =====================================================
export const UI = {
  // HUD
  HUD_TOP_PADDING: 40,
  HUD_SIDE_PADDING: 16,
  
  // Fire button
  FIRE_BUTTON_SIZE: 80,
  FIRE_BUTTON_BOTTOM_OFFSET: 100,
  FIRE_BUTTON_SIDE_OFFSET: 40,
  
  // Overlays
  OVERLAY_ANIMATION_DURATION: 300, // Milliseconds
  
  // Toast notifications
  TOAST_DURATION: 3000,          // Milliseconds
  ACHIEVEMENT_TOAST_DURATION: 4000
};

// =====================================================
// STORAGE KEYS
// =====================================================
export const STORAGE_KEYS = {
  TILT_SENSITIVITY: 'galageaux:tiltSensitivity',
  FIRE_BUTTON_POSITION: 'galageaux:fireButtonPosition',
  AUDIO_SETTINGS: 'galageaux:audioSettings',
  ACHIEVEMENTS: 'galageaux:achievements',
  STATS: 'galageaux:stats',
  HIGH_SCORES: 'galageaux:highScores',
  SETTINGS: 'galageaux:settings'
};

// =====================================================
// STAGE CONFIGURATION
// =====================================================
export const STAGES = ['stage1', 'stage2', 'stage3'];

export const STAGE_NAMES = {
  stage1: 'Orbit Siege',
  stage2: 'Nebula Assault',
  stage3: 'Asteroid Field'
};

// Export all as default for convenient access
export default {
  PLAYER,
  BULLET,
  ENEMY,
  BOSS,
  POWERUP,
  GAMEPLAY,
  VISUAL,
  AUDIO,
  UI,
  STORAGE_KEYS,
  STAGES,
  STAGE_NAMES
};
