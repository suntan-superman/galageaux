# Device Profiling Guide

## Overview

This guide covers how to profile Galageaux on various devices to ensure good performance across the target device spectrum.

## Target Performance

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Frame Rate | 60 FPS | 30 FPS |
| Frame Time | < 16.67ms | < 33.33ms |
| Memory Usage | < 150MB | < 200MB |
| Load Time | < 3s | < 5s |

## Profiling Tools

### 1. React Native Performance Monitor

Enable the performance monitor in the app:

```javascript
// In development, shake device or press 'd' in terminal
// Select "Show Perf Monitor"
```

This shows:
- **RAM**: Current memory usage
- **JSC**: JavaScript heap size
- **Views**: Number of views rendered
- **UI FPS**: Native UI frame rate
- **JS FPS**: JavaScript thread frame rate

### 2. Flipper

Install Flipper desktop app for detailed profiling:

```bash
# Download from https://fbflipper.com/

# In app, flipper should auto-connect in development mode
```

Key Flipper plugins:
- **React DevTools**: Component tree and re-render analysis
- **Performance**: CPU profiling
- **Network**: API call monitoring
- **Databases**: AsyncStorage inspection

### 3. Android Studio Profiler

For Android-specific profiling:

1. Build debug APK: `npx expo run:android`
2. Open Android Studio → View → Tool Windows → Profiler
3. Connect to running app
4. Monitor: CPU, Memory, Energy, Network

### 4. Xcode Instruments (iOS)

For iOS-specific profiling:

1. Build debug IPA: `npx expo run:ios`
2. Open Xcode → Open Developer Tool → Instruments
3. Select profiling template (Time Profiler, Allocations, Core Animation)

## Device Testing Matrix

### Budget Devices (Priority: High)

| Device | RAM | CPU | Status |
|--------|-----|-----|--------|
| Samsung Galaxy A13 | 3GB | Exynos 850 | ⬜ Test |
| Xiaomi Redmi 9 | 3GB | Helio G80 | ⬜ Test |
| Moto G Play | 3GB | SD 460 | ⬜ Test |

**Target**: 30+ FPS, < 150MB RAM

### Mid-Range Devices (Priority: Medium)

| Device | RAM | CPU | Status |
|--------|-----|-----|--------|
| Samsung Galaxy A54 | 6GB | Exynos 1380 | ⬜ Test |
| Google Pixel 6a | 6GB | Tensor | ⬜ Test |
| OnePlus Nord | 8GB | SD 765G | ⬜ Test |

**Target**: 60 FPS, < 120MB RAM

### Flagship Devices (Priority: Low)

| Device | RAM | CPU | Status |
|--------|-----|-----|--------|
| iPhone 13+ | 4GB+ | A15+ | ⬜ Test |
| Samsung Galaxy S23 | 8GB | SD 8 Gen 2 | ⬜ Test |
| Google Pixel 8 | 8GB | Tensor G3 | ⬜ Test |

**Target**: 60 FPS locked, < 100MB RAM

## Profiling Checklist

### Pre-Profiling Setup

- [ ] Use release build (not debug)
- [ ] Disable developer mode overlays
- [ ] Close background apps
- [ ] Set device to performance mode
- [ ] Ensure battery > 50% (prevents throttling)
- [ ] Disable battery saver mode

### Test Scenarios

1. **Cold Start**
   - [ ] Measure time from app launch to main menu
   - [ ] Measure time to first interactive frame

2. **Gameplay - Wave 1-3**
   - [ ] Monitor FPS during normal gameplay
   - [ ] Check for frame drops during explosions
   - [ ] Monitor memory growth over 5 minutes

3. **Stress Test - High Entity Count**
   - [ ] 50+ enemies on screen
   - [ ] 100+ bullets on screen
   - [ ] 200+ particles active

4. **Boss Fight**
   - [ ] Monitor FPS during boss bullet patterns
   - [ ] Check memory during phase transitions

5. **Extended Play Session**
   - [ ] 15+ minutes continuous play
   - [ ] Monitor for memory leaks
   - [ ] Check for FPS degradation over time

## Performance Bottleneck Identification

### JavaScript Thread Bottlenecks

Symptoms:
- JS FPS drops while UI FPS stays high
- Input lag (delayed response to touches)
- Slow state updates

Common causes:
- Too many setState calls per frame
- Complex calculations in render
- Large array operations

