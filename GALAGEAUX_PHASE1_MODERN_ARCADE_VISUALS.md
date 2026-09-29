# Galageaux — Phase 1: modern arcade motion and impact

Date: 2026-09-29. Comparison baseline: `00cc50f8992c0211b1a32783752fd51cba2db863`.

## Outcome and preservation boundary

Implemented a restrained retro-futuristic neon presentation around the tested Galaga-style gameplay. The audit, Phase 0 report and Phase 0.5 report were read in full before changes. The initial worktree was clean; the untouched baseline passed **29 suites / 467 tests**.

No pacing, spawn balance, enemy HP/speed/fire frequency, boss movement/attacks, projectile physics, spread trajectories, collision geometry, powerup duration, scoring, level progression, achievements, Firebase, dependencies or native configuration was changed. Phase 0 remains the authoritative simulation. The only simulation-boundary additions are shield-hit particle production and a size-based choice for the existing kill shake; both are presentation-only. Collision handlers add visual contact records but retain their collision and reward decisions.

Final validation and the precise limits of that evidence are recorded below. This is ready for physical-iPhone review, not a claim of measured native performance or approved device appearance. No Phase 2 choreography was started.

## 1. Visual design language

The hierarchy is a bright, cool interceptor; compact cyan/white friendly fire; dark armored enemies retaining recognizable type accents; orange-red hostile fire; outlined glyph-bearing rewards; and a heavy violet boss against subdued space.

| Role | Primary palette / treatment |
| --- | --- |
| Player and friendly fire | Cyan `#67e8f9`, luminous core `#f1fcff`, teal material `#087ca7` |
| Hostile fire | Orange `#ff783d`, defined red edge `#d93835`, narrow hot core |
| Enemy armor | Shared dark metal `#182c43`; existing configured type colors remain as small accents |
| Boss | Muted violet `#bd86d9`, dark layered material, warm low-health accent |
| Shield | Mint `#71e5d1`, transparent center, thin boundary |
| Bonus | Restrained gold `#e8bd62`, not a gold screen wash |
| Damage | Brief coral `#ff725e` tint and white ship-local flash |

There is no full-screen bloom, runtime shader, per-particle blur, new texture/sprite atlas, persistent trail history or extra star population. Hostile projectile cores render above transient world effects. Enemy artwork receives modest in-bounds faceting and armor/role marks, not new motion or choreography. Boss bounds and rectangular silhouette remain unchanged.

## 2. Files changed

| Files | Purpose |
| --- | --- |
| `src/constants/visualTheme.js` | Shared palette, independent effect-reduction controls and presentation constants |
| `src/engine/presentation.js` | One-way movement/time observer, decorative health trail, world offset, short damage envelope and contact-light lookup |
| `src/engine/shipVisuals.js` | Pure banking, thruster and projectile-direction math |
| `src/engine/sceneVisuals.js` | Stage themes, bounded nebula/star/pickup visuals and six glyph definitions |
| `src/engine/effectVisuals.js` | Pure overlap-contact, lifetime, fragment/spark and shockwave math |
| `src/scenes/GameScreen.js` | Presentation observer and shared clock; one world group; clear draw order and screen-fixed boss bar |
| `src/components/canvas/PlayerShip.js` | Cached local hull, banking, tapered exhaust, thin shield/bonus boundaries and hull flash |
| `src/components/canvas/Bullets.js` | Friendly/hostile streaks, cores, restrained halos and muzzle feedback |
| `src/components/canvas/Enemies.js` | Shared dark armor, type details, stable keys and contact highlight |
| `src/components/canvas/BossShip.js` | Limited body material/glow and local contact flash |
| `src/components/canvas/Effects.js` | Alpha-aware particle types, oriented fragments/sparks, energy falloff and stroke rings; re-export pickup renderer |
| `src/components/canvas/Powerups.js` | Upright procedural pickup badges/glyphs |
| `src/components/canvas/Background.js`, `StarField.js` | Real gradients, soft stage depth and restrained layered stars |
| `src/hooks/useStarField.js` | Remove redundant wall-clock twinkle; preserve count, travel, wrapping and random-call pattern |
| `src/engine/particles.js` | Stable visual-only IDs and deterministic contact/ripple factories |
| `src/engine/collisionHandlers.js` | Visual contact locations, less dense ordinary destruction, large-kill metadata; no collision-rule change |
| `src/engine/gameSimulation.js` | Add shield dispersion to the existing particle array; modest large-kill shake distinction |
| `src/components/HitFlash.js`, `BossHealthBar.js` | Bounded short tint; immediate true health with a decorative trailing band |
| Ten new test files and two existing test files | Coverage inventory below |
| `scripts/verify-phase1-gameplay-parity.cjs` | Read-only differential simulation diagnostic against the committed baseline |
| `scripts/render-phase1-preview.cjs` | Real installed Skia/CanvasKit CPU rendering of production components |
| `.tmp/phase1-preview/*.png` | Generated review images only, not assets imported by the game |
| This report | Design, implementation, validation and device handoff |

