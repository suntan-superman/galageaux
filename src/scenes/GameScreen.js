import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { Canvas, Rect, Circle, Group } from '@shopify/react-native-skia';
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
import BossHealthBar from '../components/BossHealthBar';
import { PLAYER_WIDTH, PLAYER_HEIGHT, ENEMY_SIZE, BULLET_WIDTH, BULLET_HEIGHT, POWERUP_SIZE } from '../entities/types';
import GameOverOverlay from './GameOverOverlay';

const STAGE = 'stage1';

export default function GameScreen({ onExit }) {
  const { width, height } = useWindowDimensions();
  const [player, setPlayer] = useState({
    x: width / 2 - PLAYER_WIDTH / 2,
    y: height * 0.8,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    alive: true,
      lives: 3,
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
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [bossSpawned, setBossSpawned] = useState(false);

  const lastTimeRef = useRef(Date.now());
  const fireCooldownRef = useRef(0);
  const enemySpawnTimerRef = useRef(0);
  const totalEnemiesSpawnedRef = useRef(0);
  const screenshake = useRef(createScreenshake());
  const screenOffset = useRef({ ox: 0, oy: 0 });
  const stageConfig = wavesConfig[STAGE];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const newX = gesture.moveX - player.width / 2;
        setPlayer(prev => ({
          ...prev,
          x: Math.max(0, Math.min(width - prev.width, newX))
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
      if (running && !gameOver) step(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running, gameOver, player.alive, bossSpawned]);

  const step = (dt) => {
    const { ox, oy } = updateScreenshake(screenshake.current, dt);
    screenOffset.current = { ox, oy };

    fireCooldownRef.current -= dt;
    const fireRate = player.rapidFire ? 0.12 : 0.22;
    if (fireCooldownRef.current <= 0 && player.alive) {
      fireWeapon();
      fireCooldownRef.current = fireRate;
    }

    setBullets(prev => prev.map(b => ({ ...b, y: b.y - b.speed * dt })).filter(b => b.y + b.height > 0));
    setEnemyBullets(prev => prev.map(b => {
      if (b.vx !== undefined && b.vy !== undefined) {
        return { ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt };
      }
      return { ...b, y: b.y + b.speed * dt };
    }).filter(b => b.y < height + b.height && b.x > -b.width && b.x < width + b.width));

    if (!bossSpawned) {
      enemySpawnTimerRef.current += dt;
      if (enemySpawnTimerRef.current >= stageConfig.spawnInterval && enemies.length < stageConfig.maxEnemies) {
        enemySpawnTimerRef.current = 0;
        spawnWave();
      }
    }

    setEnemies(prev => prev.map(e => {
      let updated = { ...e };
      
      if (e.swoopState && e.swoopState.active) {
        updated = updateSwoop(e, e.swoopState, dt, width, height);
      } else {
        let y = e.y + e.speed * dt;
        let x = e.x;
        if (e.pattern === 'zigzag') {
          const t = (height - y) / height;
          x = e.baseX + Math.sin((1 - t) * Math.PI * 4) * 40;
        } else if (e.pattern === 'dive') {
          const t = (height - y) / height;
          x = e.baseX + diveOffset(1 - t, 70);
        }
        updated.x = x;
        updated.y = y;
      }
      
      if (updated.canShoot && updated.fireCooldown !== undefined) {
        updated.fireCooldown -= dt;
        if (updated.fireCooldown <= 0 && updated.y > 0 && updated.y < height * 0.8) {
          fireEnemyBullet(updated);
          updated.fireCooldown = 1.5 + Math.random() * 1.0;
        }
      }
      
      return updated;
    }).filter(e => e.y < height + e.size));

    if (!bossSpawned && totalEnemiesSpawnedRef.current >= stageConfig.maxEnemies) {
      const b = createBoss(STAGE, width);
      setBoss(b);
      setBossSpawned(true);
      triggerScreenshake(screenshake.current, 12, 0.4);
    }

    if (boss && boss.alive) {
      setBoss(prev => updateBoss({ ...prev }, dt, STAGE));
      handleBossFire(dt);
    }

    setParticles(prev => updateParticles(prev, dt));
    setExplosions(prev => prev.map(ex => updateExplosion(ex, dt)).filter(ex => ex && ex.life > 0));
    setPowerups(prev => prev.map(p => updatePowerup(p, dt)).filter(p => p.y < height + p.size && !p.collected));

    // bullets vs enemies
    setEnemies(prevEnemies => {
      let remaining = [];
      let explosionsLocal = [];
      let gain = 0;
      let newPowerups = [];

      prevEnemies.forEach(e => {
        let hit = { value: false };
        setBullets(prevBullets => {
          const keep = [];
          prevBullets.forEach(b => {
            if (!hit.value && aabb(
              { x: b.x, y: b.y, width: b.width, height: b.height },
              { x: e.x, y: e.y, width: e.size, height: e.size }
            )) {
              hit.value = true;
              const cfg = enemiesConfig[e.type] || enemiesConfig['grunt'];
              gain += cfg.score;
              explosionsLocal.push({ x: e.x + e.size / 2, y: e.y + e.size / 2 });
              if (Math.random() < 0.10) {
                const powerup = createPowerup(e.x + e.size / 2 - POWERUP_SIZE / 2, e.y + e.size / 2, randomPowerupKind());
                newPowerups.push(powerup);
              }
            } else keep.push(b);
          });
          return keep;
        });
        if (!hit.value) remaining.push(e);
      });

      if (explosionsLocal.length) {
        setExplosions(prev => [...prev, ...explosionsLocal.map(p => spawnExplosion(p.x, p.y, 26, 0.25))]);
        setParticles(prev => [...prev, ...explosionsLocal.flatMap(p => spawnExplosionParticles(p.x, p.y, 12, 'default'))]);
        triggerScreenshake(screenshake.current, 5, 0.18);
        setScore(prev => prev + gain);
      }
      if (newPowerups.length) setPowerups(prev => [...prev, ...newPowerups]);
      return remaining;
    });

    // bullets vs boss
    if (boss && boss.alive) {
      setBullets(prevBullets => {
        const keep = [];
        let hitCount = 0;
        prevBullets.forEach(b => {
          if (aabb(
            { x: b.x, y: b.y, width: b.width, height: b.height },
            { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
          )) {
            hitCount++;
          } else keep.push(b);
        });
        if (hitCount > 0) {
          setBoss(prev => {
            if (!prev) return prev;
            const nextHp = prev.hp - hitCount;
            if (nextHp <= 0) {
              triggerScreenshake(screenshake.current, 14, 0.6);
              const bossCenterX = prev.x + prev.width / 2;
              const bossCenterY = prev.y + prev.height / 2;
              setExplosions(prevEx => [...prevEx, spawnExplosion(bossCenterX, bossCenterY, 80, 0.6)]);
              setParticles(prevP => [...prevP, ...spawnExplosionParticles(bossCenterX, bossCenterY, 40, 'debris')]);
              setScore(s => s + 1000);
              return { ...prev, hp: 0, alive: false };
            }
            return { ...prev, hp: nextHp };
          });
        }
        return keep;
      });
    }

    if (player.alive) {
      setEnemyBullets(prev => {
        const keep = [];
        let hit = false;
        prev.forEach(b => {
          if (!hit && aabb(
            { x: player.x, y: player.y, width: player.width, height: player.height },
            { x: b.x, y: b.y, width: b.width, height: b.height }
          )) {
            hit = true;
          } else keep.push(b);
        });
        if (hit) handlePlayerHit();
        return keep;
      });

      setPowerups(prev => {
        const keep = [];
        prev.forEach(p => {
          if (aabb(
            { x: player.x, y: player.y, width: player.width, height: player.height },
            { x: p.x, y: p.y, width: p.size, height: p.size }
          )) {
            applyPowerup(p.kind);
          } else keep.push(p);
        });
        return keep;
      });
    }
  };

  const randomPowerupKind = () => {
    const kinds = [POWERUP_TYPES.SPREAD_SHOT, POWERUP_TYPES.DOUBLE_SHOT, POWERUP_TYPES.TRIPLE_SHOT, POWERUP_TYPES.RAPID_FIRE, 'shield', 'slow'];
    return kinds[Math.floor(Math.random() * kinds.length)];
  };

  const applyPowerup = (kind) => {
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
      setPlayer(prev => ({ ...prev, shield: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, shield: false })), 4000);
    } else if (kind === 'slow') {
      setEnemies(prev => prev.map(e => ({ ...e, speed: e.speed * 0.6 })));
      setTimeout(() => setEnemies(prev => prev.map(e => ({ ...e, speed: stageConfig.enemySpeed }))), 3000);
    }
  };

  const fireEnemyBullet = (enemy) => {
    const cx = enemy.x + enemy.size / 2;
    const cy = enemy.y + enemy.size;
    const bullet = {
      x: cx - BULLET_WIDTH / 2,
      y: cy,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: stageConfig.enemyBulletSpeed || 230
    };
    setEnemyBullets(prev => [...prev, bullet]);
  };

  const fireWeapon = () => {
    const centerX = player.x + player.width / 2;
    const mk = (off, spd) => ({
      x: centerX + off - BULLET_WIDTH / 2,
      y: player.y - BULLET_HEIGHT,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: spd
    });
    let b = [];
    
    if (player.weaponType === POWERUP_TYPES.SPREAD_SHOT) {
      const angles = [-0.4, -0.2, 0, 0.2, 0.4];
      angles.forEach(angle => {
        const speed = 420;
        const offsetX = Math.sin(angle) * 20;
        const offsetY = -Math.cos(angle) * 5;
        b.push(mk(offsetX, speed + offsetY * 10));
      });
    } else if (player.weaponLevel === 1) {
      b.push(mk(0, 420));
    } else if (player.weaponLevel === 2 || player.weaponType === POWERUP_TYPES.DOUBLE_SHOT) {
      b.push(mk(-8, 430));
      b.push(mk(8, 430));
    } else if (player.weaponLevel === 3 || player.weaponType === POWERUP_TYPES.TRIPLE_SHOT) {
      b.push(mk(0, 440));
      b.push(mk(-10, 430));
      b.push(mk(10, 430));
    }
    
    setBullets(prev => [...prev, ...b]);
  };

  const spawnWave = () => {
    const roll = Math.random();
    if (roll < 0.3) spawnFormation('v');
    else if (roll < 0.6) spawnFormation('line');
    else spawnSingleEnemy();
  };

  const spawnFormation = (type) => {
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
      setEnemies(prev => [...prev, {
        type: typeKey,
        x,
        y: yStart + off.dy - idx * 8,
        baseX: x,
        size: ENEMY_SIZE,
        speed: stageConfig.enemySpeed,
        hp: cfg.hp,
        pattern: type === 'v' ? 'dive' : 'zigzag',
        canShoot,
        fireCooldown: Math.random() * 1.5 + 0.5
      }]);
      totalEnemiesSpawnedRef.current += 1;
    });
  };

  const spawnSingleEnemy = () => {
    const pad = 20;
    const pattern = stageConfig.patterns[Math.floor(Math.random() * stageConfig.patterns.length)];
    const r = Math.random();
    let type = 'grunt', canShoot = false;
    if (r > 0.7) { type = 'shooter'; canShoot = true; }
    else if (r > 0.4) { type = 'dive'; canShoot = true; }
    const cfg = enemiesConfig[type] || enemiesConfig['grunt'];
    const x = pad + Math.random() * (width - pad * 2 - ENEMY_SIZE);
    setEnemies(prev => [...prev, {
      type,
      x,
      y: -ENEMY_SIZE,
      baseX: x,
      size: ENEMY_SIZE,
      speed: stageConfig.enemySpeed,
      hp: cfg.hp,
      pattern,
      canShoot,
      fireCooldown: Math.random() * 1.5 + 0.5
    }]);
    totalEnemiesSpawnedRef.current += 1;
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
    if (player.shield) {
      setPlayer(prev => ({ ...prev, shield: false }));
      return;
    }
    triggerScreenshake(screenshake.current, 10, 0.3);
    setExplosions(prev => [...prev, {
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              radius: 34,
              life: 0.4
            }]);
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            setExplosions(prev => [...prev, spawnExplosion(playerCenterX, playerCenterY, 34, 0.4)]);
            setParticles(prev => [...prev, ...spawnExplosionParticles(playerCenterX, playerCenterY, 24, 'default')]);
    setPlayer(prev => ({ ...prev, lives: prev.lives - 1 }));
    setBullets([]); setEnemies([]); setEnemyBullets([]);
    if (player.lives - 1 <= 0) {
      setPlayer(prev => ({ ...prev, alive: false }));
      setGameOver(true);
      setRunning(false);
    }
  };

  const resetGame = () => {
    setScore(0);
    setBullets([]); setEnemyBullets([]); setEnemies([]);
    setExplosions([]); setParticles([]); setPowerups([]);
    setBoss(null); setBossSpawned(false);
    totalEnemiesSpawnedRef.current = 0;
    setPlayer({
      x: width / 2 - PLAYER_WIDTH / 2,
      y: height * 0.8,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      alive: true,
      lives: 3,
      weaponLevel: 1,
      weaponType: null,
      shield: false,
      rapidFire: false
    });
    setGameOver(false); setRunning(true);
    lastTimeRef.current = Date.now();
  };

  const { ox, oy } = screenOffset.current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Rect x={ox} y={oy} width={width} height={height} color="#020617" />
        {Array.from({ length: 40 }).map((_, i) => (
          <Circle key={`s1-${i}`} cx={((i * 37) % width) + ox} cy={((i * 73) % height) + oy} r={1.5} color="#0ea5e9" />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <Circle key={`s2-${i}`} cx={((i * 61) % width) + ox} cy={((i * 29) % height) + oy} r={1} color="#22c55e" />
        ))}

        {player.alive && (
          <Group>
            <Circle cx={player.x + player.width / 2 + ox} cy={player.y + player.height / 2 + oy} r={20} color="rgba(34,197,94,0.15)" />
            <Rect x={player.x + ox} y={player.y + oy} width={player.width} height={player.height} color="#22c55e" />
            {player.shield && (
              <Circle cx={player.x + player.width / 2 + ox} cy={player.y + player.height / 2 + oy} r={26} color="rgba(56,189,248,0.35)" />
            )}
          </Group>
        )}

        {bullets.map((b, i) => (
          <Group key={`pb-${i}`}>
            <Rect x={b.x + ox} y={b.y + oy} width={b.width} height={b.height} color="#e5e7eb" />
            <Circle cx={b.x + b.width / 2 + ox} cy={b.y + b.height + oy} r={3} color="rgba(248,250,252,0.6)" />
          </Group>
        ))}

        {enemyBullets.map((b, i) => (
          <Rect key={`eb-${i}`} x={(b.x || 0) + ox} y={(b.y || 0) + oy} width={b.width} height={b.height} color="#f97316" />
        ))}

        {enemies.map((e, i) => (
          <Group key={`e-${i}`}>
            <Circle cx={e.x + e.size / 2 + ox} cy={e.y + e.size / 2 + oy} r={e.size / 2 + 6} color="rgba(15,23,42,0.8)" />
            <Rect x={e.x + ox} y={e.y + oy} width={e.size} height={e.size} color={enemiesConfig[e.type]?.color || '#38bdf8'} />
          </Group>
        ))}

        {boss && boss.alive && (
          <Group>
            <Circle cx={boss.x + boss.width / 2 + ox} cy={boss.y + boss.height / 2 + oy} r={boss.width / 2 + 12} color="rgba(147,51,234,0.35)" />
            <Rect x={boss.x + ox} y={boss.y + oy} width={boss.width} height={boss.height} color="#a855f7" />
            <BossHealthBar
              health={boss.hp}
              maxHealth={boss.maxHp}
              x={width / 2 - 100 + ox}
              y={40 + oy}
              width={200}
              height={16}
            />
          </Group>
        )}

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
          <Circle key={`p-${i}`} cx={p.x + ox} cy={p.y + oy} r={p.radius} color="rgba(248,250,252,0.8)" />
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

      <View style={styles.hud}>
        <Text style={styles.hudText}>Score: {score}</Text>
        <Text style={styles.hudText}>Lives: {player.lives}</Text>
        <TouchableOpacity onPress={() => setRunning(r => !r)}>
          <Text style={styles.hudText}>{running ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.backBtnContainer}>
        <TouchableOpacity onPress={onExit}>
          <Text style={styles.backBtn}>Exit</Text>
        </TouchableOpacity>
      </View>

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
    justifyContent: 'space-between'
  },
  hudText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600'
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
  }
});
