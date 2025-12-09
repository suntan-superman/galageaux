import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { Canvas, Rect, Circle, Group, Path, LinearGradient, vec } from '@shopify/react-native-skia';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import wavesConfig from '../config/waves.json';
import enemiesConfig from '../config/enemies.json';
import { aabb } from '../engine/collision';
import { diveOffset } from '../engine/paths';
import { spawnExplosionParticles, updateParticles, spawnExplosion, updateExplosion } from '../engine/particles';
import { createScreenshake, triggerScreenshake, updateScreenshake } from '../engine/screenshake';
import { getFormationOffsets, createFormation, updateFormation } from '../engine/formations';
import { createBoss, updateBoss, bossCurrentPattern } from '../engine/boss';
import { startSwoop, updateSwoop } from '../engine/swoops';
import { POWERUP_TYPES, createPowerup, updatePowerup, applyPowerupEffect, getPowerupColor } from '../engine/powerups';
import { generateBossBullets } from '../engine/boss-patterns';
import * as AudioManager from '../engine/audio';
import BossHealthBar from '../components/BossHealthBar';
import PauseOverlay from '../components/PauseOverlay';
import ControlHintsOverlay from '../components/ControlHintsOverlay';
import { PLAYER_WIDTH, PLAYER_HEIGHT, ENEMY_SIZE, BULLET_WIDTH, BULLET_HEIGHT, POWERUP_SIZE } from '../entities/types';
import GameOverOverlay from './GameOverOverlay';

const STAGE = 'stage1';
const STAR_COLORS = ['56,189,248', '248,250,252', '244,114,182'];
const STORAGE_KEYS = {
  tiltSensitivity: 'galageaux:tiltSensitivity',
  fireButtonPosition: 'galageaux:fireButtonPosition',
  audioSettings: 'galageaux:audioSettings'
};

const getLevelTarget = (level) => {
  // Easier early levels, gradually increasing
  if (level === 1) return 4;
  if (level === 2) return 6;
  if (level === 3) return 8;
  return 6 + level * 3; // Original formula for levels 4+
};

const createStarField = (width, height, count = 70) =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `star-${idx}-${Math.random()}`,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.6,
    speed: 20 + Math.random() * 40,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    twinkleOffset: Math.random() * Math.PI * 2
  }));

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
const [stars, setStars] = useState(() => createStarField(width, height));
const [tiltControlEnabled, setTiltControlEnabled] = useState(true);
const [initialWaveSpawned, setInitialWaveSpawned] = useState(false);
const [tiltSensitivity, setTiltSensitivity] = useState(5);
const [fireButtonPosition, setFireButtonPosition] = useState('right');
const [level, setLevel] = useState(1);
const [levelKills, setLevelKills] = useState(0);
const [levelBanner, setLevelBanner] = useState(null);
  const bonusTimerRef = useRef(0);
  const [bonusTimeLeft, setBonusTimeLeft] = useState(0);
const [inBonusRound, setInBonusRound] = useState(false);
  const [audioSettings, setAudioSettings] = useState({
    soundsEnabled: true,
    musicEnabled: true,
    soundVolume: 0.7,
    musicVolume: 0.5
  });

  const lastTimeRef = useRef(Date.now());
  const fireCooldownRef = useRef(0);
  const enemySpawnTimerRef = useRef(0);
  const totalEnemiesSpawnedRef = useRef(0);
  const screenshake = useRef(createScreenshake());
  const screenOffset = useRef({ ox: 0, oy: 0 });
  const stageConfig = wavesConfig[STAGE];
  const playerRef = useRef(player);
  const pausedRef = useRef(false);
  const tiltCurrent = useRef(0);
  const tiltTarget = useRef(0);
  const bulletsRef = useRef(bullets);
  const enemyBulletsRef = useRef(enemyBullets);
  const enemiesRef = useRef(enemies);
  const explosionsRef = useRef(explosions);
  const particlesRef = useRef(particles);
  const powerupsRef = useRef(powerups);
  const bossRef = useRef(boss);
const levelTarget = getLevelTarget(level);
const bonusMultiplier = inBonusRound ? 1.5 : 1;

// Gentler difficulty curve - easier early levels
const getDifficultyMultiplier = (level) => {
  // Level 1: 0.6x (much easier)
  // Level 2: 0.7x (easier)
  // Level 3: 0.8x (slightly easier)
  // Level 4+: gradual increase
  if (level === 1) return 0.6;
  if (level === 2) return 0.7;
  if (level === 3) return 0.8;
  if (level === 4) return 0.9;
  // Levels 5+ use progressive scaling
  return Math.min(1.0, 0.9 + (level - 4) * 0.05);
};

const difficultyMultiplier = getDifficultyMultiplier(level);
const bonusFactor = inBonusRound ? 0.6 : 1;

// Spawn interval: longer intervals in early levels (fewer enemies)
const baseSpawnInterval = stageConfig.spawnInterval / difficultyMultiplier;
const levelSpawnInterval = Math.max(0.5, (baseSpawnInterval - (level - 1) * 0.03) * bonusFactor);

// Max enemies: fewer enemies in early levels
const baseMaxEnemies = Math.floor(stageConfig.maxEnemies * difficultyMultiplier);
const levelMaxEnemies = Math.max(3, baseMaxEnemies + Math.floor((level - 1) * 2)) + (inBonusRound ? 3 : 0);

// Enemy speed: slower in early levels
const levelEnemySpeed = stageConfig.enemySpeed * difficultyMultiplier * (1 + (level - 1) * 0.08) * (inBonusRound ? 1.25 : 1);