## 3. Player banking and immediate stopping

The screen keeps a small **presentation-only ref**, separate from `sessionRef`. On an active frame it measures committed horizontal displacement since the previous presentation frame. This includes touch commands occurring between frames, as well as tilt movement. Zero-time command commits do not erase the previous position sample.

Target bank is `clamp(horizontalVelocity / 300, -1, 1) × 8°`, with exponential smoothing using a **90 ms time constant**. Negative velocity banks left; positive banks right. No movement produces a zero target and a smooth return. Rotation is clamped to ±8° and applied in a local group around the ship center. Neither the player's position nor its AABB changes. Stopping remains immediate in the simulation; only the drawn bank settles.

Five parsed local Skia paths—hull, wings, panels, canopy and flame—are cached at module initialization. They are not rebuilt or mutated when the player moves. Banking, geometry, camera-offset composition, frozen input snapshots and neutral return have deterministic coverage. The retained two Phase 0 camera tests now verify composed affine transforms instead of requiring absolute primitive coordinates.

## 4. Thrusters

A bright engine port feeds a tapered gradient inner flame, a low-opacity wider falloff and a short fading extension. Two small side exhausts retain the interceptor identity. There is no particle emitter or historical trail buffer.

Main flame length is **12–20 logical units**, width **6.15–7.55**, and the short trailing extension is **4–6**. Horizontal movement biases the flame tip opposite travel by at most **2.5 units**; intensity rises modestly from **0.72 to 1.0**, including the small bonus contribution. Neutral flight stays powered. Flame pulses use the same supplied visual time as stars, nebulae and pickups.

The 8° bank and short exhaust were inspected in actual code-native Skia renders. These static renders establish neither native animation quality nor touch-to-photon latency.

## 5. Friendly and hostile projectiles

Friendly shots use a white/cyan core, one small radial halo and a continuous velocity-aligned fading streak. Normal/double/triple/spread share the same renderer. Rapid mode reduces the per-shot tail opacity from **0.42 to 0.25** and halo opacity from **0.16 to 0.10**. Muzzle effects use three restrained layers instead of five.

Hostile shots use a hot center with orange and red edges, a small halo and a much shorter directional accent. Friendly tail length is bounded to **4–10 units**; hostile tail length to **2–4**. Radial, aimed and spread velocities determine accent direction. The bright core keeps the original axis-aligned projectile rectangle, including for diagonally traveling bullets, so visual orientation does not disguise a rotated/nonexistent hitbox.

Each bullet uses **three drawing primitives**, versus the old nine for friendly shots and two for hostile shots. These are scene-shape counts, not measured GPU draw calls or GPU savings. Stable projectile IDs provide render keys. No projectile constructor, velocity, speed, damage or collision dimensions changed.

## 6. Contact, destruction, debris and shockwaves

