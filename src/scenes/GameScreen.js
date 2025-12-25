import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Canvas } from '@shopify/react-native-skia';
import wavesConfig from '../config/waves.json';
import enemiesConfig from '../config/enemies.json';
import { diveOffset } from '../engine/paths';
import { spawnExplosionParticles, updateParticles, spawnExplosion, updateExplosion } from '../engine/particles';
import { createScreenshake, triggerScreenshake, updateScreenshake } from '../engine/screenshake';
import { createBoss, updateBoss, bossCurrentPattern } from '../engine/boss';
import { startSwoop, updateSwoop } from '../engine/swoops';
import { POWERUP_TYPES, createPowerup, updatePowerup, applyPowerupEffect } from '../engine/powerups';
import { spawnWave as spawnWaveFromModule, spawnFormation, spawnSingleEnemy, createEnemyBullet } from '../engine/spawner';
import { checkBulletEnemyCollisions, checkBulletBossCollisions, checkEnemyBulletPlayerCollisions, checkPowerupCollisions } from '../engine/collisionHandlers';
import { generateBossBullets } from '../engine/boss-patterns';
import {
  limitParticles,
  limitExplosions,
  limitPlayerBullets,
  limitEnemyBullets,
  limitEnemies,
  limitPowerups,
  limitScoreTexts
} from '../engine/entityLimits';
import {
  getLevelTarget,
  getDifficultyMultiplier,
  calculateSpawnInterval,
  calculateMaxEnemies,
  calculateEnemySpeed,
  calculateEnemyBulletSpeed,
  calculateDifficultySettings
} from '../engine/difficulty';
import * as AudioManager from '../engine/audio';
import * as AchievementManager from '../engine/achievements';
import PauseOverlay from '../components/PauseOverlay';
import ControlHintsOverlay from '../components/ControlHintsOverlay';
import AchievementToast from '../components/AchievementToast';
import GameHUD from '../components/GameHUD';
import FireButton from '../components/FireButton';
import ScorePopup from '../components/ScorePopup';
import LevelBanner from '../components/LevelBanner';
import BonusBanner from '../components/BonusBanner';
import StageCompleteOverlay from '../components/StageCompleteOverlay';
import HitFlash from '../components/HitFlash';
import {
  Background,
  StarField,
  PlayerShip,
  Enemies,
  BossShip,
  PlayerBullets,
  EnemyBullets,
  MuzzleFlashes,
  Explosions,
  Particles,
  Powerups
} from '../components/canvas';
import { PLAYER_WIDTH, PLAYER_HEIGHT, ENEMY_SIZE, BULLET_WIDTH, BULLET_HEIGHT, POWERUP_SIZE } from '../entities/types';
import GameOverOverlay from './GameOverOverlay';
import { STAGES, STORAGE_KEYS, VISUAL, PLAYER as PLAYER_CONSTANTS, BOSS as BOSS_CONSTANTS, GAMEPLAY } from '../constants/game';
import useGameSettings from '../hooks/useGameSettings';
import useStarField from '../hooks/useStarField';
import usePlayerControls from '../hooks/usePlayerControls';

const STAR_COLORS = VISUAL.STAR_COLORS;

export default function GameScreen({ onExit, showTutorial = false }) {
  const { width, height } = useWindowDimensions();
  const [player, setPlayer] = useState({
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
  });
  const [bullets, setBullets] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [particles, setParticles] = useState([]);
  const [powerups, setPowerups] = useState([]);
  const [boss, setBoss] = useState(null);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bossSpawned, setBossSpawned] = useState(false);
  const [canFire, setCanFire] = useState(true);
  const [scoreTexts, setScoreTexts] = useState([]);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const comboRef = useRef(0);
  const [autoFire, setAutoFire] = useState(false);
  const [showGuide, setShowGuide] = useState(showTutorial);
  const [playerHitFlash, setPlayerHitFlash] = useState(0);
  const [hudPulse, setHudPulse] = useState(0);
  const [muzzleFlashes, setMuzzleFlashes] = useState([]);
const { stars, updateStars, resetStars } = useStarField(width, height);
const [tiltControlEnabled, setTiltControlEnabled] = useState(true);
const [initialWaveSpawned, setInitialWaveSpawned] = useState(false);
const [level, setLevel] = useState(1);
const [levelKills, setLevelKills] = useState(0);
const [levelBanner, setLevelBanner] = useState(null);
  const bonusTimerRef = useRef(0);
  const [bonusTimeLeft, setBonusTimeLeft] = useState(0);
const [inBonusRound, setInBonusRound] = useState(false);
const [currentStage, setCurrentStage] = useState('stage1');
const [stageComplete, setStageComplete] = useState(false);
  const [achievementToast, setAchievementToast] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    enemiesKilled: 0,
    bossesDefeated: 0,
    powerupsCollected: 0,
    maxCombo: 0,
    levelsCompleted: 0,
    hitsTaken: 0
  });

  // Use the game settings hook for persisted settings
  const {
    tiltSensitivity,
    fireButtonPosition,
    audioSettings,
    handleTiltSensitivityChange,
    handleFireButtonPositionChange,
    handleToggleSounds,
    handleToggleMusic,
    handleChangeSoundVolume,
    handleChangeMusicVolume
  } = useGameSettings();

  const lastTimeRef = useRef(Date.now());
  const fireCooldownRef = useRef(0);
  const enemySpawnTimerRef = useRef(0);
  const totalEnemiesSpawnedRef = useRef(0);
  const screenshake = useRef(createScreenshake());
  const screenOffset = useRef({ ox: 0, oy: 0 });
  const stageConfig = wavesConfig[currentStage] || wavesConfig['stage1'];
  const playerRef = useRef(player);
  const pausedRef = useRef(false);
  const bulletsRef = useRef(bullets);
  const enemyBulletsRef = useRef(enemyBullets);
  const enemiesRef = useRef(enemies);
  const explosionsRef = useRef(explosions);
  const particlesRef = useRef(particles);
  const powerupsRef = useRef(powerups);
  const bossRef = useRef(boss);
