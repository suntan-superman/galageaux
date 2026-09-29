# Galageaux — Phase 0 stabilization

Date: 2026-09-28. Baseline revision: `8627fe3b1272b2893f61d146d8ca9d100963309c`.

## Result and scope

Phase 0 is implemented. The running screen now commits one authoritative gameplay snapshot and consumes its ordered events after that commit. Existing collision, spawn, projectile, lifecycle, input, effect-math and achievement contracts have production-path coverage.

Final Jest result: **24 suites passed; 394 tests passed; 0 snapshots**. This retains 243 baseline tests and adds **151 tests**. Expo dependency validation passes; Expo Doctor reports **18/18 checks passed**. These are automated checks, not evidence of native rendering performance or physical-iPhone playability after this change.

No dependency upgrades, Expo AV migration, artwork changes, shaders, new visual effects, Reanimated visual systems, Firebase integration, dormant-stage activation, native regeneration, build, deployment or commit was performed. The canvas component order and existing presentation remain intact. Necessary visible changes are corrected effect envelopes/exhaust alignment, fractional sensitivity controls, working achievement toasts, and replay/menu actions on the existing victory panel.

Before implementation, the full audit was read and git status inspected. Preexisting deleted `yarn.lock`, untracked `output.txt`, and the audit report were preserved. The first untouched baseline run was 242/243 because the old probabilistic swoop assertion failed; its source explicitly acknowledged a roughly 13% failure probability. An unchanged rerun passed **12 suites / 243 tests**. That assertion now tests the existing 2% boundary with controlled randomness rather than relying on luck.

## Authoritative live path

`src/engine/gameSimulation.js` is the production boundary used by `src/scenes/GameScreen.js`, not a copied test engine. The dormant reducer, `useGameState`, `useGameLoop`, pools and generalized input system remain unused.

```text
current sessionRef snapshot + current input
  -> bounded simulation / collisions
  -> next snapshot + ordered, session-scoped events
  -> immediate sessionRef commit + React presentation update
  -> audio cues and serialized achievement deltas
```

Commands such as move/fire/pause also commit synchronously through this boundary. React's passive-effect timing is no longer responsible for publishing entities to the next frame. There are no gameplay setters inside collision callbacks and no gameplay mutations inside React state-updater callbacks. Shots, enemy hits/kills, boss hits/kills, player hits, shield hits and pickups are recorded once; IDs include the session generation. Arrays and nested mutable gameplay records are copied before advancing. Tests exercise deeply frozen prior snapshots and multiple RAF callbacks before React renders.

Frames accept at most **100 ms**, split into at most six substeps of at most **1/60 second**. Excess stall time is discarded rather than caught up. This bounds the update and reduces coarse collision steps; it is not continuous collision detection or a claim of identical outcomes for every arbitrary frame schedule. Autofire carries cooldown overshoot: tests starting with a shot at time zero produce 46 normal shots or 84 rapid shots over ten seconds at each of 30/60/120 updates per second.

### Phases and clock ownership

| State | Gameplay/input | Clock policy |
| --- | --- | --- |
| Tutorial | No spawning, movement, firing or collisions | Gameplay timers frozen until dismissal |
| Playing | Active | Gameplay timers advance |
| Bonus | Active, existing bonus invulnerability/multipliers | Ten-second bonus advances on gameplay time |
| Boss battle | Active, including entrance | Bonus can remain an independent timed modifier during battle |
| Stage transition | No player controls, hazards or spawning | Two-second transition and existing presentation effects advance; pickup/bonus clocks freeze |
| Paused | No gameplay | Previous active/transition phase retained; all simulation clocks freeze |
| Won/lost | Terminal | Simulation freezes until retry/exit |

Background/inactive AppState changes pause play and discard the previous timestamp. Returning to the app retains the pause overlay; the player explicitly resumes. The first resumed RAF establishes a new timestamp. Retry creates a fresh session: player, level, stage, kills, score, combo, all entities, bonus, pickup clocks, spawn/fire counters, transient feedback, shake and session statistics reset. Stars reset, auto-fire resets off, tutorial does not repeat. User preferences such as sensitivity, button placement and selected input mode are retained.