**Contact is not destruction.** Every friendly bullet contact receives an **85 ms stationary white core** and a small fan of directional sparks lasting **140–160 ms**. Location is the midpoint of the actual discrete AABB overlap, not a random target-center position and not a claimed swept-intersection solution. Nonfatal hits do not create a destruction explosion. Target IDs drive a short hull highlight; the enemy remains present with its authoritative remaining HP.

An ordinary single-hit kill now has **20 particles total**: four contact records, twelve retained burst records and four retained sparks, versus 32 old destruction particles. Of the twelve burst records, four become small oriented fragments and eight remain energy particles. Multiple actual hits can add their own contact records; the global cap still applies.

The layered destruction envelope is:

1. Contact core and a very short explosion core (at most **65 ms**).
2. Low-opacity local radial energy falloff.
3. A small number of directional sparks and rotated fragments.
4. A thin expanding stroke ring with fast squared-alpha decay.
5. Clean disappearance at the existing lifetime.

Fragments consume existing rotation data and use a dark body with a tiny highlighted edge; sparks align to velocity and are bounded to **9 units** long. Energy particles retain circular geometry. Every live particle uses its alpha/lifetime; no per-particle blur is used.

Ordinary shockwaves retain **250 ms** lifetime. Radius starts at 2 and approaches `clamp(enemy.size + 2, 22, 36)`: grunt 26, shooter 28, tank 34. Stroke width falls from 2 toward 0.75. Radius is derived from remaining life in the renderer, avoiding the old one-update radius lag without changing the engine timer. Boss death remains one existing **80-radius / 600 ms** explosion with its original burst counts and transition policy, now rendered with the same restrained ring vocabulary.

**RNG preservation matters:** old particle factories share global randomness with gameplay. Ordinary destruction therefore performs the same legacy random draws, then deterministically retains fewer records. Boss hit samples are repurposed at real contact locations while preserving their random calls and six-record count. New contact/shield factories make no random draws. This reduces visible density, not the underlying legacy factory allocation cost. Stable `fx-p-*` / `fx-ex-*` IDs use a separate counter and never advance gameplay entity IDs.

## 7. Screen shake

Phase 0's shake update/expiry math is unchanged. One Skia world group applies a **0.45 presentation gain** to both existing offset axes. Stars, ships, enemies, pickups, projectiles and world effects move together. The native score popups receive the same offset once; the base background, native HUD and boss bar stay fixed.

| Event | Existing/requested shake intensity | Maximum rendered axis amplitude before decay |
| --- | ---: | ---: |
| Ordinary enemy kill | 4.5, 150 ms | 2.025 |
| Large enemy kill (size ≥30) | 6, same 150 ms | 2.7 |
| Player damage | 10, 300 ms | 4.5 |
| Boss appearance | 12, 400 ms | 5.4 |
| Boss death | 14, 600 ms | 6.3 |

Large-kill intensity is the only changed shake trigger value; activation, duration and random sampling remain the same. Routine firing adds no shake. Boss projectile contacts use local sparks/body flash, not a new screen-wide shake per shot. The stronger boss-death feedback and existing death/transition sequence are retained.

## 8. Powerup glyphs

The six falling rewards retain their coordinates, size, speed and pickup AABB. A dark chamfered 20-unit badge with a bright border distinguishes them from bullets. Upright local glyphs encode identity without text or dependence on color:

| Type | Glyph | Accent |
| --- | --- | --- |
| Double | Two upward marks | Cyan |
| Triple | Three upward marks | Pale blue |
| Spread | Three-ray fan | Violet |
| Rapid | Lightning bolt | Muted gold |
| Shield | Shield outline | Mint |
| Slow | Hourglass | Blue-gray |

Only the small glow/border pulses; glyphs do not spin into unreadable orientations. Geometry definitions are static. The glow extends only a few units beyond the badge. No powerup rule or timer changed.

## 9. Background, stage depth and starfield

The old flat overlay and hard-edged nebula disks are replaced by one real dark-space linear gradient and two soft radial falloffs near the upper edges. The center/lower playfield stays dark. Nebula opacity is approximately **0.095–0.142**, not a broad luminous wash.

