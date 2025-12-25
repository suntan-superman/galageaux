# Galageaux Architecture Documentation

## Overview

Galageaux is a Galaga-style arcade shooter built with React Native and Expo, using `@shopify/react-native-skia` for high-performance 2D rendering.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native 0.81.5 | Mobile app framework |
| Expo SDK 54 | Development toolchain |
| @shopify/react-native-skia 2.2.12 | 2D graphics rendering |
| Firebase | Auth + Firestore backend |
| AsyncStorage | Local persistence |

## Project Structure

```
galageaux/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AchievementToast.js
│   │   ├── AudioStatusBadge.js
│   │   ├── BossHealthBar.js
│   │   ├── BonusBanner.js
│   │   ├── ControlHintsOverlay.js
│   │   ├── FireButton.js
│   │   ├── GameHUD.js
│   │   ├── HitFlash.js
│   │   ├── LevelBanner.js
│   │   ├── LiquidGlass*.js   # Glass-morphism UI kit
│   │   ├── PauseOverlay.js
│   │   ├── ScorePopup.js
│   │   ├── StageCompleteOverlay.js
│   │   └── canvas/           # Skia rendering components
│   │       ├── index.js      # Unified export
│   │       ├── Background.js # Space background + nebulas
│   │       ├── StarField.js  # Parallax stars
│   │       ├── PlayerShip.js # Player ship + effects
│   │       ├── Enemies.js    # Enemy rendering
│   │       ├── BossShip.js   # Boss rendering
│   │       ├── Bullets.js    # Player/enemy bullets
│   │       └── Effects.js    # Explosions, particles, powerups
│   │
│   ├── config/              # Game configuration (JSON)
│   │   ├── boss.json        # Boss definitions per stage
│   │   ├── enemies.json     # Enemy type definitions
│   │   └── waves.json       # Wave patterns
│   │
│   ├── constants/           # Centralized constants
│   │   └── game.js          # All game tuning constants
│   │
│   ├── engine/              # Core game systems
│   │   ├── achievements.js  # Achievement tracking
│   │   ├── audio.js         # Audio management
│   │   ├── boss.js          # Boss behavior & patterns
│   │   ├── boss-patterns.js # Boss bullet patterns
│   │   ├── collision.js     # AABB collision detection
│   │   ├── formations.js    # Enemy formation layouts
│   │   ├── particles.js     # Particle effects
│   │   ├── paths.js         # Enemy movement paths
│   │   ├── powerups.js      # Powerup system
│   │   ├── screenshake.js   # Screen shake effects
│   │   ├── spawner.js       # Enemy spawning logic
│   │   └── swoops.js        # Enemy swoop attacks
│   │
│   ├── entities/            # Entity type definitions
│   │   └── types.js         # Player, enemy, bullet sizes
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useGameSettings.js   # Settings persistence
│   │   ├── usePlayerControls.js # Tilt/touch input
│   │   └── useStarField.js      # Star field management
│   │
│   └── scenes/              # Screen components
│       ├── AchievementsScreen.js
│       ├── AuthScreen.js
│       ├── GameOverOverlay.js
│       ├── GameScreen.js    # Main game loop (~1200 lines)
│       ├── MainMenu.js
│       ├── SettingsScreen.js
│       └── SplashScreen.js
│
├── contexts/                # React contexts
│   ├── AuthContext.js
│   └── LanguageContext.js
│
└── constants/               # App-level constants
    ├── colors.js
    ├── firebase.js
    └── responsiveSizes.js
```

## Core Systems

### Game Loop (`GameScreen.js`)

The main game loop runs via `requestAnimationFrame`:

```
┌─────────────────┐
│  useEffect      │ ← Starts animation loop
│  loop()         │
│    ↓            │
│  step(dt)       │ ← Main update function
│    ├─ Update player
│    ├─ Update enemies
│    ├─ Check collisions
│    ├─ Spawn waves
│    ├─ Update particles
│    └─ Handle boss
└─────────────────┘
```

### Collision System (`collision.js` & `collisionHandlers.js`)

- Uses AABB (Axis-Aligned Bounding Box) detection in `collision.js`
- High-level collision handlers in `collisionHandlers.js`:
  - `checkBulletEnemyCollisions()` - Player bullets vs enemies
  - `checkBulletBossCollisions()` - Player bullets vs boss
  - `checkEnemyBulletPlayerCollisions()` - Enemy bullets vs player
  - `checkPowerupCollisions()` - Powerups vs player
  - `checkEnemyPlayerCollisions()` - Kamikaze enemies vs player

### Difficulty System (`difficulty.js`)

Centralized difficulty scaling calculations:

