# GalagaModern – Expo / Skia Prototype (Advanced)

This folder is a clean Expo project with:

- Main menu + game loop + game over overlay
- Player drag movement, auto-fire, and weapon levels
- Enemy waves with patterns (line, zigzag, dive, formations)
- Stage 1 boss with multi-phase bullet patterns
- Powerups (spread/double, shield, slow)
- Screenshake engine
- Particle system for explosions
- Parallax background stars
- Config-driven enemies, waves, boss

## Running

```bash
npm install
npx expo start
```

For Android debug:

```bash
npx expo run:android
```

This will generate the `android/` folder if it doesn't exist.

## Where to Look

- `App.js` – App entry, loads main menu.
- `src/scenes/MainMenu.js` – Title UI.
- `src/scenes/GameScreen.js` – Core game logic + rendering.
- `src/scenes/GameOverOverlay.js` – Retry/menu overlay.
- `src/entities/types.js` – Shared sizing constants.
- `src/config/waves.json` – Wave tuning (spawn rate, patterns, max enemies).
- `src/config/enemies.json` – Enemy HP, score, color.
- `src/config/boss.json` – Boss HP, speed, bullet patterns.
- `src/engine/collision.js` – AABB collision.
- `src/engine/paths.js` – Dive movement helper.
- `src/engine/particles.js` – Explosion particles.
- `src/engine/screenshake.js` – Camera shake offsets.
- `src/engine/formations.js` – V/line formation offsets.
- `src/engine/boss.js` – Boss state & phase logic.

Everything is intentionally simple, declarative, and ready to extend.