| Stage | Base gradient | Nebula accents |
| --- | --- | --- |
| 1 | `#07162b` → `#030915` → `#01040c` | Cool cyan/blue-violet |
| 2 | `#150b25` → `#080713` → `#03040a` | Violet/magenta |
| 3 | `#1c0b12` → `#0c070e` → `#030409` | Ominous muted red/amber |

The same **100 stars** and existing far/middle/near populations, positions, speed bands and wrapping remain. Far stars are tiny/dim, near stars somewhat brighter/larger, with only a rare deterministic subset receiving glow. Twinkle amplitude is gentle (alpha variation ±0.025/0.04/0.055), and near-size variation is ±2.5%. No lateral parallax was needed.

The renderer calculates twinkle once from the shared time; duplicate hook computations and decorative `Date.now()` calls are gone. The screen advances bounded visual time during gameplay and stage transitions, freezes it during tutorial/pause/terminal states, and resets it on retry. Existing effect lifetimes remain simulation-owned and age during transitions. Star **travel/wrapping** retains its original gameplay-only update gate; stars do not relocate behind the transition card, and no extra wrapping RNG calls are introduced there. Native banner/toast animation and audio retain their existing policies; this is not a global animation-clock migration.

## 10. Player damage, shield and bonus

Player damage reuses the existing feedback timer, remapped to a **140 ms visual envelope**. The hull briefly flashes white; screen tint is capped at **14% opacity**, then disappears. The existing energy burst, short meaningful shake, life reduction, HUD pulse and life text remain. Damage clearing and terminal-state behavior are unchanged.

Shield presentation has a transparent interior, thin **1.1-unit** mint boundary and faint outer rim, with a subtle pulse. Absorption consumes the shield under the same rule, then emits one **280 ms** ring expanding approximately **26→38 units**, plus four short outward streaks. It causes **no player-damage tint, life loss or damage shake**. The ripple survives the shield flag turning off because it lives in the existing particle array.

Bonus adds a thin **0.9-unit** gold boundary, a slightly brighter player glow and a small exhaust increase. The countdown, ten-second duration, invulnerability, scoring and progression remain exactly as Phase 0/0.5 established. There is no screen-wide gold overlay.

## 11. Limited boss changes

The boss keeps its rectangular silhouette, dimensions, entrance, movement, phase selection, fire timing and projectile patterns. Its material gains dark armor, a restrained violet falloff and sharper local details. Actual bullet contacts provide local sparks and an **85 ms** body highlight.

The health bar is now a compact 10-unit-high screen-fixed bar at Y=112, below the existing HUD band. Actual HP updates immediately; only a secondary pale damage trail eases with a **120 ms time constant**. It resets between bosses and freezes with presentation time. This placement needs iPhone safe-area/overlap review; no native layout correctness is inferred from Jest or the canvas-only preview.

No boss phase animation, attack tell, new entrance or death sequence was added. Terminal effects still freeze under the existing loss/victory overlays; this pass does not redesign that lifecycle.

## 12. Budgets and future effect reduction

Existing caps remain **300 particles / 20 explosions / 100 friendly bullets / 150 hostile bullets / 60 enemies / 10 pickups**. Contact and shield records count against the same 300-particle budget, not a new unbounded queue. Renderers defensively honor particle/explosion caps. Ordinary destruction is less dense; boss death factory counts are unchanged. There is no per-frame contact history collection.

`EFFECTS.motion`, `glow`, `impact`, `shake` and `background` centralize independent reduction points without adding a settings system. Threat cores remain readable when decorative glow is reduced. No simulation/worklet migration, object pool, atlas, bitmap gameplay asset, per-entity blur, full-screen runtime effect or dependency was introduced.

Source shape counts and successful CPU rendering are not measurements of native GPU cost. Existing legacy factory allocations are deliberately retained where required for random-sequence preservation. Physical-device frame pacing, thermal behavior and memory remain unmeasured.

## 13. Tests and independent gameplay parity

