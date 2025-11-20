
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { Canvas, Rect, Circle, Group } from '@shopify/react-native-skia';
import wavesConfig from '../config/waves.json';
import enemiesConfig from '../config/enemies.json';
import { aabb } from '../engine/collision';
import { diveOffset } from '../engine/paths';
import { PLAYER_WIDTH, PLAYER_HEIGHT, ENEMY_SIZE, BULLET_WIDTH, BULLET_HEIGHT, POWERUP_SIZE } from '../entities/types';
import GameOverOverlay from './GameOverOverlay';

const STAGE = 'stage1';

export default function GameScreen({ onExit }) {
  const { width, height } = useWindowDimensions();
  const [player, setPlayer] = useState({
    x: width/2 - PLAYER_WIDTH/2,
    y: height*0.8,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    alive: true,
    lives: 3,
    weaponLevel: 1,
    shield: false
  });
  const [bullets, setBullets] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [powerups, setPowerups] = useState([]);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const lastTimeRef = useRef(Date.now());
  const fireCooldownRef = useRef(0);
  const enemySpawnTimerRef = useRef(0);
  const stageConfig = wavesConfig[STAGE];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const newX = gesture.moveX - player.width/2;
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
      const dt = (now - lastTimeRef.current)/1000;
      lastTimeRef.current = now;
      if (running && !gameOver) step(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running, gameOver, player.alive]);

  const step = (dt) => {
    fireCooldownRef.current -= dt;
    if (fireCooldownRef.current <= 0 && player.alive) {
      fireWeapon();
      fireCooldownRef.current = 0.22;
    }

    setBullets(prev => prev.map(b => ({...b, y: b.y - b.speed*dt})).filter(b => b.y + b.height > 0));
    setEnemyBullets(prev => prev.map(b => ({...b, y: b.y + b.speed*dt})).filter(b => b.y - b.height < height));

    enemySpawnTimerRef.current += dt;
    if (enemySpawnTimerRef.current >= stageConfig.spawnInterval && enemies.length < stageConfig.maxEnemies) {
      enemySpawnTimerRef.current = 0;
      spawnEnemy();
    }

    setEnemies(prev => prev.map(e => {
      let y = e.y + e.speed*dt;
      let x = e.x;
      if (e.pattern === 'zigzag') {
        const t = (height - y)/height;
        x = e.baseX + Math.sin((1 - t)*Math.PI*4)*40;
      } else if (e.pattern === 'dive') {
        const t = (height - y)/height;
        x = e.baseX + diveOffset(1 - t, 70);
      }
      return { ...e, x, y, fireCooldown: e.fireCooldown - dt };
    }).filter(e => e.y < height + e.size));

    setEnemies(prev => {
      const updated = [];
      const newEB = [];
      prev.forEach(e => {
        let cd = e.fireCooldown;
        if (cd <= 0 && e.canShoot) {
          cd = 1 + Math.random()*1.5;
          newEB.push({
            x: e.x + e.size/2 - BULLET_WIDTH/2,
            y: e.y + e.size,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            speed: stageConfig.enemyBulletSpeed
          });
        }
        updated.push({ ...e, fireCooldown: cd });
      });
      if (newEB.length) setEnemyBullets(prevB => [...prevB, ...newEB]);
      return updated;
    });

    setExplosions(prev => prev.map(ex => ({...ex, life: ex.life - dt})).filter(ex => ex.life > 0));
    setPowerups(prev => prev.map(p => ({...p, y: p.y + p.speed*dt})).filter(p => p.y < height + p.size));

    setEnemies(prevEnemies => {
      let remaining = [];
      let explosions = [];
      let gain = 0;
      let newP = [];
      prevEnemies.forEach(e => {
        let hit = FalseFlag();
        setBullets(prevBullets => {
          const keep = [];
          prevBullets.forEach(b => {
            if (!hit.value && aabb(
              {x:b.x,y:b.y,width:b.width,height:b.height},
              {x:e.x,y:e.y,width:e.size,height:e.size}
            )) {
              hit.value = true;
              const cfg = enemiesConfig[e.type] || enemiesConfig['grunt'];
              gain += cfg.score;
              explosions.push({ x:e.x+e.size/2, y:e.y+e.size/2 });
              if (Math.random() < 0.18) {
                newP.push({
                  x: e.x + e.size/2 - POWERUP_SIZE/2,
                  y: e.y + e.size/2,
                  size: POWERUP_SIZE,
                  speed: 70,
                  kind: randomPowerupKind()
                });
              }
            } else keep.push(b);
          });
          return keep;
        });
        if (!hit.value) remaining.push(e);
      });
      if (explosions.length) {
        setExplosions(prev => [...prev, ...explosions.map(p => ({x:p.x,y:p.y,radius:26,life:0.25}))]);
        setScore(prev => prev + gain);
      }
      if (newP.length) setPowerups(prev => [...prev, ...newP]);
      return remaining;
    });

    if (player.alive) {
      setEnemyBullets(prev => {
        const keep = [];
        let hit = false;
        prev.forEach(b => {
          if (!hit && aabb(
            {x:player.x,y:player.y,width:player.width,height:player.height},
            {x:b.x,y:b.y,width:b.width,height:b.height}
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
            {x:player.x,y:player.y,width:player.width,height:player.height},
            {x:p.x,y:p.y,width:p.size,height:p.size}
          )) {
            applyPowerup(p.kind);
          } else keep.push(p);
        });
        return keep;
      });
    }
  };

  const FalseFlag = () => ({ value:false });

  const randomPowerupKind = () => {
    const kinds = ['spread','double','shield','slow'];
    return kinds[Math.floor(Math.random()*kinds.length)];
  };

  const applyPowerup = (kind) => {
    if (kind === 'spread' || kind === 'double') {
      setPlayer(prev => ({...prev, weaponLevel: Math.min(3, prev.weaponLevel+1)}));
    } else if (kind === 'shield') {
      setPlayer(prev => ({...prev, shield:true}));
      setTimeout(() => setPlayer(prev => ({...prev, shield:false})), 4000);
    } else if (kind === 'slow') {
      setEnemies(prev => prev.map(e => ({...e, speed: e.speed*0.6})));
      setTimeout(() => setEnemies(prev => prev.map(e => ({...e, speed: stageConfig.enemySpeed}))), 3000);
    }
  };

  const fireWeapon = () => {
    const centerX = player.x + player.width/2;
    const mk = (off, spd) => ({
      x: centerX + off - BULLET_WIDTH/2,
      y: player.y - BULLET_HEIGHT,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: spd
    });
    let b = [];
    if (player.weaponLevel === 1) b.push(mk(0,420));
    else if (player.weaponLevel === 2) { b.push(mk(-8,430)); b.push(mk(8,430)); }
    else { b.push(mk(0,440)); b.push(mk(-10,430)); b.push(mk(10,430)); }
    setBullets(prev => [...prev, ...b]);
  };

  const spawnEnemy = () => {
    const pad = 20;
    const pattern = stageConfig.patterns[Math.floor(Math.random()*stageConfig.patterns.length)];
    const r = Math.random();
    let type = 'grunt', canShoot = false;
    if (r > 0.7) { type='shooter'; canShoot=true; }
    else if (r > 0.4) { type='dive'; canShoot=true; }
    const cfg = enemiesConfig[type] || enemiesConfig['grunt'];
    const x = pad + Math.random()*(width - pad*2 - ENEMY_SIZE);
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
      fireCooldown: Math.random()*1.5 + 0.5
    }]);
  };

  const handlePlayerHit = () => {
    if (player.shield) {
      setPlayer(prev => ({...prev, shield:false}));
      return;
    }
    setExplosions(prev => [...prev, {
      x: player.x + player.width/2,
      y: player.y + player.height/2,
      radius: 34,
      life: 0.4
    }]);
    setPlayer(prev => ({...prev, lives: prev.lives - 1}));
    setBullets([]); setEnemies([]); setEnemyBullets([]);
    if (player.lives - 1 <= 0) {
      setPlayer(prev => ({...prev, alive:false}));
      setGameOver(true);
      setRunning(false);
    }
  };

  const resetGame = () => {
    setScore(0);
    setBullets([]); setEnemyBullets([]); setEnemies([]); setExplosions([]); setPowerups([]);
    setPlayer({
      x: width/2 - PLAYER_WIDTH/2,
      y: height*0.8,
      width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
      alive: true, lives: 3, weaponLevel: 1, shield:false
    });
    setGameOver(false); setRunning(true);
    lastTimeRef.current = Date.now();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Rect x={0} y={0} width={width} height={height} color="#020617" />
        {Array.from({ length: 40 }).map((_, i) => (
          <Circle key={`s1-${i}`} cx={(i*37)%width} cy={(i*73)%height} r={1.5} color="#0ea5e9" />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <Circle key={`s2-${i}`} cx={(i*61)%width} cy={(i*29)%height} r={1} color="#22c55e" />
        ))}

        {player.alive && (
          <Group>
            <Circle cx={player.x + player.width/2} cy={player.y + player.height/2} r={20} color="rgba(34,197,94,0.15)" />
            <Rect x={player.x} y={player.y} width={player.width} height={player.height} color="#22c55e" />
            {player.shield && (
              <Circle cx={player.x + player.width/2} cy={player.y + player.height/2} r={26} color="rgba(56,189,248,0.35)" />
            )}
          </Group>
        )}

        {bullets.map((b,i) => (
          <Group key={`pb-${i}`}>
            <Rect x={b.x} y={b.y} width={b.width} height={b.height} color="#e5e7eb" />
            <Circle cx={b.x + b.width/2} cy={b.y + b.height} r={3} color="rgba(248,250,252,0.6)" />
          </Group>
        ))}

        {enemyBullets.map((b,i) => (
          <Rect key={`eb-${i}`} x={b.x} y={b.y} width={b.width} height={b.height} color="#f97316" />
        ))}

        {enemies.map((e,i) => (
          <Group key={`e-${i}`}>
            <Circle cx={e.x+e.size/2} cy={e.y+e.size/2} r={e.size/2+6} color="rgba(15,23,42,0.8)" />
            <Rect x={e.x} y={e.y} width={e.size} height={e.size} color={enemiesConfig[e.type]?.color || '#38bdf8'} />
          </Group>
        ))}

        {explosions.map((ex,i) => (
          <Circle key={`ex-${i}`} cx={ex.x} cy={ex.y} r={ex.radius} color="rgba(248,250,252,0.85)" />
        ))}

        {powerups.map((p,i) => (
          <Circle key={`p-${i}`} cx={p.x + p.size/2} cy={p.y + p.size/2} r={p.size/2} color={
            p.kind === 'spread' ? '#22c55e' :
            p.kind === 'double' ? '#38bdf8' :
            p.kind === 'shield' ? '#a855f7' : '#f97316'
          } />
        ))}
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
  container:{ flex:1, backgroundColor:'black' },
  canvas:{ flex:1 },
  hud:{ position:'absolute', top:40, left:16, right:16, flexDirection:'row', justifyContent:'space-between' },
  hudText:{ color:'#e5e7eb', fontSize:16, fontWeight:'600' },
  backBtnContainer:{ position:'absolute', bottom:30, left:16 },
  backBtn:{ color:'#9ca3af', fontSize:14, textDecorationLine:'underline' }
});
