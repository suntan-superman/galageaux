# Galageaux — Phase 2: Enemy Choreography & Arcade Flight

Date: 2026-09-29. Comparison revision: `b5c2268`. Phase 1 has been built and praised on a physical iPhone; this Phase 2 implementation has **not** yet been tested on a device.

## 1. Movement architecture

The Phase 0 session snapshot remains authoritative. `gameSimulation.advance` still owns the bounded 1/60-second substeps, spawning, enemy bullets, collision, scoring, lifecycle, and events. New waves are decorated **after** the existing wave-size and resident-cap trimming, then receive the same session-scoped entity IDs. Flight updates replace only the ordinary-enemy movement branch. Existing manually constructed/legacy enemies without `flightState` retain their original straight/zigzag/dive/chase branch; boss movement is unchanged.

The full audit and Phase 0/0.5/1 reports were read before edits. The dormant full formation controller and swoop module were inspected but not activated: their wave vertical movement is not cumulative, and swoop progress is clamped before its return-completion condition. The existing formation-offset helper remains in use through the spawner.

## 2. Flight-state model

`ENTERING → FORMATION → BREAKAWAY (0.28-second anticipation) → ATTACKING → RETURNING → FORMATION → EXITING`. Later dive/elite ships may make one additional attack after their first return. An enemy retains one ID and one object slot throughout. The snapshot holds state, state/path elapsed time, progress, path descriptor, formation ID/slot and clock, attack time/family, one target snapshot, return destination, heading, anticipation, cycle count and total flight age. No generic state-machine framework or independent UI movement clock was introduced.

## 3. Path system

`flightPaths.js` evaluates cubic Bézier position/tangent, clamps progress, applies smoothstep easing, estimates path length with eight fixed samples at creation, and derives duration from the configured per-type speed. Control points are stored as normalized screen-relative coordinates; each update evaluates numeric positions without constructing Skia path strings. Slow powerup scales path-clock progress by the current/base speed ratio. Sample completion is clamped, so endpoints are exact. Equal-time 60/120 Hz endpoints have a tolerance-based test; a completely frame-schedule-independent trajectory through all state boundaries is not claimed.

## 4. Formation ownership

Each admitted wave gets a unique session-local `formationId`, and admitted members get unique indexed slots. The slot and its destination stay on the enemy through breakaway and return; death/removal releases it implicitly, without a duplicate formation registry. Wave members share `formationBornAt` and a gentle common phase: at full settle, horizontal breathing is at most 3.5 units and vertical movement at most 1.5 units. The settle-in multiplier avoids a return-to-formation snap.

## 5. Entrance patterns

- **Cascade:** a shared upper approach, with per-member 0.16-second stagger.
- **Sweep:** side-led curved entry; quiet Level 1 singles preserve their original above-screen spawn X.
- **Center fan:** near-center start and outward curve to each reserved slot.
- **Crossover:** alternating upper sides, crossing toward separated slots.

Stage 1 Level 1 alternates only cascade and sweep. Level 2 introduces fan; Level 3 onward can use all four. Singles can inherit a family label even where a multi-ship crossing has no meaning; in that case their geometry is a simple cascade. Entry targets are in the upper playfield, not near the player.

## 6. Breakaway system

Attack times are authored from the longest entrance in the admitted wave plus a level-dependent hold and a small role/type offset. Level 1 holds about 5.2 seconds after the wave's longest entry; Levels 2/3/4+ hold about 3.2/2.5/2.1 seconds. These are movement-state holds, **not** changes to Phase 0.5 spawn intervals. Breakaway captures the target and shows a small bank/outline pulse for 0.28 seconds before a new path is created from the current authoritative location. No positional teleport or warning icon is used.

## 7. Attack families

Shallow arcs end around 46% screen height; deep dives around 65%; lateral swings around 57%; hooks use a brief upper/lateral control-point detour before descending; targeted dives end near a clamped snapshot of the player's region, at 56–76% screen height. All paths remain within a readable horizontal corridor. Level 1 uses shallow attacks only. Level 2 can add deep dives. Level 3 introduces swings, while higher levels and later stages use the fuller existing-type vocabulary. These positions and durations require device feel review, not numerical rebalance from Jest alone.

## 8. Target snapshots

The player center is captured once on the `FORMATION → BREAKAWAY` transition. Targeted paths use that stored coordinate at attack construction. Subsequent player motion cannot alter the path. This also replaces the live, continuously reactive chase behavior for newly spawned kamikaze ships; legacy fixture enemies retain the old branch for compatibility. No contact-damage rule was activated.

