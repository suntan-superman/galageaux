/**
 * useGameState - Custom hook for core game state management
 * 
 * Provides two approaches:
 * 1. Individual useState calls (current) - Simple, familiar pattern
 * 2. useReducer with FRAME_UPDATE (via frameUpdate function) - Batched updates for performance
 * 
 * The frameUpdate() function allows batching multiple state changes into a single update,
 * reducing re-renders during the game loop.
 * 
 * @module useGameState
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../entities/types';
import {
  limitParticles,
  limitExplosions,
  limitPlayerBullets,
  limitEnemyBullets,
  limitEnemies,
  limitPowerups,
  limitScoreTexts
} from '../engine/entityLimits';

/**
 * Initial player state factory
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 */
const createInitialPlayer = (screenWidth, screenHeight) => ({
  x: screenWidth / 2 - PLAYER_WIDTH / 2,
  y: screenHeight * 0.8,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  alive: true,
  lives: 5,
  weaponLevel: 1,
  weaponType: null,
  shield: false,
  rapidFire: false
});

/**
 * Initial session stats
 */
const createInitialStats = () => ({
  enemiesKilled: 0,
  bossesDefeated: 0,
  powerupsCollected: 0,
  maxCombo: 0,
  levelsCompleted: 0,
  hitsTaken: 0
});