// Enemy bullet speed: slower in early levels
const levelEnemyBulletSpeed = stageConfig.enemyBulletSpeed * difficultyMultiplier * (1 + (level - 1) * 0.06);

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

  useEffect(() => {
    setStars(createStarField(width, height));
  }, [width, height]);

  // Initialize audio system
  useEffect(() => {
    let mounted = true;
    
    const initAudio = async () => {
      await AudioManager.initializeAudio();
      
      // Load saved audio settings
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.audioSettings);
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

  // Update music tempo based on level
  useEffect(() => {
    AudioManager.setMusicTempo(level);
  }, [level]);

  useEffect(() => {
    setLevelBanner('LEVEL 01');
  }, []);

  useEffect(() => {
    if (!levelBanner) return;
    const t = setTimeout(() => setLevelBanner(null), 1500);
    return () => clearTimeout(t);
  }, [levelBanner]);

  useEffect(() => {
    (async () => {
      try {
        const storedSensitivity = await AsyncStorage.getItem(STORAGE_KEYS.tiltSensitivity);
        if (storedSensitivity) {
          const value = parseInt(storedSensitivity, 10);
          if (!Number.isNaN(value)) {
            setTiltSensitivity(Math.min(10, Math.max(1, value)));
          }
        }
        const storedPosition = await AsyncStorage.getItem(STORAGE_KEYS.fireButtonPosition);
        if (storedPosition && (storedPosition === 'left' || storedPosition === 'right')) {
          setFireButtonPosition(storedPosition);
        }
      } catch (err) {
        console.warn('Failed to load settings', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showGuide && !initialWaveSpawned && enemies.length === 0) {
      setEnemies(spawnWave());
      setInitialWaveSpawned(true);
      enemySpawnTimerRef.current = 0;
    }
  }, [showGuide, initialWaveSpawned, enemies.length]);

useEffect(() => {
  if (!tiltControlEnabled) {
    tiltCurrent.current = 0;
    tiltTarget.current = 0;
    return;
  }
  Accelerometer.setUpdateInterval(16);
  const sub = Accelerometer.addListener(({ x }) => {
    tiltTarget.current = x;
  });
  return () => {
    sub && sub.remove();
  };
}, [tiltControlEnabled, width]);

  const clampPlayerX = (value) => {
    const half = playerRef.current.width / 2;
    return Math.max(0, Math.min(width - playerRef.current.width, value - half));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !tiltControlEnabled && !pausedRef.current && playerRef.current.alive && !gameOver,
      onMoveShouldSetPanResponder: () => !tiltControlEnabled && !pausedRef.current && playerRef.current.alive && !gameOver,
      onPanResponderMove: (_evt, gesture) => {
        if (pausedRef.current) return;
        const nextX = clampPlayerX(gesture.moveX);
        setPlayer(prev => ({
          ...prev,
          x: nextX
        }));
      }
    })
  ).current;

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

  const step = (dt) => {
    // Safety check: if player has no lives left, trigger game over
    if (playerRef.current.lives <= 0 && playerRef.current.alive) {
      setPlayer(prev => ({ ...prev, alive: false }));
      setGameOver(true);
      setIsPaused(true);
      return;
    }
    
    const { ox, oy } = updateScreenshake(screenshake.current, dt);
    screenOffset.current = { ox, oy };

    const currentBullets = bulletsRef.current;
    const currentEnemyBullets = enemyBulletsRef.current;
    const currentEnemies = enemiesRef.current;
    const currentExplosions = explosionsRef.current;
    const currentParticles = particlesRef.current;
    const currentPowerups = powerupsRef.current;
    const currentBoss = bossRef.current;

    setPlayerHitFlash(prev => (prev > 0 ? Math.max(0, prev - dt * 2.5) : 0));
    setHudPulse(prev => (prev > 0 ? Math.max(0, prev - dt * 2) : 0));
    setMuzzleFlashes(prev => prev.map(mf => ({ ...mf, life: mf.life - dt })).filter(mf => mf.life > 0));
    setComboTimer(prev => {
      const next = Math.max(0, prev - dt);
      if (next === 0 && prev > 0) {
        setCombo(0);
        comboRef.current = 0;
      }
      return next;
    });

    setStars(prev => prev.map(star => {
      let nextY = star.y + star.speed * dt;
      let nextX = star.x;
      if (nextY > height) {
        nextY = -5;
        nextX = Math.random() * width;
      }
      const twinkle = 0.5 + 0.5 * Math.sin((Date.now() / 600) + star.twinkleOffset);
      return { ...star, y: nextY, x: nextX, twinkle };
    }));

    const currentPlayer = playerRef.current;

    if (tiltControlEnabled && currentPlayer.alive) {
      const smoothed = tiltCurrent.current * 0.85 + tiltTarget.current * 0.15;
      tiltCurrent.current = smoothed;
      const sensitivityFactor = tiltSensitivity / 5;
      const bonusFactor = inBonusRound ? 1.25 : 1;
      const delta = -smoothed * width * dt * 2.1 * sensitivityFactor * bonusFactor;
      if (Math.abs(delta) > 0.05) {
        setPlayer(prev => {
          const nextX = Math.max(0, Math.min(width - prev.width, prev.x + delta));
          return nextX === prev.x ? prev : { ...prev, x: nextX };
        });
      }
    }

    if (fireCooldownRef.current > 0) {
      fireCooldownRef.current = Math.max(0, fireCooldownRef.current - dt);
      if (fireCooldownRef.current === 0) setCanFire(true);
    } else if (autoFire && currentPlayer.alive && !isPaused && !showGuide) {
      fireWeapon(true);
    }

    setScoreTexts(prev =>
      prev
        .map(st => ({ ...st, y: st.y - dt * 50, life: st.life - dt }))
        .filter(st => st.life > 0)
    );

    let updatedParticles = updateParticles(currentParticles, dt);
    let updatedExplosions = currentExplosions
      .map(ex => updateExplosion(ex, dt))
      .filter(ex => ex && ex.life > 0);
    let fallingPowerups = currentPowerups
      .map(p => updatePowerup(p, dt))
      .filter(p => p.y < height + p.size && !p.collected);

    const movedPlayerBullets = currentBullets
      .map(b => ({ ...b, y: b.y - b.speed * dt }))
      .filter(b => b.y + b.height > 0);

    let movedEnemyBullets = currentEnemyBullets
      .map(b => {
        if (b.vx !== undefined && b.vy !== undefined) {
          return { ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt };
        }
        return { ...b, y: b.y + b.speed * dt };
      })
      .filter(b => b.y - b.height < height && b.x > -b.width * 2 && b.x < width + b.width * 2);

    const enemyShots = [];
    const advancedEnemies = [];
    const spawnBuffer = [];
    let killsEarned = 0;
    currentEnemies.forEach(e => {
      let y = e.y + e.speed * dt;
      let x = e.x;
      if (e.pattern === 'zigzag') {
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
          // Easier early levels: enemies shoot less frequently
          const baseCooldown = level <= 2 ? 2.5 : level <= 4 ? 1.8 : 1.2;
          const randomVariation = level <= 2 ? 1.5 : level <= 4 ? 1.2 : 1.3;
          nextEnemy.fireCooldown = baseCooldown + Math.random() * randomVariation;
        }
      }

      advancedEnemies.push(nextEnemy);
    });

    if (enemyShots.length) {
      movedEnemyBullets = movedEnemyBullets.concat(enemyShots);
    }

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

    let upcomingBoss = currentBoss;
    if (!bossSpawned && totalEnemiesSpawnedRef.current >= stageConfig.maxEnemies) {
      upcomingBoss = createBoss(STAGE, width);
      setBossSpawned(true);
      AudioManager.playSound('bossAppear', 0.9);
      AudioManager.playMusic('boss');
      triggerScreenshake(screenshake.current, 12, 0.4);
    }

    if (upcomingBoss && upcomingBoss.alive) {
      upcomingBoss = updateBoss({ ...upcomingBoss }, dt, STAGE);
      const playerCenterX = currentPlayer.x + currentPlayer.width / 2;
      const playerCenterY = currentPlayer.y + currentPlayer.height / 2;
      upcomingBoss.fireCooldown -= dt;
      if (upcomingBoss.fireCooldown <= 0) {
        const pattern = bossCurrentPattern(upcomingBoss, STAGE);
        movedEnemyBullets = movedEnemyBullets.concat(
          generateBossBullets(upcomingBoss, pattern, STAGE, playerCenterX, playerCenterY)
        );
        upcomingBoss.fireCooldown = 1.1;
      }
    }

    const bulletPool = movedPlayerBullets.slice();
    const bulletConsumed = new Array(bulletPool.length).fill(false);
    const survivingEnemies = [];
    let scoreGain = 0;
    let extraPowerups = [];
    let newExplosions = [];
    let newParticles = [];
    let scoreTextAdds = [];

    advancedEnemies.forEach(enemy => {
      let hitIndex = -1;
      for (let i = 0; i < bulletPool.length; i++) {
        const bullet = bulletPool[i];
        if (!bullet || bulletConsumed[i]) continue;
        if (
          aabb(
            { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
            { x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size }
          )
        ) {
          hitIndex = i;
          break;
        }
      }

      if (hitIndex >= 0) {
        bulletConsumed[hitIndex] = true;
        const centerX = enemy.x + enemy.size / 2;
        const centerY = enemy.y + enemy.size / 2;
        newExplosions.push(spawnExplosion(centerX, centerY, 26, 0.25));
        newParticles.push(...spawnExplosionParticles(centerX, centerY, 12, 'default'));
        AudioManager.playSound('enemyDestroy', 0.5);
        const cfg = enemiesConfig[enemy.type] || enemiesConfig['grunt'];
        
        // Combo tracking
        comboRef.current += 1;
        const currentCombo = comboRef.current;
        setCombo(currentCombo);
        setComboTimer(1.5); // Reset combo timer to 1.5 seconds
        
        // Show combo text for combos of 2 or more
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
        
        // Bonus score for combos
        const comboMultiplier = currentCombo >= 5 ? 2 : currentCombo >= 3 ? 1.5 : currentCombo >= 2 ? 1.25 : 1;
        scoreGain += Math.floor(cfg.score * comboMultiplier);
        killsEarned += 1;
        scoreTextAdds.push({
          x: centerX,
          y: centerY,
          text: `+${Math.floor(cfg.score * comboMultiplier)}${currentCombo >= 2 ? ` (${currentCombo}x)` : ''}`,
          color: currentCombo >= 5 ? '#fbbf24' : currentCombo >= 3 ? '#fb923c' : '#22c55e',
          life: 1,
          id: Date.now() + Math.random()
        });
        if (Math.random() < 0.1) {
          extraPowerups.push(createPowerup(centerX - POWERUP_SIZE / 2, centerY, randomPowerupKind()));
        }
      } else {
        survivingEnemies.push(enemy);
      }
    });

    if (newExplosions.length) {
      triggerScreenshake(screenshake.current, 4.5, 0.15);
      updatedExplosions = updatedExplosions.concat(newExplosions);
      if (newParticles.length) updatedParticles = updatedParticles.concat(newParticles);
    }

    let survivingBullets = bulletPool.filter((b, idx) => b && !bulletConsumed[idx]);

    if (upcomingBoss && upcomingBoss.alive) {
      const afterBoss = [];
      let bossHits = 0;
      survivingBullets.forEach(b => {
        if (
          aabb(
            { x: b.x, y: b.y, width: b.width, height: b.height },
            { x: upcomingBoss.x, y: upcomingBoss.y, width: upcomingBoss.width, height: upcomingBoss.height }
          )
        ) {
          bossHits++;
        } else {
          afterBoss.push(b);
        }
      });
      survivingBullets = afterBoss;

      if (bossHits > 0) {
        AudioManager.playSound('enemyHit', 0.4);
        const nextHp = upcomingBoss.hp - bossHits;
            if (nextHp <= 0) {
          const bossCenterX = upcomingBoss.x + upcomingBoss.width / 2;
          const bossCenterY = upcomingBoss.y + upcomingBoss.height / 2;
              triggerScreenshake(screenshake.current, 14, 0.6);
          updatedExplosions.push(spawnExplosion(bossCenterX, bossCenterY, 80, 0.6));
          updatedParticles = updatedParticles.concat(
            spawnExplosionParticles(bossCenterX, bossCenterY, 40, 'debris')
          );
          AudioManager.playSound('bossDeath', 0.8);
          scoreTextAdds.push({
            x: bossCenterX,
            y: bossCenterY,
            text: '+1000',
            color: '#fbbf24',
            life: 1.5,
            id: Date.now() + Math.random(),
            isBoss: true
          });
          scoreGain += 1000;
          upcomingBoss = { ...upcomingBoss, hp: 0, alive: false };
        } else {
          upcomingBoss = { ...upcomingBoss, hp: nextHp };
        }
      }
    }

    const playerRect = {
      x: currentPlayer.x,
      y: currentPlayer.y,
      width: currentPlayer.width,
      height: currentPlayer.height
    };

    let playerHit = false;
    const enemyBulletsAfterPlayer = [];
    // Player is invulnerable during bonus round
    if (!inBonusRound) {
      movedEnemyBullets.forEach(b => {
        if (!playerHit && currentPlayer.alive && aabb(playerRect, b)) {
          playerHit = true;
        } else {
          enemyBulletsAfterPlayer.push(b);
        }
      });
    } else {
      // During bonus round, just remove bullets without checking collision
      enemyBulletsAfterPlayer.push(...movedEnemyBullets);
    }
    if (playerHit) handlePlayerHit();

    const remainingPowerups = [];
    fallingPowerups.forEach(p => {
      if (currentPlayer.alive && aabb(playerRect, { x: p.x, y: p.y, width: p.size, height: p.size })) {
            applyPowerup(p.kind);
      } else {
        remainingPowerups.push(p);
      }
    });

    const finalPowerups = extraPowerups.length ? remainingPowerups.concat(extraPowerups) : remainingPowerups;

    setBullets(survivingBullets);
    setEnemyBullets(enemyBulletsAfterPlayer);
    setEnemies([...survivingEnemies, ...spawnBuffer]);
    setExplosions(updatedExplosions);
    setParticles(updatedParticles);
    setPowerups(finalPowerups);
    setBoss(upcomingBoss);
    if (scoreGain) setScore(prev => prev + scoreGain);
    if (scoreTextAdds.length) {
      setScoreTexts(prev => [...prev, ...scoreTextAdds]);
    }
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
            triggerBonusRound();
            return 0; // Reset to 0, bonus round kills don't count
          }
          return levelTarget;
        }
        return total;
      });
    }
  };
  const randomPowerupKind = () => {
    const kinds = [POWERUP_TYPES.SPREAD_SHOT, POWERUP_TYPES.DOUBLE_SHOT, POWERUP_TYPES.TRIPLE_SHOT, POWERUP_TYPES.RAPID_FIRE, 'shield', 'slow'];
    return kinds[Math.floor(Math.random() * kinds.length)];
  };

  const applyPowerup = (kind) => {
    AudioManager.playSound('powerupCollect', 0.7);
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
        }, 10000);
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

  const spawnWave = () => {
    const roll = Math.random();
    if (roll < 0.3) return spawnFormation('v');
    if (roll < 0.6) return spawnFormation('line');
    return spawnSingleEnemy();
  };

  const spawnFormation = (type) => {
    const created = [];
    const count = 5;
    const offsets = getFormationOffsets(type, count);
    const baseX = width / 2;
    const yStart = -ENEMY_SIZE * 2;
    offsets.forEach((off, idx) => {
      const r = Math.random();
      let typeKey = 'grunt', canShoot = false;
      if (r > 0.7) { typeKey = 'shooter'; canShoot = true; }
      else if (r > 0.4) { typeKey = 'dive'; canShoot = true; }
      const cfg = enemiesConfig[typeKey] || enemiesConfig['grunt'];
      const x = baseX + off.dx - ENEMY_SIZE / 2;
      created.push({
        type: typeKey,
        x,
        y: yStart + off.dy - idx * 8,
        baseX: x,
        size: ENEMY_SIZE,
        speed: levelEnemySpeed,
        hp: cfg.hp,
        pattern: type === 'v' ? 'dive' : 'zigzag',
        canShoot,
        fireCooldown: Math.random() * 1.5 + 0.5
      });
      totalEnemiesSpawnedRef.current += 1;
    });
    return created;
  };

  const spawnSingleEnemy = () => {
    const created = [];
    const pad = 20;
    const pattern = stageConfig.patterns[Math.floor(Math.random() * stageConfig.patterns.length)];
    const r = Math.random();
    let type = 'grunt', canShoot = false;
    if (r > 0.7) { type = 'shooter'; canShoot = true; }
    else if (r > 0.4) { type = 'dive'; canShoot = true; }
    const cfg = enemiesConfig[type] || enemiesConfig['grunt'];
    const x = pad + Math.random() * (width - pad * 2 - ENEMY_SIZE);
    created.push({
      type,
      x,
      y: -ENEMY_SIZE,
      baseX: x,
      size: ENEMY_SIZE,
      speed: levelEnemySpeed,
      hp: cfg.hp,
      pattern,
      canShoot,
      fireCooldown: Math.random() * 1.5 + 0.5
    });
    totalEnemiesSpawnedRef.current += 1;
    return created;
  };


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
    setExplosions(prev => [...prev, spawnExplosion(playerCenterX, playerCenterY, 34, 0.4)]);
    setParticles(prev => [...prev, ...spawnExplosionParticles(playerCenterX, playerCenterY, 24, 'default')]);
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
    setStars(createStarField(width, height));
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

  const handleTiltSensitivityChange = async (nextValue) => {
    setTiltSensitivity(nextValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.tiltSensitivity, String(nextValue));
    } catch (err) {
      console.warn('Failed to save tilt sensitivity', err);
    }
  };

  const handleFireButtonPositionChange = async (position) => {
    setFireButtonPosition(position);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.fireButtonPosition, position);
    } catch (err) {
      console.warn('Failed to save fire button position', err);
    }
  };

  const handleToggleSounds = async () => {
    const newValue = !audioSettings.soundsEnabled;
    setAudioSettings(prev => ({ ...prev, soundsEnabled: newValue }));
    AudioManager.setSoundsEnabled(newValue);
    await saveAudioSettings({ ...audioSettings, soundsEnabled: newValue });
  };

  const handleToggleMusic = async () => {
    const newValue = !audioSettings.musicEnabled;
    setAudioSettings(prev => ({ ...prev, musicEnabled: newValue }));
    await AudioManager.setMusicEnabled(newValue);
    await saveAudioSettings({ ...audioSettings, musicEnabled: newValue });
  };

  const handleChangeSoundVolume = async (volume) => {
    const rounded = Math.round(volume * 10) / 10;
    setAudioSettings(prev => ({ ...prev, soundVolume: rounded }));
    AudioManager.setSoundVolume(rounded);
    await saveAudioSettings({ ...audioSettings, soundVolume: rounded });
  };

  const handleChangeMusicVolume = async (volume) => {
    const rounded = Math.round(volume * 10) / 10;
    setAudioSettings(prev => ({ ...prev, musicVolume: rounded }));
    await AudioManager.setMusicVolume(rounded);
    await saveAudioSettings({ ...audioSettings, musicVolume: rounded });
  };

  const saveAudioSettings = async (settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.audioSettings, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save audio settings', err);
    }
  };

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
  const formattedScore = score.toLocaleString('en-US');
  const livesDisplay = player.lives > 0 ? '❤'.repeat(player.lives) : '☠';
  const shieldStatus = player.shield ? 'ONLINE' : 'OFFLINE';
  const hudScale = 1 + hudPulse * 0.08;
  const timestamp = Date.now();
  const flameLength = 20 + Math.sin(timestamp / 120) * 8;
  const flameWidth = 8 + Math.sin(timestamp / 80) * 2;
  const nebulaPulse = 0.25 + 0.2 * Math.sin(timestamp / 1500);
  const nebulaPulseAlt = 0.2 + 0.15 * Math.sin(timestamp / 1100 + 1);
  const fireButtonDisabled = !canFire || isPaused || gameOver || showGuide;
  const autoBadgeText = autoFire ? 'AUTO ON' : 'MANUAL';

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Rect x={ox} y={oy} width={width} height={height} color="#010314" />
        <Rect x={ox} y={oy} width={width} height={height * 0.65} color="rgba(15,23,42,0.75)" />
        <Circle cx={width * 0.3 + ox} cy={height * 0.25 + oy} r={220} color={`rgba(14,165,233,${nebulaPulse})`} />
        <Circle cx={width * 0.72 + ox} cy={height * 0.18 + oy} r={190} color={`rgba(244,114,182,${nebulaPulseAlt})`} />

        {stars.map(star => {
          const alpha = 0.35 + 0.65 * (star.twinkle ?? 0.5);
          return (
            <Circle
              key={star.id}
              cx={star.x + ox}
              cy={star.y + oy}
              r={star.size}
              color={`rgba(${star.color},${alpha})`}
            />
          );
        })}

        {player.alive && (() => {
          const centerX = player.x + player.width / 2 + ox;
          const centerY = player.y + player.height / 2 + oy;
          const shipX = player.x + ox;
          const shipY = player.y + oy;
          const shipW = player.width;
          const shipH = player.height;
          
          // Enhanced ship design - sleek interceptor with multiple components
          const noseTip = { x: centerX, y: shipY };
          const noseWidth = shipW * 0.15;
          const wingWidth = shipW * 0.45;
          const bodyWidth = shipW * 0.25;
          
          // Main body path - diamond-shaped interceptor
          const mainBodyPath = `M ${noseTip.x} ${noseTip.y} 
            L ${noseTip.x - noseWidth} ${shipY + shipH * 0.25} 
            L ${noseTip.x - wingWidth} ${shipY + shipH * 0.6} 
            L ${noseTip.x - bodyWidth} ${shipY + shipH * 0.85} 
            L ${noseTip.x - bodyWidth * 0.6} ${shipY + shipH} 
            L ${noseTip.x + bodyWidth * 0.6} ${shipY + shipH} 
            L ${noseTip.x + bodyWidth} ${shipY + shipH * 0.85} 
            L ${noseTip.x + wingWidth} ${shipY + shipH * 0.6} 
            L ${noseTip.x + noseWidth} ${shipY + shipH * 0.25} Z`;
          
          // Wing extensions
          const leftWingPath = `M ${noseTip.x - wingWidth} ${shipY + shipH * 0.6} 
            L ${noseTip.x - shipW * 0.5} ${shipY + shipH * 0.55} 
            L ${noseTip.x - wingWidth * 0.9} ${shipY + shipH * 0.7} Z`;
          
          const rightWingPath = `M ${noseTip.x + wingWidth} ${shipY + shipH * 0.6} 
            L ${noseTip.x + shipW * 0.5} ${shipY + shipH * 0.55} 
            L ${noseTip.x + wingWidth * 0.9} ${shipY + shipH * 0.7} Z`;
          
          // Weapon pods on wings
          const leftPodX = noseTip.x - shipW * 0.5;
          const rightPodX = noseTip.x + shipW * 0.5;
          const podY = shipY + shipH * 0.55;
          
          return (
          <Group>
              {/* Outer energy glow */}
              <Circle cx={centerX} cy={centerY} r={26} color="rgba(34,197,94,0.12)" />
              <Circle cx={centerX} cy={centerY} r={22} color="rgba(56,189,248,0.08)" />
              
              {/* Wing extensions (back layer) */}
              <Path path={leftWingPath} color="rgba(16,185,129,0.4)">
                <LinearGradient
                  start={vec(noseTip.x - wingWidth, shipY + shipH * 0.6)}
                  end={vec(noseTip.x - shipW * 0.5, shipY + shipH * 0.55)}
                  colors={['rgba(16,185,129,0.5)', 'rgba(34,197,94,0.3)']}
                />
              </Path>
              <Path path={rightWingPath} color="rgba(16,185,129,0.4)">
                <LinearGradient
                  start={vec(noseTip.x + wingWidth, shipY + shipH * 0.6)}
                  end={vec(noseTip.x + shipW * 0.5, shipY + shipH * 0.55)}
                  colors={['rgba(16,185,129,0.5)', 'rgba(34,197,94,0.3)']}
                />
              </Path>
              
              {/* Main ship body with multi-layer gradient */}
              <Path path={mainBodyPath}>
                <LinearGradient
                  start={vec(centerX, shipY)}
                  end={vec(centerX, shipY + shipH)}
                  colors={['#10b981', '#22c55e', '#16a34a', '#15803d', '#166534']}
                />
              </Path>
              
              {/* Body detail lines */}
              <Path 
                path={`M ${centerX - bodyWidth * 0.5} ${shipY + shipH * 0.4} L ${centerX - bodyWidth * 0.5} ${shipY + shipH * 0.9}`} 
                color="rgba(248,250,252,0.4)" 
                style="stroke"
                strokeWidth={1}
              />
              <Path 
                path={`M ${centerX + bodyWidth * 0.5} ${shipY + shipH * 0.4} L ${centerX + bodyWidth * 0.5} ${shipY + shipH * 0.9}`} 
                color="rgba(248,250,252,0.4)" 
                style="stroke"
                strokeWidth={1}
              />
              
              {/* Wing highlights */}
              <Path 
                path={`M ${noseTip.x - wingWidth * 0.8} ${shipY + shipH * 0.5} L ${noseTip.x - shipW * 0.48} ${shipY + shipH * 0.52} L ${noseTip.x - wingWidth * 0.75} ${shipY + shipH * 0.65} Z`} 
                color="rgba(248,250,252,0.45)" 
              />
              <Path 
                path={`M ${noseTip.x + wingWidth * 0.8} ${shipY + shipH * 0.5} L ${noseTip.x + shipW * 0.48} ${shipY + shipH * 0.52} L ${noseTip.x + wingWidth * 0.75} ${shipY + shipH * 0.65} Z`} 
                color="rgba(248,250,252,0.45)" 
              />
              
              {/* Weapon pods on wings */}
              <Circle cx={leftPodX} cy={podY} r={3.5} color="rgba(56,189,248,0.6)" />
              <Circle cx={leftPodX} cy={podY} r={2} color="rgba(139,92,246,0.8)" />
              <Circle cx={rightPodX} cy={podY} r={3.5} color="rgba(56,189,248,0.6)" />
              <Circle cx={rightPodX} cy={podY} r={2} color="rgba(139,92,246,0.8)" />
              
              {/* Enhanced cockpit/canopy */}
              <Circle cx={centerX} cy={shipY + shipH * 0.3} r={5} color="rgba(14,165,233,0.5)" />
              <Circle cx={centerX} cy={shipY + shipH * 0.3} r={3.5} color="rgba(56,189,248,0.7)" />
              <Circle cx={centerX} cy={shipY + shipH * 0.3} r={2} color="rgba(139,92,246,0.9)" />
              {/* Cockpit reflection */}
              <Circle cx={centerX - 1} cy={shipY + shipH * 0.28} r={1.2} color="rgba(248,250,252,0.6)" />
              
              {/* Nose detail */}
              <Circle cx={centerX} cy={shipY + 2} r={2} color="rgba(56,189,248,0.8)" />
              
              {/* Engine exhaust ports */}
              <Rect 
                x={centerX - shipW * 0.18} 
                y={shipY + shipH * 0.92} 
                width={shipW * 0.08} 
                height={shipH * 0.08} 
                color="rgba(15,23,42,0.8)" 
              />
              <Rect 
                x={centerX + shipW * 0.1} 
                y={shipY + shipH * 0.92} 
                width={shipW * 0.08} 
                height={shipH * 0.08} 
                color="rgba(15,23,42,0.8)" 
              />
              
              {/* Main thruster - enhanced with multiple layers */}
              <Rect
                x={centerX - flameWidth / 2 + ox}
                y={shipY + shipH + oy}
                width={flameWidth}
                height={flameLength}
                color="rgba(14,165,233,0.8)"
              >
                <LinearGradient
                  start={vec(centerX, shipY + shipH)}
                  end={vec(centerX, shipY + shipH + flameLength)}
                  colors={['rgba(14,165,233,0.9)', 'rgba(56,189,248,0.7)', 'rgba(139,92,246,0.4)', 'rgba(248,250,252,0.2)']}
                />
              </Rect>
              
              {/* Thruster core with pulsing effect */}
              <Circle 
                cx={centerX} 
                cy={shipY + shipH + flameLength * 0.5 + oy} 
                r={flameWidth * 0.45} 
                color="rgba(248,250,252,0.7)" 
              />
              <Circle 
                cx={centerX} 
                cy={shipY + shipH + flameLength * 0.5 + oy} 
                r={flameWidth * 0.25} 
                color="rgba(139,92,246,0.9)" 
              />
              
              {/* Side maneuvering thrusters - enhanced */}
              <Rect
                x={centerX - shipW * 0.32 - 2.5 + ox}
                y={shipY + shipH * 0.72 + oy}
                width={5}
                height={flameLength * 0.5}
                color="rgba(14,165,233,0.5)"
              >
                <LinearGradient
                  start={vec(centerX - shipW * 0.32, shipY + shipH * 0.72)}
                  end={vec(centerX - shipW * 0.32, shipY + shipH * 0.72 + flameLength * 0.5)}
                  colors={['rgba(14,165,233,0.6)', 'rgba(56,189,248,0.4)', 'rgba(139,92,246,0.2)']}
                />
              </Rect>
              <Rect
                x={centerX + shipW * 0.27 - 2.5 + ox}
                y={shipY + shipH * 0.72 + oy}
                width={5}
                height={flameLength * 0.5}
                color="rgba(14,165,233,0.5)"
              >
                <LinearGradient
                  start={vec(centerX + shipW * 0.27, shipY + shipH * 0.72)}
                  end={vec(centerX + shipW * 0.27, shipY + shipH * 0.72 + flameLength * 0.5)}
                  colors={['rgba(14,165,233,0.6)', 'rgba(56,189,248,0.4)', 'rgba(139,92,246,0.2)']}
                />
              </Rect>
              
              {/* Shield effect - enhanced */}
            {player.shield && (
                <>
                  <Circle cx={centerX} cy={centerY} r={32} color="rgba(56,189,248,0.15)" />
                  <Circle cx={centerX} cy={centerY} r={28} color="rgba(139,92,246,0.2)" />
                  <Circle cx={centerX} cy={centerY} r={24} color="rgba(56,189,248,0.25)" />
                </>
            )}
              
              {/* Bonus round invulnerability effect */}
              {inBonusRound && (
                <>
                  <Circle cx={centerX} cy={centerY} r={34} color="rgba(251,191,36,0.2)" />
                  <Circle cx={centerX} cy={centerY} r={30} color="rgba(251,191,36,0.3)" />
                  <Circle cx={centerX} cy={centerY} r={26} color="rgba(251,191,36,0.25)" />
                </>
              )}
              
              {/* Hit flash */}
              {playerHitFlash > 0 && (
                <>
                  <Circle cx={centerX} cy={centerY} r={30} color={`rgba(248,113,113,${playerHitFlash * 0.4})`} />
                  <Circle cx={centerX} cy={centerY} r={24} color={`rgba(248,113,113,${playerHitFlash * 0.6})`} />
                </>
        )}
            </Group>
          );
        })()}

        {/* Muzzle flashes */}
        {muzzleFlashes.map((mf, i) => {
          const alpha = Math.max(0, mf.life / 0.1);
          return (
            <Group key={`muzzle-${mf.id}`}>
              <Circle cx={mf.x + ox} cy={mf.y + oy} r={12 * alpha} color={`rgba(248,250,252,${alpha * 0.8})`} />
              <Circle cx={mf.x + ox} cy={mf.y + oy} r={8 * alpha} color={`rgba(56,189,248,${alpha * 0.9})`} />
              <Circle cx={mf.x + ox} cy={mf.y + oy} r={5 * alpha} color={`rgba(139,92,246,${alpha})`} />
            </Group>
          );
        })}

        {bullets.map((b, i) => {
          const bulletCenterX = b.x + b.width / 2 + ox;
          const bulletCenterY = b.y + b.height / 2 + oy;
          return (
          <Group key={`pb-${i}`}>
            {/* Bullet trail */}
            <Circle cx={bulletCenterX} cy={bulletCenterY + 8} r={2} color="rgba(56,189,248,0.4)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY + 12} r={1.5} color="rgba(56,189,248,0.2)" />
            {/* Outer glow */}
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={6} color="rgba(248,250,252,0.2)" />
            {/* Main bullet body with gradient */}
            <Rect x={b.x + ox} y={b.y + oy} width={b.width} height={b.height} color="#f8fafc" />
            {/* Core glow */}
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={2.5} color="rgba(56,189,248,0.9)" />
            <Circle cx={bulletCenterX} cy={bulletCenterY} r={1.5} color="rgba(139,92,246,1)" />
          </Group>
          );
        })}

        {enemyBullets.map((b, i) => (
          <Group key={`eb-${i}`}>
            <Circle cx={(b.x || 0) + b.width / 2 + ox} cy={(b.y || 0) + oy} r={5} color="rgba(249,115,22,0.25)" />
            <Rect x={(b.x || 0) + ox} y={(b.y || 0) + oy} width={b.width} height={b.height} color="#fb923c" />
          </Group>
        ))}

        {enemies.map((e, i) => {
          const enemyCenterX = e.x + e.size / 2 + ox;
          const enemyCenterY = e.y + e.size / 2 + oy;
          const enemyColor = enemiesConfig[e.type]?.color || '#38bdf8';
          const enemyGlow = e.type === 'shooter' ? 'rgba(249,115,22,0.3)' : e.type === 'dive' ? 'rgba(34,197,94,0.3)' : 'rgba(56,189,248,0.3)';
          
          return (
          <Group key={`e-${i}`}>
            {/* Outer glow */}
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size / 2 + 8} color="rgba(15,23,42,0.6)" />
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size / 2 + 4} color={enemyGlow} />
            
            {/* Enemy body with pattern */}
            <Rect x={e.x + ox} y={e.y + oy} width={e.size} height={e.size} color={enemyColor} />
            
            {/* Inner detail - crosshair pattern for shooters */}
            {e.canShoot && (
              <>
                <Rect 
                  x={enemyCenterX - e.size * 0.15} 
                  y={enemyCenterY - e.size * 0.4} 
                  width={e.size * 0.3} 
                  height={e.size * 0.8} 
                  color="rgba(248,250,252,0.4)" 
                />
                <Rect 
                  x={enemyCenterX - e.size * 0.4} 
                  y={enemyCenterY - e.size * 0.15} 
                  width={e.size * 0.8} 
                  height={e.size * 0.3} 
                  color="rgba(248,250,252,0.4)" 
                />
              </>
            )}
            
            {/* Center core */}
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size * 0.15} color="rgba(248,250,252,0.6)" />
            <Circle cx={enemyCenterX} cy={enemyCenterY} r={e.size * 0.08} color="rgba(15,23,42,0.8)" />
            
            {/* Corner accents */}
            <Circle cx={e.x + ox + e.size * 0.2} cy={e.y + oy + e.size * 0.2} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.8} cy={e.y + oy + e.size * 0.2} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.2} cy={e.y + oy + e.size * 0.8} r={1.5} color="rgba(248,250,252,0.5)" />
            <Circle cx={e.x + ox + e.size * 0.8} cy={e.y + oy + e.size * 0.8} r={1.5} color="rgba(248,250,252,0.5)" />
          </Group>
          );
        })}

        {boss && boss.alive && (() => {
          const bossCenterX = boss.x + boss.width / 2 + ox;
          const bossCenterY = boss.y + boss.height / 2 + oy;
          const hpRatio = boss.hp / boss.maxHp;
          const bossGlowColor = hpRatio > 0.5 ? 'rgba(168,85,247,0.4)' : hpRatio > 0.25 ? 'rgba(249,115,22,0.4)' : 'rgba(239,68,68,0.5)';
          
          return (
          <Group>
            {/* Outer energy field */}
            <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width / 2 + 20} color="rgba(147,51,234,0.2)" />
            <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width / 2 + 14} color={bossGlowColor} />
            
            {/* Boss body with pattern */}
            <Rect x={boss.x + ox} y={boss.y + oy} width={boss.width} height={boss.height} color="#a855f7" />
            
            {/* Inner details */}
            <Rect 
              x={bossCenterX - boss.width * 0.3} 
              y={bossCenterY - boss.height * 0.15} 
              width={boss.width * 0.6} 
              height={boss.height * 0.3} 
              color="rgba(248,250,252,0.3)" 
            />
            <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width * 0.2} color="rgba(248,250,252,0.5)" />
            <Circle cx={bossCenterX} cy={bossCenterY} r={boss.width * 0.12} color="rgba(15,23,42,0.8)" />
            
            {/* Corner details */}
            <Circle cx={boss.x + ox + boss.width * 0.15} cy={boss.y + oy + boss.height * 0.15} r={2} color="rgba(248,250,252,0.6)" />
            <Circle cx={boss.x + ox + boss.width * 0.85} cy={boss.y + oy + boss.height * 0.15} r={2} color="rgba(248,250,252,0.6)" />
            <Circle cx={boss.x + ox + boss.width * 0.15} cy={boss.y + oy + boss.height * 0.85} r={2} color="rgba(248,250,252,0.6)" />
            <Circle cx={boss.x + ox + boss.width * 0.85} cy={boss.y + oy + boss.height * 0.85} r={2} color="rgba(248,250,252,0.6)" />
            
            <BossHealthBar
              health={boss.hp}
              maxHealth={boss.maxHp}
              x={width / 2 - 100 + ox}
              y={40 + oy}
              width={200}
              height={16}
            />
          </Group>
          );
        })()}

        {explosions.map((ex, i) => {
          if (!ex || ex.life <= 0) return null;
          const progress = 1 - (ex.life / ex.maxLife);
          const alpha = 0.85 * (1 - progress);
          return (
            <Circle
              key={`ex-${i}`}
              cx={ex.x + ox}
              cy={ex.y + oy}
              r={ex.radius}
              color={`rgba(248,250,252,${alpha})`}
            />
          );
        })}

        {particles.map((p, i) => (
          <Circle key={`p-${i}`} cx={p.x + ox} cy={p.y + oy} r={p.radius} color={p.color || "rgba(248,250,252,0.8)"} />
        ))}

        {powerups.map((p, i) => {
          const px = p.x + p.size / 2 + ox;
          const py = p.y + p.size / 2 + oy;
          return (
            <Group key={`pw-${i}`}>
          <Circle
                cx={px}
                cy={py}
                r={p.size / 2 + 2}
                color="rgba(30,41,59,0.5)"
              />
              <Circle
                cx={px}
                cy={py}
            r={p.size / 2}
                color={p.kind === 'shield' ? '#a855f7' : p.kind === 'slow' ? '#f97316' : getPowerupColor(p.kind)}
              />
            </Group>
          );
        })}
      </Canvas>

      {playerHitFlash > 0 && (
        <View style={[styles.hitFlash, { opacity: playerHitFlash }]} pointerEvents="none" />
      )}

      {levelBanner && !inBonusRound && (
        <View style={styles.levelBanner}>
          <Text style={styles.levelBannerText}>{levelBanner}</Text>
        </View>
      )}

      {inBonusRound && (
        <View style={styles.bonusBanner}>
          <Text style={styles.bonusTitle}>BONUS SHOOT-OUT</Text>
          <Text style={styles.bonusTimer}>{bonusTimeLeft.toFixed(1)}s</Text>
        </View>
      )}

      <View style={[styles.hud, { transform: [{ scale: hudScale }] }]}>
        <View style={styles.hudColumn}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{formattedScore}</Text>
        </View>
        <View style={styles.hudColumn}>
          <Text style={styles.hudText}>Level</Text>
          <Text style={styles.levelText}>{String(level).padStart(2, '0')}</Text>
          <Text style={styles.levelProgress}>
            {Math.min(levelKills, levelTarget)}/{levelTarget}
          </Text>
        </View>
        <View style={styles.hudColumn}>
          <Text style={styles.hudText}>Lives</Text>
          <Text style={styles.livesText}>{livesDisplay}</Text>
          <Text style={[styles.hudText, player.shield ? styles.shieldTextOn : styles.shieldTextOff]}>
            Shield {shieldStatus}
          </Text>
        </View>
        <TouchableOpacity onPress={handlePauseToggle}>
          <Text style={styles.hudText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.backBtnContainer}>
        <TouchableOpacity onPress={handleExitToMenu}>
          <Text style={styles.backBtn}>Exit</Text>
        </TouchableOpacity>
      </View>

      {player.alive && !gameOver && (
        <View style={[
          styles.fireButtonContainer,
          fireButtonPosition === 'left' ? styles.fireButtonContainerLeft : styles.fireButtonContainerRight
        ]}>
          <TouchableOpacity
            style={[styles.fireButton, fireButtonDisabled && styles.fireButtonDisabled]}
            onPress={fireWeapon}
            disabled={fireButtonDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.fireButtonText}>FIRE</Text>
          </TouchableOpacity>
          <View style={[styles.autoFireChip, autoFire && styles.autoFireChipActive]}>
            <Text style={styles.autoFireChipText}>{autoBadgeText}</Text>
          </View>
        </View>
      )}

      {scoreTexts.map((st) => {
        const alpha = Math.max(0, Math.min(1, st.life));
        let fontSize = st.isBoss ? 28 : st.isCombo ? 32 : 20;
        if (st.isCombo) {
          fontSize = 28 + Math.min(st.life * 8, 12); // Scale up combo text
        }
        return (
          <View
            key={`score-${st.id}`}
            style={[
              styles.scoreText,
              {
                left: st.x + ox - (st.isCombo ? 60 : 30),
                top: st.y + oy - 20,
                opacity: alpha,
                transform: [{ scale: st.isCombo ? 1 + (1 - st.life) * 0.3 : 1 }]
              }
            ]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.scoreTextContent,
                {
                  fontSize,
                  color: st.color || (st.isBoss ? '#fbbf24' : '#22c55e'),
                  fontWeight: st.isCombo ? '900' : '800',
                  textShadowColor: st.isCombo ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.75)',
                  textShadowOffset: st.isCombo ? { width: 2, height: 2 } : { width: 1, height: 1 },
                  textShadowRadius: st.isCombo ? 5 : 3,
                  letterSpacing: st.isCombo ? 2 : 0
                }
              ]}
            >
              {st.text}
            </Text>
          </View>
        );
      })}

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

      <ControlHintsOverlay visible={showGuide && !gameOver} onDismiss={handleGuideDismiss} />

      {gameOver && (
        <GameOverOverlay score={score} onRetry={resetGame} onExit={onExit} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hudText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600'
  },
  hudColumn: {
    alignItems: 'center'
  },
  scoreLabel: {
    color: '#38bdf8',
    fontSize: 12,
    letterSpacing: 2
  },
  scoreValue: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1
  },
  livesText: {
    color: '#f87171',
    fontSize: 18,
    marginVertical: 4
  },
  shieldTextOn: {
    color: '#22c55e'
  },
  shieldTextOff: {
    color: '#94a3b8'
  },
  backBtnContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16
  },
  backBtn: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline'
  },
  fireButtonContainer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fireButtonContainerLeft: {
    left: 16
  },
  fireButtonContainerRight: {
    right: 16
  },
  fireButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  fireButtonDisabled: {
    backgroundColor: '#64748b',
    opacity: 0.5,
    shadowOpacity: 0
  },
  fireButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2
  },
  autoFireChip: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.75)'
  },
  autoFireChipActive: {
    backgroundColor: 'rgba(34,197,94,0.85)'
  },
  autoFireChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600'
  },
  hitFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248,113,113,0.25)'
  },
  scoreText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  scoreTextContent: {
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3
  },
  levelText: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: '800'
  },
  levelProgress: {
    color: '#cbd5f5',
    fontSize: 12
  },
  levelBanner: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelBannerText: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8
  },
  bonusBanner: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  bonusTitle: {
    color: '#fb923c',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8
  },
  bonusTimer: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4
  }
});