Weapon/shield/slow and stage-transition deadlines are numbers in the snapshot, not native timeouts. The presentation-only toast timeout is cleaned up. Achievement completions and toast-animation dismissals are guarded by session and toast identity. React StrictMode mount-effect replay does not double-count game start.

## Confirmed defects addressed

Paths in this table are under `src/`.

| Defect / root cause | Repair | Principal files |
| --- | --- | --- |
| Autofire appended bullets then the frame overwrote the array | Shot, muzzle feedback, cooldown and event belong to the same next snapshot | `engine/gameSimulation.js`, `scenes/GameScreen.js` |
| Damage effects/clears and slow changes were overwritten at commit | Collision outcomes update the one working snapshot before commit | Same |
| Player/shield/position, bonus, level and settings were stale closures | Commands/frames use current session authority; input reads current refs | Same; `hooks/usePlayerControls.js` |
| Tutorial and victory overlays did not stop gameplay | Explicit stopped/terminal phases, including victory actions | Same; `components/StageCompleteOverlay.js` |
| Retry omitted level/bonus/statistics/transients; callbacks survived reset | Fresh session factory and simulation-owned timers; stale-result guards | Same |
| Unbounded suspension delta | AppState pause, timestamp reset, bounded frame/substeps | Same |
| Timed waves entered two arrays then were concatenated twice | One insertion and unique session-scoped entity IDs | `engine/gameSimulation.js` |
| Escaped enemies remained forever | Cull after the enemy top passes the bottom; keep above-screen entrants | Same |
| Normal scoring used nonexistent `score` | Use JSON `points`, retaining combo and bonus multipliers | `engine/collisionHandlers.js` |
| Any hit killed multi-HP enemies | Consume one bullet per hit, decrement HP, reward only death; allow multiple distinct hits in one frame | Same |
| Enemy size/speed/shooting/stage types disagreed with config | Resolve configured fields and restrict weighted selection to active-stage supported types | `engine/spawner.js`, `engine/gameSimulation.js` |
| Player spread was five parallel shots | Five symmetric divergent `vx/vy` trajectories | `engine/projectiles.js`, `engine/gameSimulation.js` |
| Boss aim/spread used inconsistent angles | Unified screen-space velocities and corrected direction conversion | `engine/boss-patterns.js` |
| Boss fire clock decremented in helper and caller | `updateBoss` is the sole decrement owner; simulation only emits/resets volleys | `engine/boss.js`, `engine/gameSimulation.js` |
| Boss HP thresholds treated as percentages | Both selectors use absolute HP and tested boundaries | `engine/boss.js`, `engine/boss-patterns.js` |
| Entrance overshot target; boss patterns depended on wall time | Clamp entrance; simulation elapsed time drives spiral/oscillation | Same |
| Repeated pickups created overlapping expiration callbacks | Refresh/replace rules with one countdown per effect category | `engine/gameSimulation.js` |
| Slow compounded and restored every enemy to one speed | Preserve each entity's resolved `baseSpeed`, apply one 0.6 factor, restore that original speed | Same; `engine/spawner.js` |
| Responder permanently captured initial tilt mode | Retained responder and stable tilt updater read synchronous current refs | `hooks/usePlayerControls.js` |
| Sensitivity was truncated and used two ranges | Shared float normalization, defaults and range across menu/game/pause | `engine/inputSettings.js`, `hooks/useGameSettings.js`, `scenes/SettingsScreen.js`, `components/PauseOverlay.js` |
| Tilt filtering/jitter cutoff depended on frame count | Elapsed-time exponential filter, integrated displacement and velocity cutoff | `hooks/usePlayerControls.js` |
| Particle radius repeatedly shrank the already-shrunk radius; life/maxLife sampled separately | One sampled lifetime, stored initial radius, clamped normalized envelope | `engine/particles.js` |
| Spark drag depended on frame count | Exponential drag and integrated displacement over elapsed time | Same |
| Shake overshoot produced invalid final offsets; exhaust added shake twice | Clamp expiry and apply each coordinate offset once | `engine/screenshake.js`, `components/canvas/PlayerShip.js` |
| Achievement API nonexistent; cumulative totals incompatible with increments | Real `checkAchievements` API; per-event deltas and separate score/combo/level maxima | `engine/gameEventEffects.js`, `scenes/GameScreen.js` |
| Concurrent achievement storage initialization could overwrite first updates | Share the in-flight storage read | `engine/achievements.js` |
| Toast omitted `visible`; obsolete dismissal could clear a new toast | Pass visible and guard dismissals/async results | `scenes/GameScreen.js` |
| Post-boss music requested nonexistent `background` | Transition event requests `gameplay` | `engine/gameSimulation.js`, `engine/gameEventEffects.js` |
| Invalid music request unloaded valid track; same paused track did not resume | Validate first; resume same paused track; wait for pending native pause before replay | `engine/audio.js` |
| Menu audio toggles persisted previous closure values | Save/apply explicit next toggle/volume values | `scenes/SettingsScreen.js` |