## 9. Return behavior

An attack ends inside the lower/middle playfield and immediately starts a curved, upward return path to its original slot. The same entity is reused; no off-screen despawn/re-entry duplicate is required. The formation's restrained drift eases back in after the exact return endpoint. Ordinary ships then exit upward; later dive/elite ships can repeat once before exiting.

## 10. Enemy-type personalities

Grunts use shallow, predictable arcs. Dives launch slightly sooner, can go deeper from Level 2 and repeat once later. Shooters wait slightly longer in formation before their one attack. Scouts use wider swings and the same bounded bank. Kamikaze ships commit to a single target snapshot instead of continuous pursuit. Tanks wait longer and use broad/shallow paths at their configured slower speed. Elites use later hooks and may repeat once. HP, points, size, speed scalar, shooting flags and stage-allowed type sets are not modified.

## 11. Stage 1 choreography and pacing

The Phase 0.5 Stage 1 settings are untouched: Level 1 interval **3.2 seconds**, resident cap **4**, one enemy per wave, base speed **54.6**, formation chance **0**; Level 2 interval **2.273786**, cap **8**, formation chance **0.2**, size **3**; Level 3 interval **1.584**, cap **16**, chance **0.5**, size **5**; Level 4 resumes the existing **1.243333**, cap **42**, chance **0.6**, size **5** values. The existing level/bonus formulas, types and fire cooldown multipliers remain in place. The first entrant is still spawned on the first active step and becomes visible within one second in the production test. In a 10-second no-shoot Level 1 replay, exactly four spaced single entrants appear, never exceeding the cap. Completed flights release capacity in a 90-second no-shoot replay.

Flight can change how long an individual shooter stays visible and therefore its total opportunity to shoot. Cadence itself is unchanged. Whether the lived pressure remains as approachable as the successful Phase 0.5/1 device build is an explicit iPhone acceptance question.

## 12. Coordinated attacks

Level 2 admitted multi-ship waves use pairs with a 0.20-second offset. Later multi-ship waves rotate among mirror, leader and pincer-like plans; leaders use 0.22-second spacing, mirrors start from opposite reserved slots, and pincer endpoints leave a central gap. Remaining members depart later as singles. This changes **timing and paths**, never enemy count or wave probability. Wave IDs/slots make the selection reproducible without consuming extra gameplay random draws.

## 13. Firing integration

The existing ordinary shooting loop, initial cooldown, recurring cooldown helper, bullet constructor, bullet speed and on-screen fire gate are unchanged. A formation shooter can fire while stable; an attacker can fire if its inherited cooldown matures on-screen. There is no new volley, continuous fire or attack-triggered extra shot. The new production test confirms Stage 1's repeated-fire lower bound remains at least the existing 4.5-second minimum, allowing one substep of quantization.

## 14. Collision and off-screen policy

Simulation X/Y remain the enemy AABB origin used by the existing collision handler and renderer's outer translation. Banking is an inner draw transform only; it does not rotate AABB geometry. Entrance waiting occurs above screen. Attack/return paths stay on-screen. Completed exits are removed above the viewport; every flight also has a 45-second defensive lifetime and invalid-coordinate removal. Legacy escaped enemies retain the Phase 0 bottom cull. A bullet-kill test covers all six states, including immutable prior snapshot and no second entity. Phase 0 still intentionally has no ordinary enemy-player contact damage or swept collision.

## 15. Presentation additions

The Phase 1 dark-metal enemy bodies and configured accents remain. The renderer adds a bounded, smoothed bank of at most **0.48 radians (~27.5°)** around each unit-square body center, a small contained engine port, and a brief colored outline during anticipation. The outer translation/scale continues to match the unrotated AABB. Player, projectile, impact, background and powerup renderers are unchanged. Device inspection must judge how much rotated corners visually extend beyond the fixed hitbox.

## 16. Determinism

Entrance/group choices use session wave ID, stage and level; attack family and offsets use type and reserved slot. There are no movement-time `Math.random` calls or new random draws at spawn. The same initial snapshot, seeded random source, input and frame schedule produce identical enemy/projectile/formation results in a production replay. This also preserves the existing RNG sequence for spawns, drops and impacts up to differences caused by the intentionally changed trajectories and kills.

## 17. Performance