```javascript
// Key functions:
getLevelTarget(level)              // Kills needed per level
getDifficultyMultiplier(level)     // 0.6-1.0+ scaling
calculateSpawnInterval(...)        // Enemy spawn rate
calculateMaxEnemies(...)           // Max concurrent enemies
calculateEnemySpeed(...)           // Enemy movement speed
calculateEnemyBulletSpeed(...)     // Bullet speed
getComboMultiplier(combo)          // Score bonus (1x-2x)
```

### Spawner System (`spawner.js`)

Enemy spawning uses weighted probability:

| Type | Chance | Behavior |
|------|--------|----------|
| grunt | 40% | Basic enemy |
| dive | 20% | Dive pattern |
| shooter | 15% | Shoots at player |
| scout | 10% | Fast movement |
| kamikaze | 5% | Chases player |
| tank | 5% | High HP, slow |
| elite | 5% | Rapid fire |

### Audio System (`audio.js`)

- Lazy initialization with retry logic
- Background music with crossfade
- Sound effects with volume control
- Status subscription for UI feedback

### Achievement System (`achievements.js`)

- 6 categories with 3 tiers each
- Persistent unlock tracking via AsyncStorage
- Toast notifications on unlock
- Firebase sync for leaderboards

## State Management

Currently using React's `useState` and `useRef` for state. Key state includes:

- **Player**: position, lives, shield, weapon level
- **Enemies**: array of enemy objects with position, type, HP
- **Bullets**: player and enemy bullet arrays
- **Boss**: current boss state (HP, position, pattern)
- **Game**: score, level, stage, paused, game over

## Rendering Pipeline

```
Canvas (Skia)
│
├─ Background
│   ├─ Nebula circles
│   └─ Parallax stars
│
├─ Game Objects
│   ├─ Enemies
│   ├─ Bullets
│   ├─ Powerups
│   ├─ Player ship
│   └─ Boss
│
└─ Effects
    ├─ Explosions
    ├─ Particles
    └─ Muzzle flashes
```

All rendering uses Skia primitives:
- `Rect` for backgrounds, bullets
- `Circle` for powerups, explosions
- `Path` for ship shapes
- `Group` with transforms for animations

## Configuration

Game tuning is centralized in `src/constants/game.js`:

```javascript
export const PLAYER = {
  INITIAL_LIVES: 3,
  WIDTH: 42,
  FIRE_COOLDOWN: 0.22,
  // ...
};

export const STAGES = ['stage1', 'stage2', 'stage3'];

export const STORAGE_KEYS = {
  HIGH_SCORE: 'galageaux_high_score',
  // ...
};
```

Stage-specific configuration in JSON files allows easy balancing.

## Future Improvements

See [TODO_IMPROVEMENT_LIST.md](./TODO_IMPROVEMENT_LIST.md) for planned enhancements:

- [x] Extract game loop to custom hook (`useGameLoop.js`)
- [ ] Implement proper state management (Zustand/Jotai)
- [ ] Add visual debugging tools
- [ ] Performance profiling & optimization
- [x] Unit test coverage for engine modules (143 tests)

---

## Sequence Diagrams

### Game Loop Sequence

```
┌─────────┐     ┌──────────┐     ┌────────┐     ┌───────────┐     ┌──────────┐
│  React  │     │useGameLoop│     │ step() │     │ Collision │     │  State   │
│Lifecycle│     │   Hook   │     │Function│     │ Handlers  │     │ Updates  │
└────┬────┘     └────┬─────┘     └───┬────┘     └─────┬─────┘     └────┬─────┘
     │               │               │                │                │
     │ useEffect()   │               │                │                │
     │──────────────>│               │                │                │
     │               │               │                │                │
     │               │ rAF loop      │                │                │
     │               │───────────────│                │                │
     │               │               │                │                │
     │               │ calculate dt  │                │                │
     │               │───────────────│                │                │
     │               │               │                │                │
     │               │ onStep(dt)    │                │                │
     │               │──────────────>│                │                │
     │               │               │                │                │
     │               │               │ Update entities│                │
     │               │               │───────────────>│                │
     │               │               │                │                │
     │               │               │ Check collisions                │
     │               │               │───────────────>│                │
     │               │               │                │                │
     │               │               │                │ Results        │
     │               │               │<───────────────│                │
     │               │               │                │                │
     │               │               │ Commit state   │                │
     │               │               │───────────────────────────────>│
     │               │               │                │                │
     │ Re-render     │               │                │                │
     │<──────────────────────────────────────────────────────────────│
     │               │               │                │                │
```