## Behavioral interpretations and player-facing differences

These corrections intentionally change observable behavior; they are not an unrelated balance pass.

1. **Enemy JSON is authoritative.** `points`, `hp`, `size`, and scalar `speed` are used. Type speed multiplies the existing stage/level/bonus base speed. Explicit `canShoot` wins; omitted flags preserve the previous type default (notably shooting dive enemies). Tanks now survive their configured hits; scouts/tanks use their configured shooting flags. This changes difficulty and needs playtesting.
2. **Stage restrictions apply.** Existing weights among the seven supported enemy types are renormalized over the active stage's allowed types. Stages 1–3 alone remain active. Unsupported/dormant types do not become playable. Existing formation choice, straight/zigzag/dive/chase motion and fallback behavior for other pattern names remain; there is no new choreography.
3. **Boss arrival remains a spawned-enemy quota**, not a kill quota, despite an old misleading comment. Escaped enemies count toward that quota. Only actual inserted enemies are counted. Waves are trimmed to available live-enemy capacity, so a five-enemy formation may be partial near the cap.
4. **Projectile coordinates are +X right, +Y down.** Friendly shots have negative vertical velocity; hostile aim is computed from boss muzzle to player center. Straight friendly speeds remain 420/430/440. Spread retains five shots at approximately its old 370-unit/s pace, with angles -0.2/-0.1/0/0.1/0.2 radians (about ±11.5°). Correct boss aim/spread and the removal of double cooldown decrement materially change attacks; no separate tuning was applied.
5. **Boss phases use absolute HP lower bounds.** At a threshold, the next phase begins. Stage 1: radial above70, spread above40, then burst. Stage 2: spiral above100, aimed above60, then burst. Stage 3: radial above140, spiral above80, aimed above40, then burst. Existing initial cooldown1.2s and subsequent1.1s are retained. Entrance firing remains enabled, and downward entry volleys are retained while above the screen. Entrance clamps at target Y. Oscillation preserves the old sine-velocity magnitude20 and approximately12-unit oscillation amplitude, now with deterministic simulation-time phase.
6. **Bonus preserves live rules**, not conflicting dormant constants: ten seconds after each eligible level-up through level10, existing1.5 score/1.25 movement-speed modifiers, invulnerability, and bonus kills excluded from next-level progress. Countdown now actually advances. Combo timeout remains the live1.5 seconds.
7. **Damage preserves intended clearing behavior.** An unshielded hit clears ordinary enemies and both projectile arrays, loses one life and retains feedback. Shield consumes one intercepted hit and its remaining duration. No contact damage, new invulnerability window or boss-clear-on-hit behavior was activated. Pickups are resolved after hostile hits, matching previous collision ordering; a shield collected in that step does not retroactively protect an earlier hit. Stage completion resolves before remaining hostile damage.
8. **Pickup rules are explicit.** Double/triple/spread replace one another and last10 gameplay seconds; repeating the same one refreshes without stacking. Double is consistently level2. Expiry restores the ordinary level1 weapon. Rapid lasts10 seconds independently. Shield lasts4 seconds and refreshes; a hit consumes it. Slow lasts3 seconds and refreshes without compounding; existing and newly spawned enemies receive one0.6 multiplier, then restore their individual spawn-time type speeds. Timers stop during pause/tutorial/transition/terminal states.
9. **Sensitivity is 0.5–3, default1.5, with fractional persistence.** The denominator1.5 preserves the old fresh-install effective default speed (previously hidden5/5). Previously saved values may feel stronger because the old code truncated them and divided by5. Legacy values above3 clamp to3; the shared historical key cannot identify which old UI scale authored a value, so no guessed migration was performed. Pause adjustments use0.1 steps. Filtering preserves0.85 retention at60Hz, with exact interval integration; jitter cutoff becomes3 units/second. No ship inertia or banking was added.
10. **Particles retain shapes/colors/counts**, but now shrink over their intended lifetime rather than collapsing as frame count rises. Spark velocity decay retains0.98 per60Hz frame; exact displacement integration shortens former60Hz spark travel by approximately1%. No alpha-rendering redesign or new effects were added.
11. **Achievement progress is now recorded.** Kills/bosses/pickups are increments; score/combo/level are maxima; stage completion is numeric1–3; flawless is checked against hits in the completed level. Game start is counted once per session; terminal total score once. Persistent achievement history survives retry; session counters and visible toast do not.
12. **Victory is terminal with actions.** The existing panel gains Play Again and Main Menu actions. No hazards progress beneath victory or transition overlays. Music continues during ordinary pause, preserving the existing policy; gameplay music is restored after nonfinal bosses and on retry.