All **467 baseline tests** remain, plus **120 added tests**:

| Coverage | Added tests |
| --- | ---: |
| `engine/shipVisuals.phase1.test.js` — banking, neutral return, bounds, flame and projectile direction | 20 |
| `components/ShipRendering.phase1.test.js` — production ship/bullet composition, keys, core dimensions and palettes | 10 |
| `engine/sceneVisuals.phase1.test.js` — themes, bounded stars/nebulae and six glyphs | 18 |
| `hooks/useStarField.phase1.test.js` — count, movement, wrap, RNG and clock contract | 5 |
| `components/SceneVisuals.phase1.test.js` — real gradient/glyph component contracts | 7 |
| `engine/impactProduction.phase1.test.js` — contacts, survival, actual hit location, RNG, caps, shield and large-kill shake | 10 |
| `engine/effectVisuals.phase1.test.js` — alpha, radii, shockwave/ripple lifetime and debris/spark orientation | 16 |
| `components/Effects.phase1.test.js` — bounded production renderers, stroke rings and particle-type presentation | 5 |
| `engine/presentation.phase1.test.js` — immutable authority, touch sampling, pause/retry, health trail and damage envelope | 15 |
| `components/WorldVisuals.phase1.test.js` — seven enemy types, boss material/bar and bounded tint | 11 |
| Three additions to mounted `scenes/GameScreen.phase0.test.js` — immediate motion, shared clock and one world transform | 3 |
| **Total added** | **120** |

Two existing player camera-offset tests retain their purpose and count with full composed-transform assertions; the screen's existing tests only needed additional drawing mocks. No baseline test was deleted or skipped. No pixel-perfect snapshot tests were added. The impact-production regression suite initially failed 7 of 9 checks against the prior implementation, then passed; the rest of the new checks validate the requested new contracts rather than claiming old defects.

The independent differential script loads committed and current production modules into separate in-memory runtimes. Across **8 scenarios / 22,508 checkpoints**, the gameplay-state projection, complete ordered event batches and global/step random-call counts matched exactly. Coverage includes 30/60/120 Hz runs, 30/60/120-second autofire sessions, every supported ordinary HP type, clustered kills, shield/damage/loss, pickups/refresh/expiry, pause/tutorial gates, all three bosses, thresholds, transitions and victory. The 120-second stress fixture uses 50 lives to prevent early termination; the shorter runs retain five.

Visual arrays, shake and UI feedback fields are intentionally excluded from that projection; these are what Phase 1 changes. This is strong regression evidence for the exercised scenarios, not a proof of every possible execution or a device timing measurement.

## 14. Validation and visual review

Final required checks:

```text
node --preserve-symlinks --preserve-symlinks-main .\node_modules\jest\bin\jest.js --runInBand --no-cache --coverage=false
39 suites passed / 587 tests passed / 0 snapshots
Time: 11.36 s

npx --no-install expo install --check
Dependencies are up to date

npx --no-install expo-doctor
18/18 checks passed. No issues detected!

git -c safe.directory=C:/Users/sjroy/Source/galageaux diff --check
No whitespace errors
```

The Expo checks were rerun with authorized access after the sandbox's Windows Node path-resolution `EPERM`; no package installation, upgrade, prebuild or native build was performed. LF/CRLF advisories are not whitespace errors. Protected-path inspection confirms unchanged gameplay/configuration modules outside the explicitly documented effect additions, assets, dependencies, Firebase and native settings.

Additional reproducible diagnostics:

```text
node --preserve-symlinks --preserve-symlinks-main scripts/verify-phase1-gameplay-parity.cjs
node --preserve-symlinks --preserve-symlinks-main scripts/render-phase1-preview.cjs
```