/**
 * Custom hook for managing all game entity state
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 */
export default function useGameState(screenWidth, screenHeight) {
  // Player state
  const [player, setPlayer] = useState(() => createInitialPlayer(screenWidth, screenHeight));
  const playerRef = useRef(player);

  // Entity arrays
  const [bullets, setBullets] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [particles, setParticles] = useState([]);
  const [powerups, setPowerups] = useState([]);
  const [boss, setBoss] = useState(null);
  const [muzzleFlashes, setMuzzleFlashes] = useState([]);

  // Refs for game loop access (avoid stale closures)
  const bulletsRef = useRef(bullets);
  const enemyBulletsRef = useRef(enemyBullets);
  const enemiesRef = useRef(enemies);
  const explosionsRef = useRef(explosions);
  const particlesRef = useRef(particles);
  const powerupsRef = useRef(powerups);
  const bossRef = useRef(boss);

  // Game progress state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const comboRef = useRef(0);
  const [level, setLevel] = useState(1);
  const [levelKills, setLevelKills] = useState(0);
  const [currentStage, setCurrentStage] = useState('stage1');

  // Game flow state
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bossSpawned, setBossSpawned] = useState(false);
  const [stageComplete, setStageComplete] = useState(false);
  const [inBonusRound, setInBonusRound] = useState(false);
  const [bonusTimeLeft, setBonusTimeLeft] = useState(0);

  // UI state
  const [scoreTexts, setScoreTexts] = useState([]);
  const [levelBanner, setLevelBanner] = useState(null);
  const [playerHitFlash, setPlayerHitFlash] = useState(0);
  const [hudPulse, setHudPulse] = useState(0);

  // Achievement tracking
  const [sessionStats, setSessionStats] = useState(createInitialStats);
  const [achievementToast, setAchievementToast] = useState(null);

  // Sync refs with state
  const syncRefs = useCallback(() => {
    playerRef.current = player;
    bulletsRef.current = bullets;
    enemyBulletsRef.current = enemyBullets;
    enemiesRef.current = enemies;
    explosionsRef.current = explosions;
    particlesRef.current = particles;
    powerupsRef.current = powerups;
    bossRef.current = boss;
  }, [player, bullets, enemyBullets, enemies, explosions, particles, powerups, boss]);

  /**
   * Reset all game state to initial values
   */
  const resetGame = useCallback(() => {
    setScore(0);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setExplosions([]);
    setParticles([]);
    setPowerups([]);
    setBoss(null);
    setBossSpawned(false);
    setCombo(0);
    comboRef.current = 0;
    setComboTimer(0);
    setCurrentStage('stage1');
    setStageComplete(false);
    setPlayer(createInitialPlayer(screenWidth, screenHeight));
    setGameOver(false);
    setIsPaused(false);
    setPlayerHitFlash(0);
    setHudPulse(0);
    setScoreTexts([]);
    setLevel(1);
    setLevelKills(0);
    setLevelBanner('LEVEL 01');
    setInBonusRound(false);
    setBonusTimeLeft(0);
    setMuzzleFlashes([]);
    setSessionStats(createInitialStats());
    setAchievementToast(null);
  }, [screenWidth, screenHeight]);

  /**
   * Update combo with decay
   * @param {number} dt - Delta time
   */
  const updateCombo = useCallback((dt) => {
    setComboTimer(prev => {
      const next = Math.max(0, prev - dt);
      if (next === 0 && prev > 0) {
        setCombo(0);
        comboRef.current = 0;
      }
      return next;
    });
  }, []);

  /**
   * Increment combo and reset timer
   */
  const incrementCombo = useCallback(() => {
    comboRef.current += 1;
    setCombo(comboRef.current);
    setComboTimer(1.5);
    return comboRef.current;
  }, []);

  /**
   * Add score with optional combo multiplier
   * @param {number} points - Base points
   * @param {number} comboMultiplier - Combo multiplier (default 1)
   */
  const addScore = useCallback((points, comboMultiplier = 1) => {
    const finalPoints = Math.floor(points * comboMultiplier);
    setScore(prev => prev + finalPoints);
    return finalPoints;
  }, []);

  /**
   * Track enemy kill in stats
   */
  const trackEnemyKill = useCallback((currentCombo) => {
    setSessionStats(prev => ({
      ...prev,
      enemiesKilled: prev.enemiesKilled + 1,
      maxCombo: Math.max(prev.maxCombo, currentCombo)
    }));
  }, []);

  /**
   * Track boss defeat in stats
   */
  const trackBossDefeat = useCallback(() => {
    setSessionStats(prev => ({
      ...prev,
      bossesDefeated: prev.bossesDefeated + 1
    }));
  }, []);

  /**
   * Track powerup collection in stats
   */
  const trackPowerupCollect = useCallback(() => {
    setSessionStats(prev => ({
      ...prev,
      powerupsCollected: prev.powerupsCollected + 1
    }));
  }, []);

  /**
   * Track player hit in stats
   */
  const trackHit = useCallback(() => {
    setSessionStats(prev => ({
      ...prev,
      hitsTaken: prev.hitsTaken + 1
    }));
  }, []);

  /**
   * Track level completion in stats
   */
  const trackLevelComplete = useCallback(() => {
    setSessionStats(prev => ({
      ...prev,
      levelsCompleted: prev.levelsCompleted + 1
    }));
  }, []);

  /**
   * Batch update multiple state values in a single call
   * This reduces re-renders by combining updates that would normally be separate setState calls.
   * 
   * @param {Object} updates - Object containing state updates
   * @param {Array} [updates.bullets] - Updated player bullets
   * @param {Array} [updates.enemyBullets] - Updated enemy bullets
   * @param {Array} [updates.enemies] - Updated enemies
   * @param {Array} [updates.explosions] - Updated explosions
   * @param {Array} [updates.particles] - Updated particles
   * @param {Array} [updates.powerups] - Updated powerups
   * @param {Object|null} [updates.boss] - Updated boss
   * @param {Array} [updates.scoreTexts] - Updated score texts
   * @param {Array} [updates.muzzleFlashes] - Updated muzzle flashes
   * @param {number} [updates.scoreGain] - Points to add to score
   * @param {number} [updates.combo] - Updated combo value
   * @param {number} [updates.comboTimer] - Updated combo timer
   * @param {number} [updates.playerHitFlash] - Updated hit flash intensity
   * @param {number} [updates.hudPulse] - Updated HUD pulse intensity
   * @param {number} [updates.bonusTimeLeft] - Updated bonus time
   * @param {boolean} [updates.inBonusRound] - Bonus round state
   * @param {number} [updates.levelKills] - Updated level kills
   */
  const frameUpdate = useCallback((updates) => {
    // Apply entity limits and update state
    if (updates.bullets !== undefined) {
      setBullets(limitPlayerBullets(updates.bullets));
    }
    if (updates.enemyBullets !== undefined) {
      setEnemyBullets(limitEnemyBullets(updates.enemyBullets));
    }
    if (updates.enemies !== undefined) {
      setEnemies(limitEnemies(updates.enemies));
    }
    if (updates.explosions !== undefined) {
      setExplosions(limitExplosions(updates.explosions));
    }
    if (updates.particles !== undefined) {
      setParticles(limitParticles(updates.particles));
    }
    if (updates.powerups !== undefined) {
      setPowerups(limitPowerups(updates.powerups));
    }
    if (updates.boss !== undefined) {
      setBoss(updates.boss);
    }
    if (updates.scoreTexts !== undefined) {
      setScoreTexts(limitScoreTexts(updates.scoreTexts));
    }
    if (updates.muzzleFlashes !== undefined) {
      setMuzzleFlashes(updates.muzzleFlashes);
    }
    if (updates.scoreGain) {
      setScore(prev => prev + updates.scoreGain);
    }
    if (updates.combo !== undefined) {
      setCombo(updates.combo);
      comboRef.current = updates.combo;
    }
    if (updates.comboTimer !== undefined) {
      setComboTimer(updates.comboTimer);
    }
    if (updates.playerHitFlash !== undefined) {
      setPlayerHitFlash(updates.playerHitFlash);
    }
    if (updates.hudPulse !== undefined) {
      setHudPulse(updates.hudPulse);
    }
    if (updates.bonusTimeLeft !== undefined) {
      setBonusTimeLeft(updates.bonusTimeLeft);
    }
    if (updates.inBonusRound !== undefined) {
      setInBonusRound(updates.inBonusRound);
    }
    if (updates.levelKills !== undefined) {
      setLevelKills(updates.levelKills);
    }
  }, []);

  /**
   * Calculate UI timer decays for a frame
   * Helper to compute decayed values for visual effects
   * @param {number} dt - Delta time in seconds
   * @returns {Object} Object with decayed timer values
   */
  const decayTimers = useCallback((dt) => {
    return {
      playerHitFlash: playerHitFlash > 0 ? Math.max(0, playerHitFlash - dt * 2.5) : 0,
      hudPulse: hudPulse > 0 ? Math.max(0, hudPulse - dt * 2) : 0,
      muzzleFlashes: muzzleFlashes
        .map(mf => ({ ...mf, life: mf.life - dt }))
        .filter(mf => mf.life > 0),
      comboTimer: Math.max(0, comboTimer - dt),
      combo: comboTimer > 0 && comboTimer - dt <= 0 ? 0 : combo,
    };
  }, [playerHitFlash, hudPulse, muzzleFlashes, comboTimer, combo]);

  /**
   * Update score texts (float up and fade)
   * @param {number} dt - Delta time in seconds
   * @returns {Array} Updated score texts
   */
  const updateScoreTextPositions = useCallback((dt) => {
    return scoreTexts
      .map(st => ({ ...st, y: st.y - dt * 50, life: st.life - dt }))
      .filter(st => st.life > 0);
  }, [scoreTexts]);

  return {
    // Player
    player,
    setPlayer,
    playerRef,

    // Entities
    bullets,
    setBullets,
    bulletsRef,
    enemyBullets,
    setEnemyBullets,
    enemyBulletsRef,
    enemies,
    setEnemies,
    enemiesRef,
    explosions,
    setExplosions,
    explosionsRef,
    particles,
    setParticles,
    particlesRef,
    powerups,
    setPowerups,
    powerupsRef,
    boss,
    setBoss,
    bossRef,
    muzzleFlashes,
    setMuzzleFlashes,

    // Progress
    score,
    setScore,
    addScore,
    combo,
    setCombo,
    comboRef,
    comboTimer,
    updateCombo,
    incrementCombo,
    level,
    setLevel,
    levelKills,
    setLevelKills,
    currentStage,
    setCurrentStage,

    // Game flow
    isPaused,
    setIsPaused,
    gameOver,
    setGameOver,
    bossSpawned,
    setBossSpawned,
    stageComplete,
    setStageComplete,
    inBonusRound,
    setInBonusRound,
    bonusTimeLeft,
    setBonusTimeLeft,

    // UI
    scoreTexts,
    setScoreTexts,
    levelBanner,
    setLevelBanner,
    playerHitFlash,
    setPlayerHitFlash,
    hudPulse,
    setHudPulse,

    // Stats
    sessionStats,
    setSessionStats,
    achievementToast,
    setAchievementToast,
    trackEnemyKill,
    trackBossDefeat,
    trackPowerupCollect,
    trackHit,
    trackLevelComplete,

    // Actions
    resetGame,
    syncRefs,
    
    // Batched updates (performance optimization)
    frameUpdate,
    decayTimers,
    updateScoreTextPositions,
  };
}
