/**
 * gameReducer.test.js - Tests for Game State Reducer
 */

import {
  gameReducer,
  createInitialGameState,
  createFrameUpdate,
  decayUITimers,
  updateScoreTexts,
  GAME_ACTIONS
} from '../../engine/gameReducer';

describe('Game Reducer', () => {
  const mockPlayerConfig = {
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 48
  };
  
  let initialState;
  
  beforeEach(() => {
    initialState = createInitialGameState(400, 800, mockPlayerConfig);
  });
  
  describe('createInitialGameState', () => {
    it('should create initial state with correct player position', () => {
      const state = createInitialGameState(400, 800, mockPlayerConfig);
      
      expect(state.player.x).toBe(400 / 2 - 40 / 2); // 180
      expect(state.player.y).toBe(800 * 0.8); // 640
      expect(state.player.alive).toBe(true);
      expect(state.player.lives).toBe(5);
    });
    
    it('should create empty entity arrays', () => {
      const state = createInitialGameState(400, 800, mockPlayerConfig);
      
      expect(state.bullets).toEqual([]);
      expect(state.enemyBullets).toEqual([]);
      expect(state.enemies).toEqual([]);
      expect(state.explosions).toEqual([]);
      expect(state.particles).toEqual([]);
      expect(state.powerups).toEqual([]);
    });
    
    it('should initialize score and combo to zero', () => {
      const state = createInitialGameState(400, 800, mockPlayerConfig);
      
      expect(state.score).toBe(0);
      expect(state.combo).toBe(0);
      expect(state.comboTimer).toBe(0);
    });
    
    it('should initialize visual effects to zero', () => {
      const state = createInitialGameState(400, 800, mockPlayerConfig);
      
      expect(state.playerHitFlash).toBe(0);
      expect(state.hudPulse).toBe(0);
      expect(state.muzzleFlashes).toEqual([]);
    });
  });
  
  describe('FRAME_UPDATE action', () => {
    it('should update all entity arrays', () => {
      const bullets = [{ id: 1, x: 100, y: 100 }];
      const enemies = [{ id: 2, x: 200, y: 200 }];
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { bullets, enemies }
      });
      
      expect(newState.bullets).toEqual(bullets);
      expect(newState.enemies).toEqual(enemies);
    });
    
    it('should add score gain', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { scoreGain: 100 }
      });
      
      expect(newState.score).toBe(100);
    });
    
    it('should accumulate score over multiple updates', () => {
      let state = initialState;
      
      state = gameReducer(state, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { scoreGain: 100 }
      });
      
      state = gameReducer(state, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { scoreGain: 50 }
      });
      
      expect(state.score).toBe(150);
    });
    
    it('should preserve unchanged values', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { bullets: [{ id: 1 }] }
      });
      
      // Unchanged values should be preserved
      expect(newState.enemies).toEqual([]);
      expect(newState.player).toEqual(initialState.player);
    });
    
    it('should update boss state', () => {
      const boss = { id: 'boss1', health: 100 };
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { boss }
      });
      
      expect(newState.boss).toEqual(boss);
    });
    
    it('should handle null boss (boss defeated)', () => {
      const stateWithBoss = { ...initialState, boss: { id: 'boss1' } };
      
      const newState = gameReducer(stateWithBoss, {
        type: GAME_ACTIONS.FRAME_UPDATE,
        payload: { boss: null }
      });
      
      expect(newState.boss).toBeNull();
    });
  });
  
  describe('Player actions', () => {
    it('should set player with SET_PLAYER', () => {
      const newPlayer = { ...initialState.player, lives: 3 };
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.SET_PLAYER,
        payload: newPlayer
      });
      
      expect(newState.player.lives).toBe(3);
    });
    
    it('should partially update player with UPDATE_PLAYER', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.UPDATE_PLAYER,
        payload: { x: 100, shield: true }
      });
      
      expect(newState.player.x).toBe(100);
      expect(newState.player.shield).toBe(true);
      expect(newState.player.lives).toBe(5); // Preserved
    });
  });
  
  describe('Entity addition actions', () => {
    it('should add bullets', () => {
      const bullets = [{ id: 1 }, { id: 2 }];
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_BULLETS,
        payload: bullets
      });
      
      expect(newState.bullets).toHaveLength(2);
    });
    
    it('should add enemies', () => {
      const enemies = [{ id: 1, type: 'basic' }];
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_ENEMIES,
        payload: enemies
      });
      
      expect(newState.enemies).toHaveLength(1);
    });
    
    it('should add explosion', () => {
      const explosion = { id: 1, x: 100, y: 100 };
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_EXPLOSION,
        payload: explosion
      });
      
      expect(newState.explosions).toHaveLength(1);
      expect(newState.explosions[0]).toEqual(explosion);
    });
    
    it('should add particles', () => {
      const particles = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_PARTICLES,
        payload: particles
      });
      
      expect(newState.particles).toHaveLength(3);
    });
  });
  
  describe('Score and combo actions', () => {
    it('should add score', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_SCORE,
        payload: 500
      });
      
      expect(newState.score).toBe(500);
    });
    
    it('should add score text', () => {
      const scoreText = { x: 100, y: 100, text: '+100', life: 1 };
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_SCORE_TEXT,
        payload: scoreText
      });
      
      expect(newState.scoreTexts).toHaveLength(1);
    });
    
    it('should increment combo', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.INCREMENT_COMBO,
        payload: { duration: 2 }
      });
      
      expect(newState.combo).toBe(1);
      expect(newState.comboTimer).toBe(2);
    });
    
    it('should reset combo', () => {
      const stateWithCombo = { ...initialState, combo: 5, comboTimer: 1.5 };
      
      const newState = gameReducer(stateWithCombo, {
        type: GAME_ACTIONS.RESET_COMBO
      });
      
      expect(newState.combo).toBe(0);
      expect(newState.comboTimer).toBe(0);
    });
  });
  
  describe('Visual effect actions', () => {
    it('should trigger hit flash', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.TRIGGER_HIT_FLASH,
        payload: 1
      });
      
      expect(newState.playerHitFlash).toBe(1);
    });
    
    it('should trigger HUD pulse', () => {
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.TRIGGER_HUD_PULSE,
        payload: 1
      });
      
      expect(newState.hudPulse).toBe(1);
    });
    
    it('should add muzzle flash', () => {
      const flash = { x: 100, y: 100, life: 0.1 };
      
      const newState = gameReducer(initialState, {
        type: GAME_ACTIONS.ADD_MUZZLE_FLASH,
        payload: flash
      });
      
      expect(newState.muzzleFlashes).toHaveLength(1);
    });
  });
  
  describe('Reset actions', () => {
    it('should reset game to initial state', () => {
      const modifiedState = {
        ...initialState,
        score: 1000,
        enemies: [{ id: 1 }],
        player: { ...initialState.player, lives: 2 }
      };
      
      const newState = gameReducer(modifiedState, {
        type: GAME_ACTIONS.RESET_GAME,
        payload: { width: 400, height: 800, playerConfig: mockPlayerConfig }
      });
      
      expect(newState.score).toBe(0);
      expect(newState.enemies).toEqual([]);
      expect(newState.player.lives).toBe(5);
    });
    
    it('should clear all entities', () => {
      const stateWithEntities = {
        ...initialState,
        bullets: [{ id: 1 }],
        enemies: [{ id: 2 }],
        boss: { id: 'boss' }
      };
      
      const newState = gameReducer(stateWithEntities, {
        type: GAME_ACTIONS.CLEAR_ENTITIES
      });
      
      expect(newState.bullets).toEqual([]);
      expect(newState.enemies).toEqual([]);
      expect(newState.boss).toBeNull();
      expect(newState.score).toBe(0); // Score preserved
    });
  });
  
  describe('Unknown action handling', () => {
    it('should return current state for unknown actions', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const newState = gameReducer(initialState, {
        type: 'UNKNOWN_ACTION'
      });
      
      expect(newState).toBe(initialState);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown game action: UNKNOWN_ACTION');
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Helper Functions', () => {
  describe('createFrameUpdate', () => {
    it('should create frame update action', () => {
      const updates = { bullets: [], scoreGain: 100 };
      const action = createFrameUpdate(updates);
      
      expect(action.type).toBe(GAME_ACTIONS.FRAME_UPDATE);
      expect(action.payload).toEqual(updates);
    });
  });
  
  describe('decayUITimers', () => {
    it('should decay player hit flash', () => {
      const state = { playerHitFlash: 1, hudPulse: 0, muzzleFlashes: [], comboTimer: 0, combo: 0 };
      const dt = 0.1; // 100ms
      
      const result = decayUITimers(state, dt);
      
      expect(result.playerHitFlash).toBe(0.75); // 1 - 0.1 * 2.5
    });
    
    it('should decay HUD pulse', () => {
      const state = { playerHitFlash: 0, hudPulse: 1, muzzleFlashes: [], comboTimer: 0, combo: 0 };
      const dt = 0.1;
      
      const result = decayUITimers(state, dt);
      
      expect(result.hudPulse).toBe(0.8); // 1 - 0.1 * 2
    });
    
    it('should filter expired muzzle flashes', () => {
      const state = {
        playerHitFlash: 0,
        hudPulse: 0,
        muzzleFlashes: [
          { life: 0.2 },
          { life: 0.05 }
        ],
        comboTimer: 0,
        combo: 0
      };
      const dt = 0.1;
      
      const result = decayUITimers(state, dt);
      
      expect(result.muzzleFlashes).toHaveLength(1);
      expect(result.muzzleFlashes[0].life).toBe(0.1); // 0.2 - 0.1
    });
    
    it('should reset combo when timer expires', () => {
      const state = { playerHitFlash: 0, hudPulse: 0, muzzleFlashes: [], comboTimer: 0.05, combo: 5 };
      const dt = 0.1;
      
      const result = decayUITimers(state, dt);
      
      expect(result.combo).toBe(0);
      expect(result.comboTimer).toBe(0);
    });
    
    it('should preserve combo when timer has time', () => {
      const state = { playerHitFlash: 0, hudPulse: 0, muzzleFlashes: [], comboTimer: 1, combo: 5 };
      const dt = 0.1;
      
      const result = decayUITimers(state, dt);
      
      expect(result.combo).toBe(5);
      expect(result.comboTimer).toBe(0.9);
    });
  });
  
  describe('updateScoreTexts', () => {
    it('should move score texts upward', () => {
      const scoreTexts = [{ y: 100, life: 1 }];
      const dt = 0.1;
      
      const result = updateScoreTexts(scoreTexts, dt);
      
      expect(result[0].y).toBe(95); // 100 - 0.1 * 50
    });
    
    it('should decay score text life', () => {
      const scoreTexts = [{ y: 100, life: 1 }];
      const dt = 0.1;
      
      const result = updateScoreTexts(scoreTexts, dt);
      
      expect(result[0].life).toBe(0.9);
    });
    
    it('should filter expired score texts', () => {
      const scoreTexts = [
        { y: 100, life: 0.5 },
        { y: 200, life: 0.05 }
      ];
      const dt = 0.1;
      
      const result = updateScoreTexts(scoreTexts, dt);
      
      expect(result).toHaveLength(1);
    });
  });
});