The latter uses the installed Skia 2.2.12 headless renderer and CanvasKit CPU surfaces, with actual production component geometry, gradients and paths—no mocked drawing primitives or hand-drawn stand-ins. Review images: [calm Stage 1](.tmp/phase1-preview/stage1-calm.png), [spread/shield combat](.tmp/phase1-preview/combat-spread-shield.png), [stage themes](.tmp/phase1-preview/stage-themes-left-to-right-1-2-3.png), and [motion/impact timing](.tmp/phase1-preview/bank-contact-destruction-shield-timing.png). The calm fixture advances the real simulation; the combat/effect sheets are explicitly constructed review fixtures, not purported campaign screenshots. They omit native HUD/overlays and do not establish iPhone FPS, GPU improvement, temporal smoothness or safe-area layout.

Inspection found a quiet playfield, distinct cool/warm ammunition and readable six-type glyphs at the preview scale. The device checks below remain the acceptance gate.

## 15. Physical-iPhone acceptance checklist

Use the successful Phase 0.5 build for comparison. Record device, iOS, build, input mode and observations. Do not infer measured FPS from refresh-rate support.

1. **First 30 seconds of Stage 1:** the familiar single-target opening and calmer pacing must remain. Ship/exhaust should look more responsive and dimensional without extra threat clutter. Check both tilt and touch.
2. **Banking/stopping:** steer left/right, reverse, release and stop at each edge. Bank should stay subtle and settle naturally; actual movement must stop just as immediately as before. Check alignment between hull center, muzzle and collision expectations.
3. **Friendly fire:** compare normal, double, triple, spread and rapid. Continuous short streaks should follow travel; spread must retain its existing fan. Sustained rapid fire must not become a wall of cyan light.
4. **Contact vs kill:** hit a multi-HP shooter/tank once, then destroy it. First contact should be a tiny white tick/sparks, not a false destruction cue. Test ordinary kills and clustered kills; fragments/rings must clear quickly and leave warm threats visible.
5. **Shield:** collect, wait, absorb a shot, refresh and expire. Check transparent boundary and brief mint ripple/dispersion; absorption must not produce a damage tint, lose a life or gain an unexpected shake.
6. **Player damage:** take an unshielded hit. Check brief hull/tint response, energy burst, clear life/HUD change and short stronger shake. Threat-reading clarity should return immediately. Check loss/retry retains the prior lifecycle.
7. **All pickups:** identify double, triple, spread, rapid, shield and slow without relying on color. Glyphs should stay upright, readable and distinct from bullets at actual device size.
8. **Bonus:** verify subtle gold boundary, modest thruster/glow boost and a readable countdown. Duration, invulnerability, score and post-bonus pace must feel unchanged.
9. **Bosses:** inspect radial/spread/aimed/spiral/burst readability, especially over explosions. Hit flash should stay local and the true health bar update immediately. Verify the bar does not overlap HUD/notch content. Entrances, attacks, phases and death/transition timing must match the baseline.
10. **All stage backgrounds:** compare blue Stage 1, violet Stage 2 and ominous Stage 3. Hostile fire must remain obvious in the upper field and near shield/bonus effects. The center must stay quiet; stars must not aggressively flicker.
11. **Pause/resume/background/retry:** bank, nebula, glyph pulse and star twinkle should freeze without a clock jump. Resume should not add motion inertia, catch-up shots or expired pickups. Retry must clear old visual effects and banking history.
12. **Sustained ten-minute play:** include rapid fire, clustered kills, multiple stages, pause/background and retries. Watch frame pacing, delayed controls, heat, brightness discomfort and resource growth. Measure performance on-device before claiming a rate or improvement.

The subjective gate is unchanged: Can threats always be identified instantly? Does movement feel more responsive, not sluggish? Do hits satisfy? Are explosions impressive without obscuring play? Does space add atmosphere without competition? **Does it still feel like Galageaux?**

## 16. Deliberately deferred — stop here

Enemy and boss choreography, attack telegraphs, boss entrance/death redesign, phase animations, runtime shader experiments, bloom/distortion, sprite atlases, bitmap art production, worklet/renderer migration, new audio or dependency/native changes, and a full reduced-motion settings interface remain deferred to Phase 2+ or separate authorization.

Phase 1 implementation and validation end here. Wait for the user's physical-device review before further changes.