Each active path is four tiny normalized points and a duration. It is sampled with arithmetic per enemy/substep; length estimation occurs only when a new segment is authored. No spline package, string-path generation in simulation, worklets, pooling, particle-count increase, new textures or shaders were added. Object mapping/copying remains the established Phase 0 snapshot model. This is a source-level budget, **not** a measured native CPU/GPU/FPS improvement.

## 18. Files changed

- Added `src/engine/flightPaths.js`, `src/engine/enemyFlight.js` and `src/__tests__/engine/enemyFlight.phase2.test.js`.
- Updated `src/engine/gameSimulation.js` for wave decoration and flight stepping.
- Updated `src/components/canvas/Enemies.js` for body-local orientation and cues.
- Extended `src/__tests__/components/WorldVisuals.phase1.test.js` with visual/AABB transform coverage.
- Updated two assertions in `src/__tests__/scenes/GameScreen.phase0.test.js` that previously required linear Y motion; they still verify actual multi-frame commits and pause/resume time ownership.
- Added this report. No config JSON, dependencies, native files, assets, boss code, scoring, achievements or Firebase files changed.

## 19. Tests added

**32 additional tests**: 31 in the new production-path flight suite and one enemy-rendering contract. They cover cubic endpoints/tangents/clamping/scaling, all state transitions and segment continuity, slot ownership and shared clock, all four entries, type families, repeated dive/elite behavior, one-time targeting, pair/mirror/leader timing, slow/pause, timeout, actual bullet kills in every state, Level 1–4 admission, 10/90-second no-shoot replays, ordinary fire cooldown, seeded replay and equal-time frame schedules. No pixel snapshots were used. The two updated mounted-screen assertions preserve their test count.

## 20. Final validation counts

```text
Full Jest: 40 suites passed / 619 tests passed / 0 snapshots
npx --no-install expo install --check: Dependencies are up to date (exit 0)
npx --no-install expo-doctor: 18/18 checks passed (exit 0)
git diff --check: no whitespace errors
```

The first three commands completed successfully on Windows. No native build, iPhone frame capture or thermal measurement was performed in Phase 2.

## 21. Gameplay-parity and pacing evidence

The previous Phase 1 baseline was **39 suites / 587 tests**. All baseline tests remain passing after only two linear-motion-specific screen expectations were adapted. Production tests verify first-10-second Stage 1 quantity, resident cap, wave-size bounds at Levels 1–4, eventual release in a 90-second no-shoot run, unchanged shot cooldown, and deterministic reproduction. Existing Phase 0/0.5 tests still cover HP/scoring, powerups, achievements, boss behavior and exact difficulty formulas. This is **contract preservation evidence**, not an exact gameplay-state differential: enemy trajectories, on-screen residence and collision outcomes intentionally change, so exact parity with Phase 1 is neither expected nor claimed.

## 22. Physical-iPhone acceptance checklist

Use the working Phase 1 build as comparison. Record device, iOS version, build and input mode.

1. **First 30 seconds:** still calm, spaced singles; entrance curves obvious but not distracting; time to react and shoot.
2. **Formation:** clean settle, subtle shared breathing, stable target positions, no abrupt slot snaps.
3. **Breakaways:** short bank/outline anticipation readable, shallow first attacks dodgeable, no teleport.
4. **Banking/hitboxes:** visual heading follows the curve; rotated corners do not create misleading hits or misses, including near edges.
5. **Targeted dives:** move after a kamikaze commits; it must not chase the new position continuously.
6. **Coordination:** pairs/mirrors/leaders read as choreography without becoming a projectile or body wall.
7. **Return:** natural upward curve, original slot restored, no duplicate or overlapping phantom ships.
8. **Combat:** hostile bullets remain clear during curves; impact/explosion layers do not hide attackers. Check actual Stage 1 shooter pressure against the prior build.
9. **Later levels:** Level 2 pairs/deep dives, Level 3 swings, Level 4+ hooks/variety increase excitement without just increasing clutter.
10. **Ten-minute session:** include pause/background/retry, slow pickup, multi-HP enemies and bosses; watch for stalled spawns, invisible residents, missing formations, input lag, heat and frame degradation. Measure performance before reporting FPS.

## 23. Deliberately deferred

No boss choreography, new enemy class, Stage 4–6 activation, contact-damage activation, swept collision, shader/bloom/distortion, renderer/worklet migration, object pooling, new dependency or Phase 0.5 balance rewrite. Stop for physical-iPhone assessment before tuning choreography or opening pressure further.
