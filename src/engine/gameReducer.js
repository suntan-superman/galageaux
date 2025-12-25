/**
 * gameReducer.js - Consolidated Game State Management
 * 
 * Combines frequently-updated game state into a single reducer to enable
 * batched updates and reduce re-renders during the game loop.
 * 
 * Benefits:
 * - Single state update per frame instead of 10+ setState calls
 * - Predictable state transitions via actions
 * - Easier debugging with action history
 * - Better performance in requestAnimationFrame callbacks
 * 
 * @module gameReducer
 */

/**
 * @typedef {Object} GameState
 * @property {Object} player - Player state (position, health, weapons)
 * @property {Array} bullets - Player bullet entities
 * @property {Array} enemyBullets - Enemy bullet entities
 * @property {Array} enemies - Enemy entities
 * @property {Array} explosions - Explosion effects
 * @property {Array} particles - Particle effects
 * @property {Array} powerups - Powerup items
 * @property {Object|null} boss - Current boss entity
 * @property {number} score - Current score
 * @property {Array} scoreTexts - Floating score text displays
 * @property {number} combo - Current combo count
 * @property {number} comboTimer - Time remaining for combo
 * @property {Array} muzzleFlashes - Muzzle flash effects
 * @property {number} playerHitFlash - Player hit flash intensity
 * @property {number} hudPulse - HUD pulse effect intensity
 */

/**
 * Action types for game state updates
 */
export const GAME_ACTIONS = {
  // Batch update - the main action for frame updates
  FRAME_UPDATE: 'FRAME_UPDATE',
  
  // Individual updates for specific events
  SET_PLAYER: 'SET_PLAYER',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  ADD_BULLETS: 'ADD_BULLETS',
  ADD_ENEMY_BULLETS: 'ADD_ENEMY_BULLETS',
  ADD_ENEMIES: 'ADD_ENEMIES',
  ADD_EXPLOSION: 'ADD_EXPLOSION',
  ADD_PARTICLES: 'ADD_PARTICLES',
  ADD_POWERUP: 'ADD_POWERUP',
  SET_BOSS: 'SET_BOSS',
  ADD_SCORE: 'ADD_SCORE',
  ADD_SCORE_TEXT: 'ADD_SCORE_TEXT',
  INCREMENT_COMBO: 'INCREMENT_COMBO',
  RESET_COMBO: 'RESET_COMBO',
  ADD_MUZZLE_FLASH: 'ADD_MUZZLE_FLASH',
  TRIGGER_HIT_FLASH: 'TRIGGER_HIT_FLASH',
  TRIGGER_HUD_PULSE: 'TRIGGER_HUD_PULSE',
  
  // Reset actions
  RESET_GAME: 'RESET_GAME',
  CLEAR_ENTITIES: 'CLEAR_ENTITIES'
};

/**
 * Create initial game state
 * @param {number} width - Screen width for player positioning
 * @param {number} height - Screen height for player positioning
 * @param {Object} playerConfig - Player configuration (width, height)
 * @returns {GameState} Initial game state
 */