## Regression evidence and test inventory

Tests exercise production modules. Screen/hook tests use the installed React test renderer with controlled native, sensor, storage, audio and drawing boundaries; they are not native or screenshot tests. Engine tests use real configuration where required, and controlled time/random inputs. Existing weak copied/dormant tests remain but are not offered as evidence for the live repair.

Failure evidence before behavior fixes:

- Original mounted screen: **4 failed / 4** — tutorial spawning, duplicate timed insertion, overwritten autofire, press event bypassing pause.
- Enemy/boss/projectile regressions: **30 failed / 35**, with5 passing. Four failures were the not-yet-created player-projectile API; the remaining failures exercised existing broken production contracts. The helper-only cooldown check already passed; new live simulation tests protect removal of the second decrement.
- Input/settings: **19 failed / 21**, with2 passing, against actual hooks/screens.
- Effect math/exhaust: **19 failed / 60**, including39 existing tests and21 new tests.
- Actual achievement manager concurrent initialization: **1 failed / 2** before sharing the load.
- Actual audio manager: **2 failed / 5** before valid-key/same-track repair; subsequent pending-pause reproduction **1 failed / 6** before ordering repair.
- During integration, auto-fire cadence failed both normal/rapid equal-time cases before overshoot preservation; a stale toast dismissal failed before identity guarding.
- The new simulation-boundary suite was written before its module existed and initially could not import it. That is an implementation contract check, **not** claimed as reproduction of an old module. The mounted screen failures and individual production-module failures provide pre-fix evidence; the boundary suite provides ongoing coverage of the replacement live path.

