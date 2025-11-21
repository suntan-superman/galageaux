# 🎮 Galageaux – Advanced Gameplay Expansion Specification  
### (For Cursor Implementation)

## 1. ENEMY FORMATIONS  
We will implement a **Formation System** that supports Galaga-style enemy groupings and synchronized motion.

### 1.1 Formation Types
1. **Grid Formation**
   - Rows + columns
   - Used for classic Galaga staging
   - Enemies idle in place until triggered

2. **V-Formation**
   - Triangular V shape
   - 3–7 enemies
   - Swoop in formation → break → rejoin

3. **Wave Formation**
   - Enemies spawn at screen top  
   - Move in sine-wave pattern

4. **Circle Formation (optional)**
   - Rotating ring  
   - Used for "elite bug" enemies

### 1.2 Formation Architecture
Create:
```
/logic/formations.js
```
Export:
```js
export const createFormation = (type) => { ... };
export const updateFormation = (formation, delta) => { ... };
```

Each enemy has:
```js
{
  id,
  sprite,
  x, y,
  baseX, baseY,
  offsetX, offsetY,
  behavior: "idle" | "swoop" | "attack" | "return",
}
```

### 1.3 Formation Spawn API
```js
spawnFormation("grid", { rows: 4, cols: 6 });
spawnFormation("v", { size: 5 });
spawnFormation("wave", { count: 8 });
```

---

## 2. SWOOPING PATTERNS (CLASSIC GALAGA STYLE)
Add:
```
/logic/swoops.js
```

### 2.1 Pattern Types
- Straight Dive  
- Arc Swing Left/Right  
- Corkscrew Pattern  
- Return to Formation  

### 2.2 API
```js
startSwoop(enemy, patternType);
```

---

## 3. EXPLOSIONS + PARTICLE EFFECTS
Add:
```
/components/Explosion.js
/logic/particles.js
```

Includes:
- Multi-frame explosion animation  
- Particle debris system  

```js
spawnExplosion(x, y);
spawnParticles(x, y, count);
```

---

## 4. POWER-UPS

Add:
```
/logic/powerups.js
/components/PowerUp.js
```

### 4.1 Types
- Double Shot  
- Triple Shot  
- Spread Shot (5-way)  
- Rapid Fire  

Drops with:
```js
if (Math.random() < 0.10) spawnPowerUp(enemy.x, enemy.y);
```

Collected with collision detection and applied for 10 seconds.

---

## 5. BOSS BATTLES

Add:
```
/boss/Boss.js
/boss/bossPatterns.js
```

### Boss Features:
- Multi-phase behaviors  
- Swoops, bullet patterns  
- Minion summons  
- Intro animation  
- Health bar component  
```
<BossHealthBar health={boss.hp} max={boss.maxHp} />
```

---

## 6. REQUIRED NEW FILES

### Components
```
/components/Controls.js
/components/Explosion.js
/components/PowerUp.js
/components/BossHealthBar.js
```

### Logic
```
/logic/formations.js
/logic/swoops.js
/logic/particles.js
/logic/powerups.js
/logic/shake.js
```

### Boss
```
/boss/Boss.js
/boss/bossPatterns.js
```

---

## 7. REQUIRED MODIFICATIONS
Update:
- Game.js  
- Enemy update system  
- Bullet manager  
- Power-up logic  
- Boss loop integration  

---

## 8. IMPLEMENTATION ORDER
1. Create directories  
2. Formations  
3. Swoops  
4. New enemy behavior  
5. Particles  
6. Explosions  
7. Power-ups  
8. Multi-shot bullets  
9. Boss logic  
10. UI  
11. Integration  
12. Polish  
13. Cleanup  

---

## 9. DONE CRITERIA
- Player moves & manually fires  
- Enemies spawn in formation  
- Swoops work  
- Explosions + particles work  
- Collectable power-ups  
- Multi-shot works  
- Boss fights implemented  
- Health bar + phases  
- Stage transitions  

---

## 10. OPTIONAL FUTURE FEATURES
- Stage progression  
- Upgrades  
- Sound / CRT filters  
- Save system  

---

# END OF SPEC
