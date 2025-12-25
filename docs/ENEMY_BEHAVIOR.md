# Enemy Behavior System

This document describes the enemy behavior state machine and movement patterns in Galageaux.

## Enemy Types

| Type | HP | Speed | Shoots | Behavior | Color |
|------|-----|-------|--------|----------|-------|
| grunt | 1 | 1.0x | ❌ | normal | #38bdf8 (cyan) |
| dive | 1 | 1.0x | ✅ | normal | #22c55e (green) |
| shooter | 1 | 1.0x | ✅ | normal | #f97316 (orange) |
| scout | 1 | 1.5x | ✅ | normal | #a855f7 (purple) |
| kamikaze | 1 | 1.3x | ❌ | chase | #ec4899 (pink) |
| tank | 4 | 0.6x | ❌ | normal | #ef4444 (red) |
| elite | 2 | 1.2x | ✅ | normal | #fbbf24 (gold) |

## Spawn Probability

```
┌────────────────────────────────────────────────────┐
│  0%     40%    60%    75%    85%    90%    95% 100%│
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  │grunt │ dive │shoot │scout │kami │ tank │elite │
│  │ 40%  │ 20%  │ 15%  │ 10%  │  5%  │  5%  │  5%  │
└────────────────────────────────────────────────────┘
```

## Behavior States

### `normal` (Default)
Standard enemy behavior - moves according to assigned pattern.

```
┌─────────────┐
│   SPAWN     │
│   y = -30   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   DESCEND   │ ← Moves down based on pattern
│  pattern()  │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   SHOOT?    │    │  OFF-SCREEN │
│  cooldown   │    │   y > height│
└──────┬──────┘    └──────┬──────┘
       │                  │
       ▼                  ▼
   [fire bullet]     [DESTROYED]
```

### `chase` (Kamikaze)
Actively tracks and pursues the player.

```
┌─────────────┐
│   SPAWN     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│     TRACK PLAYER        │
│  dx = player.x - enemy.x│
│  dy = player.y - enemy.y│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   MOVE TOWARD PLAYER    │
│  normalize(dx, dy)      │
│  x += dx * speed * dt   │
│  y += dy * speed * dt   │
└───────────┬─────────────┘
            │
            ├───────────────────┐
            │                   │
            ▼                   ▼
    ┌─────────────┐     ┌─────────────┐
    │  COLLISION  │     │  MISS/EXIT  │
    │ with player │     │  off-screen │
    └──────┬──────┘     └──────┬──────┘
           │                   │
           ▼                   ▼
      [DAMAGE]            [DESTROYED]
```

## Movement Patterns

### `straight`
Simple downward movement.
```javascript
y += speed * dt
```

### `zigzag`
Horizontal sinusoidal oscillation.
```javascript
t = (height - y) / height  // Progress 0→1
x = baseX + sin((1-t) * PI * 4) * 40
y += speed * dt
```

### `dive`
Parabolic dive pattern.
```javascript
t = (height - y) / height
x = baseX + diveOffset(1 - t, 70)  // Curved approach
y += speed * dt
```

## Firing Behavior

Enemies with `canShoot: true` fire based on cooldown:

```javascript
// Per frame:
fireCooldown -= dt

if (fireCooldown <= 0 && y > 0 && y < height * 0.8) {
  // Fire bullet at bullet speed
  spawnEnemyBullet(enemy)
  
  // Reset cooldown based on type
  if (type === 'elite') {
    fireCooldown = 0.4 + random() * 0.3  // 0.4-0.7s (rapid)
  } else {
    // Level-based cooldown
    baseCooldown = level <= 2 ? 2.5 : level <= 4 ? 1.8 : 1.2
    variation = level <= 2 ? 1.5 : level <= 4 ? 1.2 : 1.3
    fireCooldown = baseCooldown + random() * variation
  }
}
```

## Formation Spawning

Enemies can spawn in formations:

### V Formation
```
    ●
   ● ●
  ● ● ●
 ● ● ● ●
```
- 5 enemies in arrow shape
- Uses `dive` pattern
- Offset spawn times for cascade effect

### Line Formation  
```
● ● ● ● ●
```
- 5 enemies in horizontal line
- Uses `zigzag` pattern
- Synchronized spawn

## Difficulty Scaling

Enemy behavior scales with level:

| Level | Spawn Rate | Max Enemies | Speed | Bullet Speed |
|-------|------------|-------------|-------|--------------|
| 1 | 0.6x | 0.6x | 0.6x | 0.6x |
| 2 | 0.7x | 0.7x | 0.7x | 0.7x |
| 3 | 0.8x | 0.8x | 0.8x | 0.8x |
| 4 | 0.9x | 0.9x | 0.9x | 0.9x |
| 5+ | 1.0x | 1.0x | 1.0x | 1.0x |

### Bonus Round Modifiers
- Enemy speed: +25%
- Spawn rate: +40% (faster spawning)
- Max enemies: +3
- Player is invulnerable

## Swoop Attack (Future)

Some enemies can break formation and swoop:

```
┌─────────────┐
│  IN FORMATION│
└──────┬──────┘
       │ trigger (random or player proximity)
       ▼
┌─────────────┐
│ START SWOOP │
│ swoopState.active = true
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   SWOOP PATH            │
│ - Arc toward player     │
│ - Fire at apex          │
│ - Return to formation   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────┐
│ END SWOOP   │
│ swoopState.active = false
└─────────────┘
```

## Related Files

- [enemies.json](../src/config/enemies.json) - Enemy type definitions
- [spawner.js](../src/engine/spawner.js) - Spawn logic
- [paths.js](../src/engine/paths.js) - Movement patterns
- [swoops.js](../src/engine/swoops.js) - Swoop attack system
- [difficulty.js](../src/engine/difficulty.js) - Difficulty scaling