| Added coverage (paths under `src/__tests__/`) | New tests |
| --- | ---: |
| `engine/gameplayContracts.test.js` |31|
| `engine/playerProjectiles.test.js` |4|
| `engine/gameSimulation.phase0.test.js` |23|
| `engine/gameSimulation.edge.test.js` |18|
| `scenes/GameScreen.phase0.test.js` |12|
| `hooks/usePlayerControls.test.js` |10|
| `hooks/useGameSettings.test.js` |7|
| `scenes/SettingsScreen.test.js` |4|
| Existing `engine/particles.test.js` additions |15|
| Existing `engine/screenshake.test.js` additions |4|
| `components/PlayerShip.test.js` |2|
| `engine/gameEventEffects.test.js` |13|
| `engine/achievements.phase0.test.js` |2|
| `engine/audio.phase0.test.js` |6|
| **Total added** |**151**|

Existing boss test fixtures were converted to absolute-HP units and the probabilistic assertion made deterministic; its37-test count is unchanged. No test was deleted to obtain a passing suite.

### Final validation

```text
node --preserve-symlinks --preserve-symlinks-main .\node_modules\jest\bin\jest.js --runInBand --no-cache --coverage=false

Test Suites: 24 passed, 24 total
Tests:       394 passed, 394 total
Snapshots:   0 total
Time:        5.429 s
```

Node symlink-preserving flags avoid a sandbox Windows package-resolution EPERM; application/package configuration was not altered for this. No coverage percentage is claimed.

`npx --no-install expo install --check`: exit0, **Dependencies are up to date**. `npx --no-install expo-doctor`: exit0, **18/18 checks passed. No issues detected!** The initial sandbox checks encountered resolution/cache restrictions; diagnostics were rerun successfully with authorized access and without installing/upgrading packages. The initial offline Doctor invocation returned `ENOTCACHED`; before the successful npx rerun, Doctor1.20.4 was also run successfully from the existing npm cache:

```text
node C:\Users\sjroy\AppData\Local\npm-cache\_npx\89957a0324271eeb\node_modules\expo-doctor\bin\expo-doctor.js
```

`git diff --check` passes. The source diff was inspected, including newly created files; the large screen diff moves live rules to the tested simulation boundary rather than modernizing drawing. `package.json`, `package-lock.json`, `app.config.js`, `babel.config.js`, `eas.json`, configuration JSON and assets are unchanged. `ios/` and `android/` remain absent; no claim is made about reconstructed native settings. Preexisting `yarn.lock` deletion is not a Phase0 deletion.

## Deliberately deferred / limitations

- No graphics/motion roadmap started: banking, new silhouettes, gradients, particle rendering changes, shader/worklet systems, choreography, pooling and new gameplay remain deferred.
- No rebalance after honoring HP/speeds/shooting/aim. Correct behavior can be harder or slower in places; iPhone playtesting is the next gate.
- No Stats-screen schema consolidation, Firebase/social/leaderboard activation or migration. Achievement persistence alone is repaired here.
- Audio fixes cover valid transition keys and loaded-track pause/reentry. General concurrent track-load ownership, startup/lazy-load/retry resource management, music tempo reapplication, menu-return music policy and a late in-flight native load after navigation remain inherited follow-up concerns. Pending settings restoration can also finish after unmount; it has no gameplay snapshot authority, but global audio-preference race handling remains outside this bounded repair. Rapid navigation/interruption should be tested on-device.
- Decorative wall-clock pulses, native overlay animations and music are not globally synchronized to the gameplay clock. Existing paused drawing may change on an unrelated UI render. Gameplay positions, timers and boss pattern clocks are simulation-owned.
- Stage transitions age existing effects; terminal states freeze them. No death/victory effect staging redesign was attempted.
- Entity caps and bounded discrete collision steps remain; there is no swept-collision guarantee for arbitrary extreme velocities. Collision geometry is still inclusive AABB.
- Native Skia appearance, sensor delivery, touch responder arbitration, audio onset/interruptions, frame pacing, memory, heat and battery were not measured. Passing30/60/120 numerical tests does **not** demonstrate60/120 FPS.

## Physical-iPhone acceptance checklist

Use the preserved working build as a comparison where available. Test the updated release build on an available60Hz iPhone and, separately, a ProMotion device. Record device/iOS/build and actual observations; do not infer refresh rate from model name alone.