// Calculate all difficulty settings from centralized module
const difficultySettings = calculateDifficultySettings(stageConfig, level, inBonusRound);
const {
  levelTarget,
  difficultyMultiplier,
  bonusMultiplier,
  spawnInterval: levelSpawnInterval,
  maxEnemies: levelMaxEnemies,
  enemySpeed: levelEnemySpeed,
  enemyBulletSpeed: levelEnemyBulletSpeed
} = difficultySettings;

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

useEffect(() => {
  bulletsRef.current = bullets;
}, [bullets]);

useEffect(() => {
  enemyBulletsRef.current = enemyBullets;
}, [enemyBullets]);

useEffect(() => {
  enemiesRef.current = enemies;
}, [enemies]);

useEffect(() => {
  explosionsRef.current = explosions;
}, [explosions]);

useEffect(() => {
  particlesRef.current = particles;
}, [particles]);

useEffect(() => {
  powerupsRef.current = powerups;
}, [powerups]);

useEffect(() => {
  bossRef.current = boss;
}, [boss]);

  // Initialize audio system
  useEffect(() => {
    let mounted = true;
    
    const initAudio = async () => {
      await AudioManager.initializeAudio();
      
      // Load saved audio settings
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
        if (saved && mounted) {
          const settings = JSON.parse(saved);
          AudioManager.setSoundsEnabled(settings.soundsEnabled);
          AudioManager.setMusicEnabled(settings.musicEnabled);
          AudioManager.setSoundVolume(settings.soundVolume);
          await AudioManager.setMusicVolume(settings.musicVolume);
        }
      } catch (error) {
        console.warn('Failed to load audio settings:', error);
      }
      
      // Start gameplay music
      if (mounted) {
        await AudioManager.playMusic('gameplay');
      }
    };
    
    initAudio();
    
    return () => {
      mounted = false;
      AudioManager.pauseMusic();
    };
  }, []);

  // Initialize achievements system
  useEffect(() => {
    AchievementManager.loadAchievements();
  }, []);

  // Update music tempo based on level
  useEffect(() => {
    AudioManager.setMusicTempo(level);
  }, [level]);

  // Check and update achievements when session stats change
  useEffect(() => {
    const checkAchievements = async () => {
      const newlyUnlocked = await AchievementManager.updateStats({
        enemiesKilled: sessionStats.enemiesKilled,
        bossesDefeated: sessionStats.bossesDefeated,
        powerupsCollected: sessionStats.powerupsCollected,
        maxCombo: sessionStats.maxCombo,
        levelsCompleted: sessionStats.levelsCompleted,
        perfectLevels: sessionStats.hitsTaken === 0 && sessionStats.levelsCompleted > 0 ? 1 : 0,
        highScore: score
      });
      
      // Show toast for newly unlocked achievements
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        const achievement = newlyUnlocked[0];
        setAchievementToast(achievement);
        AudioManager.playSound('powerupCollect', 0.8); // Use powerup sound for achievement
        setTimeout(() => setAchievementToast(null), 4000);
      }
    };
    
    checkAchievements();
  }, [sessionStats, score]);

  useEffect(() => {
    setLevelBanner('LEVEL 01');
  }, []);

  useEffect(() => {
    if (!showGuide && !initialWaveSpawned && enemies.length === 0) {
      setEnemies(spawnWave());
      setInitialWaveSpawned(true);
      enemySpawnTimerRef.current = 0;
    }
  }, [showGuide, initialWaveSpawned, enemies.length]);

  // Use player controls hook for tilt and touch input
  const { panHandlers, updateTilt } = usePlayerControls({
    width,
    playerWidth: PLAYER_WIDTH,
    tiltEnabled: tiltControlEnabled,
    tiltSensitivity,
    isPaused,
    isAlive: player.alive,
    gameOver,
    inBonusRound,
    onPositionChange: (newX) => setPlayer(prev => ({ ...prev, x: newX }))
  });

  useEffect(() => {
    let id;
    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (!isPaused && !gameOver && player.alive) step(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [isPaused, gameOver, player.alive, bossSpawned]);

  /**
   * Main Game Loop Step Function
   * ============================
   * Called every frame (~60fps) to update all game state.
   * 
   * @param {number} dt - Delta time in seconds since last frame (typically ~0.016s at 60fps)
   * 
   * Frame Lifecycle:
   * 1. EARLY EXIT CHECK - Game over conditions
   * 2. SCREEN EFFECTS - Update screenshake offset
   * 3. SNAPSHOT STATE - Capture refs for consistent frame processing
   * 4. UI TIMERS - Decay visual effects (hit flash, HUD pulse, muzzle flashes, combo)
   * 5. BACKGROUND - Update parallax star field
   * 6. INPUT PROCESSING - Handle tilt controls and auto-fire
   * 7. ENTITY MOVEMENT - Update positions of all game entities:
   *    - Player bullets (move up)
   *    - Enemy bullets (move down/directional)
   *    - Particles/explosions (physics + decay)
   *    - Powerups (fall down)
   *    - Enemies (patterns: normal, zigzag, dive, chase, swoop)
   * 8. ENEMY AI - Enemy shooting logic with cooldowns
   * 9. SPAWNING - Spawn new enemies/boss based on progression
   * 10. COLLISION DETECTION - Check all collision types:
   *     - Player bullets vs enemies → score, explosions, powerups
   *     - Player bullets vs boss → damage, stage progression
   *     - Enemy bullets vs player → damage, game over check
   *     - Player vs powerups → apply effects
   * 11. STATE COMMIT - Update all React state with new values
   * 12. PROGRESSION - Level advancement, bonus rounds
   */
  const step = (dt) => {
    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1: EARLY EXIT CHECK
    // Prevent further processing if player is dead
    // ═══════════════════════════════════════════════════════════════════
    if (playerRef.current.lives <= 0 && playerRef.current.alive) {
      setPlayer(prev => ({ ...prev, alive: false }));
      setGameOver(true);
      setIsPaused(true);
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2: SCREEN EFFECTS
    // Update screenshake and store offset for rendering
    // ═══════════════════════════════════════════════════════════════════
    const { ox, oy } = updateScreenshake(screenshake.current, dt);
    screenOffset.current = { ox, oy };

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 3: SNAPSHOT STATE
    // Capture current state from refs for consistent frame processing
    // (refs are used to avoid stale closures in the game loop)
    // ═══════════════════════════════════════════════════════════════════
    const currentBullets = bulletsRef.current;
    const currentEnemyBullets = enemyBulletsRef.current;
    const currentEnemies = enemiesRef.current;
    const currentExplosions = explosionsRef.current;
    const currentParticles = particlesRef.current;
    const currentPowerups = powerupsRef.current;
    const currentBoss = bossRef.current;

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 4: UI TIMERS
    // Decay visual effects over time (all use dt for frame-rate independence)
    // ═══════════════════════════════════════════════════════════════════
    setPlayerHitFlash(prev => (prev > 0 ? Math.max(0, prev - dt * 2.5) : 0));  // ~0.4s decay
    setHudPulse(prev => (prev > 0 ? Math.max(0, prev - dt * 2) : 0));          // ~0.5s decay
    setMuzzleFlashes(prev => prev.map(mf => ({ ...mf, life: mf.life - dt })).filter(mf => mf.life > 0));
    
    // Combo timer: resets combo to 0 when timer expires
    setComboTimer(prev => {
      const next = Math.max(0, prev - dt);
      if (next === 0 && prev > 0) {
        setCombo(0);
        comboRef.current = 0;
      }
      return next;
    });

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 5: BACKGROUND
    // Update parallax star field (delegated to useStarField hook)
    // ═══════════════════════════════════════════════════════════════════
    updateStars(dt);

    const currentPlayer = playerRef.current;

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 6: INPUT PROCESSING
    // Handle accelerometer-based tilt controls and auto-fire
    // ═══════════════════════════════════════════════════════════════════
    const newTiltX = updateTilt(dt, currentPlayer.x);
    if (newTiltX !== null) {
      setPlayer(prev => ({ ...prev, x: newTiltX }));
    }

    // Fire cooldown management and auto-fire trigger
    if (fireCooldownRef.current > 0) {
      fireCooldownRef.current = Math.max(0, fireCooldownRef.current - dt);
      if (fireCooldownRef.current === 0) setCanFire(true);
    } else if (autoFire && currentPlayer.alive && !isPaused && !showGuide) {
      fireWeapon(true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 7: ENTITY MOVEMENT
    // Update positions of all game entities using delta time
    // ═══════════════════════════════════════════════════════════════════
    
    // Score text floats upward and fades out
    setScoreTexts(prev =>
      prev
        .map(st => ({ ...st, y: st.y - dt * 50, life: st.life - dt }))
        .filter(st => st.life > 0)
    );

    // Update particles and explosions (physics handled by engine modules)
    let updatedParticles = updateParticles(currentParticles, dt);
    let updatedExplosions = currentExplosions
      .map(ex => updateExplosion(ex, dt))
      .filter(ex => ex && ex.life > 0);
    
    // Powerups fall downward, remove when off-screen or collected
    let fallingPowerups = currentPowerups
      .map(p => updatePowerup(p, dt))
      .filter(p => p.y < height + p.size && !p.collected);

    // Player bullets move upward at their speed
    const movedPlayerBullets = currentBullets
      .map(b => ({ ...b, y: b.y - b.speed * dt }))
      .filter(b => b.y + b.height > 0);  // Remove when off-screen

    // Enemy bullets: directional (vx/vy) or straight down (speed only)
    let movedEnemyBullets = currentEnemyBullets
      .map(b => {
        if (b.vx !== undefined && b.vy !== undefined) {
          return { ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt };
        }
        return { ...b, y: b.y + b.speed * dt };
      })
      .filter(b => b.y - b.height < height && b.x > -b.width * 2 && b.x < width + b.width * 2);

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 7b: ENEMY MOVEMENT & AI
    // Process each enemy: movement patterns, swoop behavior, shooting
    // ═══════════════════════════════════════════════════════════════════
    const enemyShots = [];
    const advancedEnemies = [];
    const spawnBuffer = [];
    let killsEarned = 0;
    
    currentEnemies.forEach(e => {
      let y = e.y + e.speed * dt;
      let x = e.x;
      
      // Kamikaze behavior: chase player directly
      if (e.behavior === 'chase') {
        const playerCenterX = currentPlayer.x + currentPlayer.width / 2;
        const playerCenterY = currentPlayer.y + currentPlayer.height / 2;
        const enemyCenterX = e.x + e.size / 2;
        const enemyCenterY = e.y + e.size / 2;
        
        // Calculate direction to player
        const dx = playerCenterX - enemyCenterX;
        const dy = playerCenterY - enemyCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          x = e.x + (dx / dist) * e.speed * dt;
          y = e.y + (dy / dist) * e.speed * dt;
        }
      }
      // Normal movement patterns
      else if (e.pattern === 'zigzag') {
        const t = (height - y) / height;
        x = e.baseX + Math.sin((1 - t) * Math.PI * 4) * 40;
      } else if (e.pattern === 'dive') {
        const t = (height - y) / height;
        x = e.baseX + diveOffset(1 - t, 70);
      }

      let nextEnemy = { ...e, x, y };

      if (nextEnemy.swoopState && nextEnemy.swoopState.active) {
        nextEnemy = updateSwoop(nextEnemy, nextEnemy.swoopState, dt, width, height);
      }

      if (nextEnemy.canShoot) {
        const cooldown = (nextEnemy.fireCooldown ?? 0) - dt;
        nextEnemy.fireCooldown = cooldown;
        if (cooldown <= 0 && nextEnemy.y > 0 && nextEnemy.y < height * 0.8) {
          enemyShots.push(makeEnemyBullet(nextEnemy));
          
          // Elite enemies have rapid fire
          if (nextEnemy.type === 'elite') {
            nextEnemy.fireCooldown = 0.4 + Math.random() * 0.3; // 0.4-0.7s (much faster)
          } else {
            // Easier early levels: enemies shoot less frequently
            const baseCooldown = level <= 2 ? 2.5 : level <= 4 ? 1.8 : 1.2;
            const randomVariation = level <= 2 ? 1.5 : level <= 4 ? 1.2 : 1.3;
            nextEnemy.fireCooldown = baseCooldown + Math.random() * randomVariation;
          }
        }
      }

      advancedEnemies.push(nextEnemy);
    });

    // Add any new enemy bullets to the pool
    if (enemyShots.length) {
      movedEnemyBullets = movedEnemyBullets.concat(enemyShots);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 8: SPAWNING
    // Spawn new enemies based on timer, or boss when enemy quota reached
    // ═══════════════════════════════════════════════════════════════════
    if (!bossSpawned) {
      enemySpawnTimerRef.current += dt;
      if (
        enemySpawnTimerRef.current >= levelSpawnInterval &&
        advancedEnemies.length < levelMaxEnemies
      ) {
        enemySpawnTimerRef.current = 0;
        const spawned = spawnWave();
        advancedEnemies.push(...spawned);
        spawnBuffer.push(...spawned);
      }
    }

    // Boss spawning: when enough enemies defeated, spawn stage boss
    let upcomingBoss = currentBoss;
    if (!bossSpawned && totalEnemiesSpawnedRef.current >= stageConfig.maxEnemies) {
      upcomingBoss = createBoss(currentStage, width);
      setBossSpawned(true);
      AudioManager.playSound('bossAppear', 0.9);
      AudioManager.playMusic('boss');
      triggerScreenshake(screenshake.current, 12, 0.4);
    }

    // Boss AI: movement and attack pattern execution
    if (upcomingBoss && upcomingBoss.alive) {
      upcomingBoss = updateBoss({ ...upcomingBoss }, dt, currentStage);
      const playerCenterX = currentPlayer.x + currentPlayer.width / 2;
      const playerCenterY = currentPlayer.y + currentPlayer.height / 2;
      upcomingBoss.fireCooldown -= dt;
      if (upcomingBoss.fireCooldown <= 0) {
        const pattern = bossCurrentPattern(upcomingBoss, currentStage);
        movedEnemyBullets = movedEnemyBullets.concat(
          generateBossBullets(upcomingBoss, pattern, currentStage, playerCenterX, playerCenterY)
        );
        upcomingBoss.fireCooldown = 1.1;  // Boss fires every 1.1 seconds
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 9: COLLISION DETECTION
    // Check all collision types and handle effects
    // ═══════════════════════════════════════════════════════════════════
    let extraPowerups = [];
    let scoreTextAdds = [];
    
    // 9a: Player bullets vs enemies
    const enemyCollisionResult = checkBulletEnemyCollisions(
      movedPlayerBullets,
      advancedEnemies,
      {
        comboCount: comboRef.current,
        bonusMultiplier,
        onEnemyDestroyed: (enemy, currentCombo, points) => {
          // Play sound
          AudioManager.playSound('enemyDestroy', 0.5);
          
          // Update combo state
          comboRef.current = currentCombo;
          setCombo(currentCombo);
          setComboTimer(1.5);  // Combo expires after 1.5 seconds of no kills
          
          // Show combo text for combos of 2+
          if (currentCombo >= 2) {
            AudioManager.playSound('comboIncrease', 0.6);
            scoreTextAdds.push({
              x: width / 2,
              y: height * 0.2,
              text: `${currentCombo}x COMBO!`,
              color: currentCombo >= 5 ? '#fbbf24' : currentCombo >= 3 ? '#fb923c' : '#22c55e',
              life: 1.2,
              id: Date.now() + Math.random() + 10000,
              isCombo: true
            });
          }
          
          // Track achievement stats
          setSessionStats(prev => ({
            ...prev,
            enemiesKilled: prev.enemiesKilled + 1,
            maxCombo: Math.max(prev.maxCombo, currentCombo)
          }));
          
          // Chance to spawn powerup
          if (Math.random() < 0.1) {
            const centerX = enemy.x + enemy.size / 2;
            const centerY = enemy.y + enemy.size / 2;
            extraPowerups.push(createPowerup(centerX - POWERUP_SIZE / 2, centerY, randomPowerupKind()));
          }
        }
      }
    );
    
    const { survivingBullets: bulletsAfterEnemies, survivingEnemies, results: enemyResults } = enemyCollisionResult;
    let scoreGain = enemyResults.scoreGain || 0;
    killsEarned += enemyResults.killsEarned || 0;
    
    // Merge collision effects into update pools
    if (enemyResults.explosions?.length) {
      triggerScreenshake(screenshake.current, 4.5, 0.15);
      updatedExplosions = updatedExplosions.concat(enemyResults.explosions);
    }
    if (enemyResults.particles?.length) {
      updatedParticles = updatedParticles.concat(enemyResults.particles);
    }
    if (enemyResults.scoreTexts?.length) {
      scoreTextAdds = scoreTextAdds.concat(enemyResults.scoreTexts);
    }

    let survivingBullets = bulletsAfterEnemies;

    // 9b: Player bullets vs boss
    if (upcomingBoss && upcomingBoss.alive) {
      const bossResult = checkBulletBossCollisions(survivingBullets, upcomingBoss, screenshake.current);
      survivingBullets = bossResult.survivingBullets;
      upcomingBoss = bossResult.updatedBoss;
      const bossRes = bossResult.results;
      
      if (bossRes.hitCount > 0) {
        AudioManager.playSound('enemyHit', 0.4);
      }
      if (bossRes.particles?.length) {
        updatedParticles = updatedParticles.concat(bossRes.particles);
      }
      if (bossRes.explosions?.length) {
        updatedExplosions = updatedExplosions.concat(bossRes.explosions);
      }
      if (bossRes.scoreTexts?.length) {
        scoreTextAdds = scoreTextAdds.concat(bossRes.scoreTexts);
      }
      scoreGain += bossRes.scoreGain || 0;
      
      // Boss defeated: handle stage progression
      if (bossRes.bossDefeated) {
        AudioManager.playSound('bossDeath', 0.8);
        
        // Track boss defeat achievement
        setSessionStats(prev => ({
          ...prev,
          bossesDefeated: prev.bossesDefeated + 1
        }));
        
        // Stage progression: advance to next stage after boss defeat
        const currentStageIndex = STAGES.indexOf(currentStage);
        if (currentStageIndex < STAGES.length - 1) {
          const nextStage = STAGES[currentStageIndex + 1];
          setStageComplete(true);
          
          // Delay stage transition for celebration effect
          setTimeout(() => {
            setCurrentStage(nextStage);
            setBossSpawned(false);
            totalEnemiesSpawnedRef.current = 0;
            setEnemies([]);
            setEnemyBullets([]);
            setStageComplete(false);
            AudioManager.playMusic('background');
          }, 2000);
        } else {
          // All stages complete - player wins!
          setStageComplete(true);
        }
      }
    }

    // 9c: Enemy bullets vs player
    const { survivingBullets: enemyBulletsAfterPlayer, playerHit } = checkEnemyBulletPlayerCollisions(
      movedEnemyBullets,
      currentPlayer,
      inBonusRound // Player is invulnerable during bonus round
    );
    if (playerHit) handlePlayerHit();

    // 9d: Player vs powerups
    const remainingPowerups = checkPowerupCollisions(fallingPowerups, currentPlayer, applyPowerup);

    const finalPowerups = extraPowerups.length ? remainingPowerups.concat(extraPowerups) : remainingPowerups;

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 10: STATE COMMIT
    // Apply all calculated updates to React state with entity limits
    // Limits prevent memory growth during extended play sessions
    // ═══════════════════════════════════════════════════════════════════
    setBullets(limitPlayerBullets(survivingBullets));
    setEnemyBullets(limitEnemyBullets(enemyBulletsAfterPlayer));
    setEnemies(limitEnemies([...survivingEnemies, ...spawnBuffer]));
    setExplosions(limitExplosions(updatedExplosions));
    setParticles(limitParticles(updatedParticles));
    setPowerups(limitPowerups(finalPowerups));
    setBoss(upcomingBoss);
    if (scoreGain) setScore(prev => prev + scoreGain);
    if (scoreTextAdds.length) {
      setScoreTexts(prev => limitScoreTexts([...prev, ...scoreTextAdds]));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION 11: BONUS ROUND TIMER
    // Handle bonus round countdown and completion
    // ═══════════════════════════════════════════════════════════════════
    if (inBonusRound) {
      setBonusTimeLeft(prev => {
        const next = Math.max(0, prev - dt);
        if (next <= 0 && prev > 0) {
          // Bonus round just ended - ensure game continues
          setInBonusRound(false);
          // Reset spawn timer to ensure enemies continue spawning
          enemySpawnTimerRef.current = 0;
          // Reset levelKills to 0 for the new level (bonus kills don't count toward next level)
          setLevelKills(0);
          // Show completion message
          setScoreTexts(prev => [
            ...prev,
            {
              x: width / 2,
              y: height * 0.4,
              text: 'BONUS COMPLETE!',
              color: '#22c55e',
              life: 1.5,
              id: Date.now() + Math.random()
            }
          ]);
        }
        return next;
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 12: LEVEL PROGRESSION
    // Track kills and trigger level-up when target reached
    // ═══════════════════════════════════════════════════════════════════
    if (killsEarned > 0 && !inBonusRound) {
      // Only count kills toward level progression when not in bonus round
      setLevelKills(prev => {
        const total = prev + killsEarned;
        if (total >= levelTarget) {
          if (level < 10) {
            const nextLevel = Math.min(10, level + 1);
            AudioManager.playSound('levelUp', 0.8);
            setLevel(nextLevel);
            setLevelBanner(`LEVEL ${String(nextLevel).padStart(2, '0')}`);
            // Reset levelKills to 0 for the new level before triggering bonus
            setLevelKills(0);
            
            // Track level completion
            setSessionStats(prev => ({
              ...prev,
              levelsCompleted: prev.levelsCompleted + 1
            }));
            
            triggerBonusRound();
            return 0; // Reset to 0, bonus round kills don't count
          }
          return levelTarget;  // Max level reached
        }
        return total;
      });
    }
  };
  // ═══════════════════════════════════════════════════════════════════════
  // END OF STEP FUNCTION
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Select a random powerup type for enemy drops
   * @returns {string} Powerup type key
   */
  const randomPowerupKind = () => {
    const kinds = [POWERUP_TYPES.SPREAD_SHOT, POWERUP_TYPES.DOUBLE_SHOT, POWERUP_TYPES.TRIPLE_SHOT, POWERUP_TYPES.RAPID_FIRE, 'shield', 'slow'];
    return kinds[Math.floor(Math.random() * kinds.length)];
  };

  /**
   * Apply a collected powerup effect to the player
   * @param {string} kind - Powerup type (from POWERUP_TYPES or 'shield'/'slow')
   */
  const applyPowerup = (kind) => {
    AudioManager.playSound('powerupCollect', 0.7);
    
    // Track powerup collection
    setSessionStats(prev => ({
      ...prev,
      powerupsCollected: prev.powerupsCollected + 1
    }));
    
    // Weapon powerups: upgrade temporarily for 10 seconds
    if (kind === POWERUP_TYPES.SPREAD_SHOT || kind === POWERUP_TYPES.DOUBLE_SHOT || kind === POWERUP_TYPES.TRIPLE_SHOT || kind === POWERUP_TYPES.RAPID_FIRE) {
      setPlayer(prev => {
        const updated = applyPowerupEffect(prev, kind);
        setTimeout(() => {
          setPlayer(current => {
            const reset = { ...current };
            if (kind === POWERUP_TYPES.RAPID_FIRE) {
              reset.rapidFire = false;
              reset.fireCooldown = 0.22;
            } else {
              reset.weaponLevel = Math.max(1, reset.weaponLevel - 1);
              reset.weaponType = null;
            }
            return reset;
          });
        }, 10000);  // Powerup lasts 10 seconds
        return updated;
      });
    } else if (kind === 'shield') {
      AudioManager.playSound('shieldActivate', 0.7);
      setPlayer(prev => ({ ...prev, shield: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, shield: false })), 4000);
    } else if (kind === 'slow') {
      setEnemies(prev => prev.map(e => ({ ...e, speed: e.speed * 0.6 })));
      setTimeout(() => setEnemies(prev => prev.map(e => ({ ...e, speed: levelEnemySpeed }))), 3000);
    }
  };

  const makeEnemyBullet = (enemy) => {
    const cx = enemy.x + enemy.size / 2;
    const cy = enemy.y + enemy.size;
    return {
      x: cx - BULLET_WIDTH / 2,
      y: cy,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: levelEnemyBulletSpeed || 230
    };
  };

  const fireWeapon = (force = false) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer.alive || fireCooldownRef.current > 0) return;
    if (!force && (isPaused || showGuide || !canFire)) return;
    
    const fireRate = currentPlayer.rapidFire ? 0.12 : 0.22;
    fireCooldownRef.current = fireRate;
    if (!force) setCanFire(false);
    
    const centerX = currentPlayer.x + currentPlayer.width / 2;
    const mk = (off, spd) => ({
      x: centerX + off - BULLET_WIDTH / 2,
      y: currentPlayer.y - BULLET_HEIGHT,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: spd
    });
    let b = [];
    
    if (currentPlayer.weaponType === POWERUP_TYPES.SPREAD_SHOT) {
      const angles = [-0.4, -0.2, 0, 0.2, 0.4];
      angles.forEach(angle => {
        const speed = 420;
        const offsetX = Math.sin(angle) * 20;
        const offsetY = -Math.cos(angle) * 5;
        b.push(mk(offsetX, speed + offsetY * 10));
      });
    } else if (currentPlayer.weaponLevel === 1) {
      b.push(mk(0, 420));
    } else if (currentPlayer.weaponLevel === 2 || currentPlayer.weaponType === POWERUP_TYPES.DOUBLE_SHOT) {
      b.push(mk(-8, 430));
      b.push(mk(8, 430));
    } else if (currentPlayer.weaponLevel === 3 || currentPlayer.weaponType === POWERUP_TYPES.TRIPLE_SHOT) {
      b.push(mk(0, 440));
      b.push(mk(-10, 430));
      b.push(mk(10, 430));
    }
    
    // Add muzzle flash effects
    const muzzleFlashY = currentPlayer.y - BULLET_HEIGHT;
    if (currentPlayer.weaponType === POWERUP_TYPES.SPREAD_SHOT || currentPlayer.weaponLevel >= 3) {
      setMuzzleFlashes(prev => [...prev, 
        { x: centerX - 12, y: muzzleFlashY, life: 0.1, id: Date.now() },
        { x: centerX, y: muzzleFlashY, life: 0.1, id: Date.now() + 1 },
        { x: centerX + 12, y: muzzleFlashY, life: 0.1, id: Date.now() + 2 }
      ]);
      AudioManager.playSound(currentPlayer.weaponType === POWERUP_TYPES.SPREAD_SHOT ? 'playerShootSpread' : 'playerShoot', 0.3);
    } else if (currentPlayer.weaponLevel === 2 || currentPlayer.weaponType === POWERUP_TYPES.DOUBLE_SHOT) {
      setMuzzleFlashes(prev => [...prev, 
        { x: centerX - 8, y: muzzleFlashY, life: 0.1, id: Date.now() },
        { x: centerX + 8, y: muzzleFlashY, life: 0.1, id: Date.now() + 1 }
      ]);
      AudioManager.playSound('playerShoot', 0.3);
    } else {
      setMuzzleFlashes(prev => [...prev, { x: centerX, y: muzzleFlashY, life: 0.1, id: Date.now() }]);
      AudioManager.playSound(currentPlayer.rapidFire ? 'playerShootRapid' : 'playerShoot', 0.3);
    }
    
    setBullets(prev => [...prev, ...b]);
  };

  // Use spawner module with current config
  const spawnConfig = {
    width,
    enemySpeed: levelEnemySpeed,
    patterns: stageConfig.patterns
  };
  
  const handleSpawnCount = (count) => {
    totalEnemiesSpawnedRef.current += count;
  };
  
  const spawnWave = () => spawnWaveFromModule(spawnConfig, handleSpawnCount);


  const handleBossFire = (dt) => {
    setBoss(prev => {
      if (!prev || !prev.alive) return prev;
      const next = { ...prev };
      next.fireCooldown -= dt;
      if (next.fireCooldown <= 0) {
        const pattern = bossCurrentPattern(next, STAGE);
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const bulletsToAdd = generateBossBullets(next, pattern, STAGE, playerCenterX, playerCenterY);
        setEnemyBullets(prevB => [...prevB, ...bulletsToAdd]);
        next.fireCooldown = 1.1;
      }
      return next;
    });
  };

  const handlePlayerHit = () => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    if (player.shield) {
      AudioManager.playSound('shieldActivate', 0.5);
      setPlayer(prev => ({ ...prev, shield: false }));
      setScoreTexts(prev => [...prev, {
        x: playerCenterX,
        y: playerCenterY - 30,
        text: 'Shield Saved!',
        color: '#38bdf8',
        life: 1.2,
        id: Date.now() + Math.random()
      }]);
      return;
    }

    triggerScreenshake(screenshake.current, 10, 0.3);
    AudioManager.playSound('playerHit', 0.8);
    setPlayerHitFlash(1);
    setHudPulse(1);
    
    // Track hit taken for achievement
    setSessionStats(prev => ({
      ...prev,
      hitsTaken: prev.hitsTaken + 1
    }));
    
    setExplosions(prev => [...prev, spawnExplosion(playerCenterX, playerCenterY, 34, 0.4, '#3b82f6')]);
    setParticles(prev => [...prev, ...spawnExplosionParticles(playerCenterX, playerCenterY, 30, 'energy', '#3b82f6')]);
    setScoreTexts(prev => [...prev, {
      x: playerCenterX,
      y: playerCenterY - 20,
      text: '-1 LIFE',
      color: '#f87171',
      life: 1.2,
      id: Date.now() + Math.random()
    }]);

    setPlayer(prev => ({ ...prev, lives: prev.lives - 1 }));
    setBullets([]); setEnemies([]); setEnemyBullets([]);
    if (player.lives - 1 <= 0) {
      AudioManager.playSound('playerDeath', 0.9);
      setPlayer(prev => ({ ...prev, alive: false }));
      setGameOver(true);
      setIsPaused(true);
    }
  };

  const resetGame = () => {
    setScore(0);
    setBullets([]); setEnemyBullets([]); setEnemies([]);
    setExplosions([]); setParticles([]); setPowerups([]);
    setBoss(null); setBossSpawned(false);
    setCombo(0);
    comboRef.current = 0;
    setComboTimer(0);
    totalEnemiesSpawnedRef.current = 0;
    setCurrentStage('stage1'); // Reset to first stage
    setStageComplete(false);
    setPlayer({
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
    });
    setGameOver(false);
    setIsPaused(false);
    setShowGuide(false);
    setAutoFire(false);
    setPlayerHitFlash(0);
    setHudPulse(0);
    setScoreTexts([]);
    setCanFire(true);
    resetStars();
    setInitialWaveSpawned(false);
    enemySpawnTimerRef.current = 0;
    fireCooldownRef.current = 0;
    lastTimeRef.current = Date.now();
  };

  const handlePauseToggle = () => {
    if (gameOver || showGuide) return;
    setIsPaused(prev => !prev);
  };

  const handleExitToMenu = () => {
    setIsPaused(true);
    onExit();
  };

  const handleGuideDismiss = () => {
    setShowGuide(false);
    setIsPaused(false);
    lastTimeRef.current = Date.now();
  };

  const handleAutoToggle = () => setAutoFire(prev => !prev);

  const triggerBonusRound = () => {
    setInBonusRound(true);
    setBonusTimeLeft(10);
    bonusTimerRef.current = Date.now();
    setScoreTexts(prev => [
      ...prev,
      {
        x: width / 2,
        y: height * 0.3,
        text: 'BONUS SHOOT-OUT!',
        color: '#fb923c',
        life: 1.2,
        id: Date.now() + Math.random()
      }
    ]);
  };

  const { ox, oy } = screenOffset.current;
  const hudScale = 1 + hudPulse * 0.08;
  const timestamp = Date.now();
  const flameLength = 20 + Math.sin(timestamp / 120) * 8;
  const flameWidth = 8 + Math.sin(timestamp / 80) * 2;
  const nebulaPulse = 0.25 + 0.2 * Math.sin(timestamp / 1500);
  const nebulaPulseAlt = 0.2 + 0.15 * Math.sin(timestamp / 1100 + 1);
  const fireButtonDisabled = !canFire || isPaused || gameOver || showGuide;

  return (
    <View style={styles.container} {...panHandlers}>
      <Canvas style={styles.canvas}>
        <Background 
          width={width} 
          height={height} 
          ox={ox} 
          oy={oy} 
          nebulaPulse={nebulaPulse} 
          nebulaPulseAlt={nebulaPulseAlt} 
        />
        <StarField stars={stars} ox={ox} oy={oy} />
        
        {player.alive && (
          <PlayerShip
            player={player}
            ox={ox}
            oy={oy}
            flameLength={flameLength}
            flameWidth={flameWidth}
            inBonusRound={inBonusRound}
            hitFlash={playerHitFlash}
          />
        )}

        <MuzzleFlashes flashes={muzzleFlashes} ox={ox} oy={oy} />
        <PlayerBullets bullets={bullets} ox={ox} oy={oy} />
        <EnemyBullets bullets={enemyBullets} ox={ox} oy={oy} />
        <Enemies enemies={enemies} ox={ox} oy={oy} />
        <BossShip boss={boss} ox={ox} oy={oy} screenWidth={width} />
        <Explosions explosions={explosions} ox={ox} oy={oy} />
        <Particles particles={particles} ox={ox} oy={oy} />
        <Powerups powerups={powerups} ox={ox} oy={oy} />
      </Canvas>

      <HitFlash intensity={playerHitFlash} />
      <LevelBanner text={levelBanner} visible={!inBonusRound} />
      <BonusBanner visible={inBonusRound} timeLeft={bonusTimeLeft} />

      <GameHUD
        score={score}
        currentStage={currentStage}
        level={level}
        levelKills={levelKills}
        levelTarget={levelTarget}
        lives={player.lives}
        hasShield={player.shield}
        isPaused={isPaused}
        hudScale={hudScale}
        onPauseToggle={handlePauseToggle}
        onExit={handleExitToMenu}
      />

      <FireButton
        position={fireButtonPosition}
        disabled={fireButtonDisabled}
        autoFire={autoFire}
        onFire={fireWeapon}
        visible={player.alive && !gameOver}
      />

      <ScorePopup items={scoreTexts} offsetX={ox} offsetY={oy} />

      <PauseOverlay
        visible={isPaused && !gameOver && !showGuide}
        onResume={() => setIsPaused(false)}
        onExit={handleExitToMenu}
        autoFire={autoFire}
        onToggleAutoFire={handleAutoToggle}
        tiltControl={tiltControlEnabled}
        onToggleTiltControl={() => setTiltControlEnabled(prev => !prev)}
        tiltSensitivity={tiltSensitivity}
        onChangeTiltSensitivity={handleTiltSensitivityChange}
        fireButtonPosition={fireButtonPosition}
        onToggleFireButtonPosition={() => handleFireButtonPositionChange(fireButtonPosition === 'left' ? 'right' : 'left')}
        soundsEnabled={audioSettings.soundsEnabled}
        musicEnabled={audioSettings.musicEnabled}
        soundVolume={audioSettings.soundVolume}
        musicVolume={audioSettings.musicVolume}
        onToggleSounds={handleToggleSounds}
        onToggleMusic={handleToggleMusic}
        onChangeSoundVolume={handleChangeSoundVolume}
        onChangeMusicVolume={handleChangeMusicVolume}
      />

      <ControlHintsOverlay 
        visible={showGuide && !gameOver} 
        onDismiss={handleGuideDismiss}
        onBack={showTutorial ? onExit : null}
      />

      <StageCompleteOverlay 
        visible={stageComplete && !gameOver} 
        currentStage={currentStage} 
        allStages={STAGES} 
      />

      {gameOver && (
        <GameOverOverlay score={score} onRetry={resetGame} onExit={onExit} />
      )}
      
      {achievementToast && (
        <AchievementToast achievement={achievementToast} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { flex: 1 }
});