export function createInitialGameState(width, height, playerConfig) {
  const { PLAYER_WIDTH, PLAYER_HEIGHT } = playerConfig;
  
  return {
    player: {
      x: width / 2 - PLAYER_WIDTH / 2,
      y: height * 0.8,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      alive: true,
      lives: 5,
      weaponLevel: 1,
      weaponType: null,
      shield: false,
      rapidFire: false
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    explosions: [],
    particles: [],
    powerups: [],
    boss: null,
    score: 0,
    scoreTexts: [],
    combo: 0,
    comboTimer: 0,
    muzzleFlashes: [],
    playerHitFlash: 0,
    hudPulse: 0
  };
}

/**
 * Game state reducer
 * Handles all game state transitions via actions
 * 
 * @param {GameState} state - Current game state
 * @param {Object} action - Action object with type and payload
 * @returns {GameState} New game state
 */
export function gameReducer(state, action) {
  switch (action.type) {
    
    // ═══════════════════════════════════════════════════════════════════
    // FRAME_UPDATE: Main batch update for game loop
    // This replaces 10+ individual setState calls with a single dispatch
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.FRAME_UPDATE: {
      const {
        bullets,
        enemyBullets,
        enemies,
        explosions,
        particles,
        powerups,
        boss,
        scoreGain = 0,
        scoreTexts,
        muzzleFlashes,
        playerHitFlash,
        hudPulse,
        comboTimer,
        combo
      } = action.payload;
      
      return {
        ...state,
        bullets: bullets ?? state.bullets,
        enemyBullets: enemyBullets ?? state.enemyBullets,
        enemies: enemies ?? state.enemies,
        explosions: explosions ?? state.explosions,
        particles: particles ?? state.particles,
        powerups: powerups ?? state.powerups,
        boss: boss !== undefined ? boss : state.boss,
        score: scoreGain > 0 ? state.score + scoreGain : state.score,
        scoreTexts: scoreTexts ?? state.scoreTexts,
        muzzleFlashes: muzzleFlashes ?? state.muzzleFlashes,
        playerHitFlash: playerHitFlash ?? state.playerHitFlash,
        hudPulse: hudPulse ?? state.hudPulse,
        comboTimer: comboTimer ?? state.comboTimer,
        combo: combo ?? state.combo
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // Player updates
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.SET_PLAYER:
      return { ...state, player: action.payload };
      
    case GAME_ACTIONS.UPDATE_PLAYER:
      return { ...state, player: { ...state.player, ...action.payload } };
    
    // ═══════════════════════════════════════════════════════════════════
    // Entity additions (for spawning during gameplay events)
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.ADD_BULLETS:
      return { ...state, bullets: [...state.bullets, ...action.payload] };
      
    case GAME_ACTIONS.ADD_ENEMY_BULLETS:
      return { ...state, enemyBullets: [...state.enemyBullets, ...action.payload] };
      
    case GAME_ACTIONS.ADD_ENEMIES:
      return { ...state, enemies: [...state.enemies, ...action.payload] };
      
    case GAME_ACTIONS.ADD_EXPLOSION:
      return { ...state, explosions: [...state.explosions, action.payload] };
      
    case GAME_ACTIONS.ADD_PARTICLES:
      return { ...state, particles: [...state.particles, ...action.payload] };
      
    case GAME_ACTIONS.ADD_POWERUP:
      return { ...state, powerups: [...state.powerups, action.payload] };
    
    // ═══════════════════════════════════════════════════════════════════
    // Boss updates
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.SET_BOSS:
      return { ...state, boss: action.payload };
    
    // ═══════════════════════════════════════════════════════════════════
    // Score and combo
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.ADD_SCORE:
      return { ...state, score: state.score + action.payload };
      
    case GAME_ACTIONS.ADD_SCORE_TEXT:
      return { ...state, scoreTexts: [...state.scoreTexts, action.payload] };
      
    case GAME_ACTIONS.INCREMENT_COMBO:
      return { 
        ...state, 
        combo: state.combo + 1,
        comboTimer: action.payload.duration || 2
      };
      
    case GAME_ACTIONS.RESET_COMBO:
      return { ...state, combo: 0, comboTimer: 0 };
    
    // ═══════════════════════════════════════════════════════════════════
    // Visual effects
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.ADD_MUZZLE_FLASH:
      return { ...state, muzzleFlashes: [...state.muzzleFlashes, action.payload] };
      
    case GAME_ACTIONS.TRIGGER_HIT_FLASH:
      return { ...state, playerHitFlash: action.payload || 1 };
      
    case GAME_ACTIONS.TRIGGER_HUD_PULSE:
      return { ...state, hudPulse: action.payload || 1 };
    
    // ═══════════════════════════════════════════════════════════════════
    // Reset actions
    // ═══════════════════════════════════════════════════════════════════
    case GAME_ACTIONS.RESET_GAME:
      return createInitialGameState(
        action.payload.width,
        action.payload.height,
        action.payload.playerConfig
      );
      
    case GAME_ACTIONS.CLEAR_ENTITIES:
      return {
        ...state,
        bullets: [],
        enemyBullets: [],
        enemies: [],
        explosions: [],
        particles: [],
        powerups: [],
        boss: null
      };
    
    default:
      console.warn(`Unknown game action: ${action.type}`);
      return state;
  }
}

/**
 * Helper to create a frame update action
 * Groups all per-frame state changes into a single action
 * 
 * @param {Object} updates - Object containing state updates
 * @returns {Object} Action object for dispatch
 */
export function createFrameUpdate(updates) {
  return {
    type: GAME_ACTIONS.FRAME_UPDATE,
    payload: updates
  };
}

/**
 * Calculate UI timer decays for a frame
 * @param {GameState} state - Current state
 * @param {number} dt - Delta time in seconds
 * @returns {Object} Updated timer values
 */
export function decayUITimers(state, dt) {
  return {
    playerHitFlash: state.playerHitFlash > 0 
      ? Math.max(0, state.playerHitFlash - dt * 2.5) 
      : 0,
    hudPulse: state.hudPulse > 0 
      ? Math.max(0, state.hudPulse - dt * 2) 
      : 0,
    muzzleFlashes: state.muzzleFlashes
      .map(mf => ({ ...mf, life: mf.life - dt }))
      .filter(mf => mf.life > 0),
    comboTimer: Math.max(0, state.comboTimer - dt),
    combo: state.comboTimer > 0 && state.comboTimer - dt <= 0 
      ? 0 
      : state.combo
  };
}

/**
 * Update score texts (float up and fade)
 * @param {Array} scoreTexts - Current score texts
 * @param {number} dt - Delta time in seconds
 * @returns {Array} Updated score texts
 */
export function updateScoreTexts(scoreTexts, dt) {
  return scoreTexts
    .map(st => ({ ...st, y: st.y - dt * 50, life: st.life - dt }))
    .filter(st => st.life > 0);
}