Solutions:
```javascript
// Use useCallback for event handlers
const handlePress = useCallback(() => { ... }, [deps]);

// Use useMemo for expensive calculations
const sortedItems = useMemo(() => items.sort(...), [items]);

// Batch state updates
frameUpdate({ bullets, enemies, particles }); // Single call
```

### UI Thread Bottlenecks

Symptoms:
- UI FPS drops
- Animation stuttering
- Scroll jank

Common causes:
- Too many views rendered
- Complex view hierarchies
- Shadow/elevation effects

Solutions:
```javascript
// Use Skia for game rendering (already done)
<Canvas style={styles.canvas}>
  {/* All game objects rendered via Skia */}
</Canvas>

// Minimize native view count outside Canvas
// Use flat component hierarchies
```

### Memory Issues

Symptoms:
- Gradual FPS decline over time
- App crashes after extended play
- "Low Memory Warning" on iOS

Common causes:
- Object creation in game loop
- Unbounded array growth
- Event listener leaks

Solutions:
```javascript
// Object pooling (implemented in objectPool.js)
const pool = createBulletPool(100);
const bullet = pool.acquire();
pool.release(bullet);

// Entity limits (implemented in entityLimits.js)
setBullets(limitPlayerBullets(bullets)); // Max 100
setParticles(limitParticles(particles)); // Max 300

// Clean up listeners
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();
}, []);
```

## Optimization Techniques Applied

### Already Implemented ✅

1. **Entity Limits** (`entityLimits.js`)
   - Particles: 300 max
   - Explosions: 20 max
   - Player bullets: 100 max
   - Enemy bullets: 150 max
   - Enemies: 50 max

2. **Object Pooling** (`objectPool.js`)
   - Bullet pool ready
   - Particle pool ready
   - Explosion pool ready

3. **Batched State Updates** (`useGameState.js`)
   - `frameUpdate()` combines multiple updates
   - Entity limits auto-applied

4. **Lazy Audio Loading** (`audio.js`)
   - Priority 1 sounds loaded immediately
   - Priority 2/3 sounds loaded on demand

5. **Delta Time Independence**
   - All movement uses `* dt` for frame-rate independence
   - Game plays correctly at any frame rate

### Future Optimizations

1. **Spatial Partitioning**
   - Implement grid-based collision checking
   - Reduces O(n²) to O(n) for large entity counts

2. **View Culling**
   - Skip rendering off-screen entities
   - Already filtered in render arrays

3. **Texture Atlasing**
   - Combine sprites into single texture
   - Reduces draw calls

4. **Worker Thread Physics**
   - Move collision detection to web worker
   - Keeps JS thread responsive

## Profiling Results Template

Copy this template when recording profiling results:

```markdown
## Profiling Results: [Device Name]

**Date**: YYYY-MM-DD
**Build**: Release v1.0.0
**OS Version**: Android XX / iOS XX

### Device Specs
- RAM: X GB
- CPU: [Chipset Name]
- GPU: [GPU Name]

### Cold Start
- Launch to menu: X.Xs
- First interactive: X.Xs

### Gameplay FPS
| Scenario | Avg FPS | Min FPS | Frame Drops |
|----------|---------|---------|-------------|
| Wave 1-3 | XX | XX | X |
| Boss Fight | XX | XX | X |
| Stress Test | XX | XX | X |

### Memory Usage
- Initial: XX MB
- After 5 min: XX MB
- After 15 min: XX MB
- Peak: XX MB

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Optimization suggestion]
2. [Optimization suggestion]
```

## Quick Performance Wins

If performance is poor on a device, try these quick fixes:

1. **Reduce particle count**
   ```javascript
   // In constants/game.js
   MAX_PARTICLES: 150, // Reduce from 300
   ```

2. **Simplify explosions**
   ```javascript
   // In particles.js spawnExplosionParticles
   const count = Math.min(particleCount, 15); // Cap particles
   ```

3. **Reduce star count**
   ```javascript
   // In useStarField.js
   const STAR_COUNT = 50; // Reduce from 100
   ```

4. **Disable screen shake on budget devices**
   ```javascript
   // In constants/game.js
   SCREENSHAKE_ENABLED: false, // For low-end mode
   ```

5. **Lower background complexity**
   ```javascript
   // Skip nebula rendering on low-end
   {!lowEndMode && <NebulaEffects />}
   ```

## Reporting Issues

When reporting performance issues, include:

1. Device model and OS version
2. Profiling results using template above
3. Video of the issue if possible
4. Steps to reproduce
5. Logcat/Console output

Submit to: [GitHub Issues](https://github.com/your-repo/galageaux/issues)