1. **Tutorial gate:** start with tutorial, wait at least15 seconds, touch/fire/tilt. No wave or damage should progress. Dismiss; gameplay starts normally.
2. **Normal combat:** confirm each kill awards finite points; observe multi-hit shooter/tank behavior, type sizes/speeds and stage-appropriate enemies. Let several waves escape; they must leave and spawning/boss arrival must not stall. Check ordinary hitbox alignment.
3. **Manual and auto-fire:** shoot while moving, switch autofire in pause, resume. Each shot cue/flash should accompany real projectiles. Pause blocks even rapid taps. Check cooldown consistency and that there are no duplicate volleys after a hitch.
4. **All weapons:** collect double, triple, spread and rapid. Confirm2/3/5 bullets, restrained symmetric spread, and rapid cadence. Repeat one pickup around8 seconds, then replace with a different weapon; the most recent weapon gets a fresh10 active seconds. Rapid remains independent.
5. **Shield:** collect, intercept a projectile at a new player position; lose shield but no life and see feedback at that position. Repeat/refresh, wait4 active seconds. Pause for10 wall seconds midway; remaining duration must resume intact.
6. **Slow:** observe at least two different enemy types, collect slow twice while active. There must be one slowdown factor, a refreshed3-second duration, slowed new entrants, and restoration of distinct type speeds. Pause and retry while slow is active.
7. **Damage/loss/retry:** take unshielded damage; verify one life lost, retained burst/flash/text and cleared ordinary hazards. Lose all lives. Retry from a late stage/level with weapons/bonus previously active; confirm stage1, level1, score0, five lives, base weapon, no shield/slow/bonus/combo/old muzzle/shake/toast. Wait15 seconds for obsolete deadlines; none may change the fresh session.
8. **Bonus:** reach the level1 four-kill target. Confirm level2 and a countdown from10; bonus kills do not advance the next target. Countdown completes without needing pause/resume. Verify bonus invulnerability and correct return to ordinary scoring/rules.
9. **Input modes/settings:** toggle tilt off/on repeatedly in pause, including during an existing touch gesture; touch must follow current mode and stop at edges. Set1.9 in menu and pause, exit/reenter and cold-launch; it must remain fractional and within0.5–3. Test low/default/high sensitivity, neutral stopping and simultaneous movement/fire. Reassess older saved sensitivities after the documented scale correction.
10. **Bosses:** reach all three bosses. Entrance firing is deliberately still enabled. Confirm entrance stops at target Y, cadence is no longer double-speed, spread descends and aimed fire tracks your position. Exercise every listed HP boundary. Ensure boss-hit/death rewards occur once.
11. **Transitions/victory:** defeat first/second boss with hostile shots present. The2-second panel must protect the player; next stage starts with gameplay music. Pause/background during transition and resume. Defeat stage3; wait30 seconds. Victory must remain terminal without damage or spawning. Test both Play Again and Main Menu.
12. **Suspension:** background/lock for30–60 seconds during playing, bonus, active pickup and boss battle. Return to a paused screen; tap Resume. No teleport, giant timer decrement, immediate catch-up volley or lost pickup duration should occur. Repeat using Control Center/interruption paths.
13. **Existing effects:** observe clustered kills, sparks, damage and boss death. Particle size should decay consistently instead of disappearing rapidly at high refresh; shake should stop cleanly and exhaust remain attached to the ship. Shapes/colors/counts should otherwise look familiar.
14. **Achievements/audio:** earn a new unlock and confirm visible toast plus accurate incremental progress. Retry/exit while it dismisses. Check music after bosses, retry and immediate pause/reentry; test enabled/disabled preferences and rapid navigation. Note the deferred general in-flight music-load caveat above.
15. **Sustained session:** complete a campaign and several retries; watch for unhandled errors, stuck overlays, control changes and resource growth. Profile actual frame times/memory/thermal behavior separately before making performance claims or beginning visual work.

Phase0 ends here. Physical-iPhone review and the next user decision precede any visual modernization.