### Audio System Sequence

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌─────────────┐
│GameScreen│     │AudioManager│     │expo-av    │     │AsyncStorage │
└────┬────┘     └─────┬──────┘     └─────┬─────┘     └──────┬──────┘
     │                │                  │                  │
     │ initializeAudio()                 │                  │
     │───────────────>│                  │                  │
     │                │                  │                  │
     │                │ Load priority 1 sounds              │
     │                │─────────────────>│                  │
     │                │                  │                  │
     │                │ loadSavedSettings()                 │
     │                │─────────────────────────────────────>
     │                │                  │                  │
     │                │<─────────────────────────────────────
     │                │ {volume, enabled}│                  │
     │                │                  │                  │
     │<───────────────│                  │                  │
     │  Audio ready   │                  │                  │
     │                │                  │                  │
     │ playSound('enemyDestroy')         │                  │
     │───────────────>│                  │                  │
     │                │                  │                  │
     │                │ ensureSoundLoaded()                 │
     │                │─────────────────>│                  │
     │                │                  │                  │
     │                │ sound.playAsync()│                  │
     │                │─────────────────>│                  │
     │                │                  │                  │
```

### Achievement System Sequence

```
┌─────────┐     ┌────────────┐     ┌─────────────┐     ┌───────────┐
│GameScreen│     │Achievements│     │AsyncStorage │     │Toast UI   │
└────┬────┘     └─────┬──────┘     └──────┬──────┘     └─────┬─────┘
     │                │                   │                  │
     │ Enemy killed   │                   │                  │
     │ updateStats()  │                   │                  │
     │───────────────>│                   │                  │
     │                │                   │                  │
     │                │ Load current progress               │
     │                │──────────────────>│                  │
     │                │                   │                  │
     │                │<──────────────────│                  │
     │                │ Check thresholds  │                  │
     │                │───────────────────│                  │
     │                │                   │                  │
     │                │ [Achievement unlocked]              │
     │                │ Save new unlock   │                  │
     │                │──────────────────>│                  │
     │                │                   │                  │
     │<───────────────│                   │                  │
     │ newlyUnlocked[]│                   │                  │
     │                │                   │                  │
     │ Show toast     │                   │                  │
     │─────────────────────────────────────────────────────>│
     │                │                   │                  │
```

### Collision Detection Flow

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────┐
│   step()    │     │collisionHandlers.js│     │collision.js │
└──────┬──────┘     └─────────┬─────────┘     └──────┬──────┘
       │                      │                      │
       │ checkBulletEnemyCollisions()               │
       │─────────────────────>│                      │
       │                      │                      │
       │                      │ For each bullet:     │
       │                      │ For each enemy:      │
       │                      │                      │
       │                      │ boxCollision(b, e)   │
       │                      │─────────────────────>│
       │                      │                      │
       │                      │<─────────────────────│
       │                      │ true/false           │
       │                      │                      │
       │                      │ [If hit:]            │
       │                      │ - Reduce enemy HP    │
       │                      │ - Create explosion   │
       │                      │ - Spawn particles    │
       │                      │ - Add score text     │
       │                      │ - Maybe spawn powerup│
       │                      │                      │
       │<─────────────────────│                      │
       │ {survivingBullets,   │                      │
       │  survivingEnemies,   │                      │
       │  results}            │                      │
       │                      │                      │
```

### Stage Progression Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     STAGE PROGRESSION                        │
└──────────────────────────────────────────────────────────────┘

  Stage 1: Orbit Siege
      │
      ├── Kill 40 enemies
      │       │
      │       ▼
      ├── Boss spawns (100 HP)
      │       │
      │       ▼
      ├── Defeat boss
      │       │
      ▼       │
  Stage 2: Nebula Assault ◄────┘
      │
      ├── Kill 50 enemies
      │       │
      │       ▼
      ├── Boss spawns (150 HP, spiral pattern)
      │       │
      │       ▼
      ├── Defeat boss
      │       │
      ▼       │
  Stage 3: Asteroid Field ◄────┘
      │
      ├── Kill 60 enemies
      │       │
      │       ▼
      ├── Boss spawns (200 HP, 4-phase)
      │       │
      │       ▼
      └── Defeat boss → Victory!
```

### Level & Bonus Round Flow

```
     ┌─────────────┐
     │   Start     │
     │  Level 1    │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │ Kill enemies│
     │ (5 per level)│
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐     No
     │ Kills >= 5? │──────────┐
     └──────┬──────┘          │
            │ Yes             │
            ▼                 │
     ┌─────────────┐          │
     │  Level Up!  │          │
     │  (max 10)   │          │
     └──────┬──────┘          │
            │                 │
            ▼                 │
     ┌─────────────┐          │
     │BONUS ROUND  │          │
     │ (10 seconds)│          │
     │ 2x score    │          │
     │ Invincible  │          │
     └──────┬──────┘          │
            │                 │
            │◄────────────────┘
            ▼
     ┌─────────────┐
     │  Continue   │
     │   playing   │
     └─────────────┘
```

