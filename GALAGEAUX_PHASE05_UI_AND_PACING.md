# Galageaux — Phase 0.5: opening pacing and UI cleanup

Date: 2026-09-29. Baseline: `090e196` (`Codex Code Update 2026-09-28`).

## Outcome and scope

Implemented the controlled menu/pause cleanup and a Stage 1 opening ramp. Phase 0's simulation ownership, collisions, boss corrections, spread shots, powerup timing, achievements and artwork are unchanged.

Validation: **29 suites / 467 tests passed**, including all **394 baseline tests** and **73 added tests**; Expo dependency check passed; Expo Doctor **18/18 passed**. No dependencies, native configuration, audio assets, Firebase functionality, gameplay artwork, particles, shaders or choreography changed. No Phase 1 modernization was started.

The initial worktree was clean. Both prior reports were reviewed; the user's successful physical-iPhone Phase 0 test is the comparison baseline. This pass was verified with source/component/engine tests, not a physical-device layout or performance measurement.

## Files changed

| File | Change |
| --- | --- |
| `src/scenes/MainMenu.js` | Responsive single-line menu buttons; restore saved audio preferences before menu playback; request menu music again after returning from a child screen |
| `src/engine/audio.js` | Playback-only menu gain; apply consistently at track creation, volume updates and resume |
| `src/components/PauseOverlay.js` | Compact rows, readable numeric steppers, accessible targets, overflow fallback, removal of pause-only legal links |
| `src/config/waves.json` | Explicit opening-pacing profiles on Stage 1, levels 1–3 only |
| `src/engine/difficulty.js` | Apply those profiles to existing formulas; inject randomness into the existing ordinary-enemy cooldown helper |
| `src/engine/spawner.js` | Accept formation frequency/size and initial firing-delay multiplier; preserve existing defaults and type configuration |
| `src/engine/gameSimulation.js` | Pass resolved pacing to spawning and use the centralized ordinary-enemy cooldown helper; no state-flow/architecture change |
| `src/__tests__/engine/gameSimulation.edge.test.js` | Two fixtures derive the due spawn deadline from current difficulty instead of hardcoding two seconds |
| `src/__tests__/scenes/GameScreen.phase0.test.js` | One timed-spawn test waits for the configured interval plus its existing margin |
| Five new test files listed below | 73 production-path checks |
| This report | Changes, numerical comparison, validation and iPhone checklist |

The three existing timed-spawn tests retain their assertions for unique insertion, escaped-resident replacement and exactly-once boss arrival. Only their setup/wait reflects the intentionally longer spawn interval. No baseline tests were deleted, skipped, or had their correctness assertions relaxed.

## Opening pacing: exact interpretation

The ramp is **Stage 1 only, levels 1–3**. It is not a global slowdown and does not restart when a low-kill run reaches Stage 2 or 3. From level 4 onward, the pre-change formulas and formation settings are unchanged. Kill targets remain 4, 6, 8, then `6 + 3 × level`. The 40-enemy Stage 1 boss spawn quota is unchanged.

One Level 1 enemy is spawned on the first active simulation step. There is no new initial delay, timer or tutorial gate. It starts immediately above the screen; deterministic tests cover entry into view within one second. Ordinary spawning then follows the longer interval and lower resident cap. Level 1 has no formation bursts; Level 2 introduces smaller instances of the existing V/line formations; Level 3 restores five-member formations at a slightly reduced frequency. No movement paths, formation offsets or enemy behaviors were added or changed.

### Stage 1 ordinary-play comparison

Speeds are logical units/second before each enemy type's existing speed scalar. Recurring fire ranges below apply to ordinary shooting enemies; interval endpoints are nominal random ranges, not guarantees of exact wall-clock firing instants. Numbers with repeating decimals are rounded here; the formulas below define exact values.

| Setting | Level 1 old → new | Level 2 old → new | Level 3 old → new | Level 4 old → new |
| --- | --- | --- | --- | --- |
| Wave interval, seconds | 2 → **3.2** | 1.684286 → **2.273786** | 1.44 → **1.584** | 1.243333 → **unchanged** |
| Resident spawn cap | 24 → **4** | 30 → **8** | 36 → **16** | 42 → **unchanged** |
| Base enemy movement speed | 78 → **54.6** | 98.28 → **83.538** | 120.64 → **114.608** | 145.08 → **unchanged** |
| Recurring ordinary fire cooldown, seconds | 2.5–4 → **4.5–7.2** | 2.5–4 → **3.375–5.4** | 1.8–3 → **1.98–3.3** | 1.8–3 → **unchanged** |
| Initial firing cooldown, seconds from spawn | 0.5–2 → **0.9–3.6** | 0.5–2 → **0.675–2.7** | 0.5–2 → **0.55–2.2** | 0.5–2 → **unchanged** |
| Formation probability per wave | 60% → **0%** | 60% → **20%** | 60% → **50%** | 60% → **unchanged** |
| Formation members, before capacity trimming | 5 → **single enemy only** | 5 → **3** | 5 → **5** | 5 → **unchanged** |
| Mean requested enemies/wave before capacity | 3.4 → **1** | 3.4 → **1.4** | 3.4 → **3** | 3.4 → **unchanged** |
| Hostile bullet speed | 138 → unchanged | 170.66 → unchanged | 206.08 → unchanged | 244.26 → unchanged |

V and line formations still divide the formation probability equally. Single-enemy probability is the remainder. Type selection remains the Phase 0 stage-restricted weighted distribution. Enemy HP, size, points, shooting flags and type speed multipliers remain authoritative. For example, the Stage 1 dive type still moves at `baseSpeed × 1.2`; a lower opening base does not flatten type differences.

Level 3's mean incoming-enemy throughput is about **80.2% of its previous level-3 value before capacity effects**, and movement speed is 95% of the old level-3 value. This is a controlled approach toward normal intensity, not a claim that perceived difficulty has been measured.

### Exact formulas and profile values

Let `L` be level and `b` be 1 during a bonus, otherwise 0. The unchanged difficulty factor `d(L)` is 0.6, 0.7, 0.8 and 0.9 at levels 1–4; afterward `min(1, 0.9 + (L − 4) × 0.05)`.

The old/general formulas remain:

```text
I = max(0.5, (stage.spawnInterval / d(L) − (L−1) × 0.03) × (b ? 0.6 : 1))
C = max(3, floor(stage.maxEnemies × d(L)) + floor((L−1) × 2) + (b ? 3 : 0))
V = stage.enemySpeed × d(L) × (1 + (L−1) × 0.08) × (b ? 1.25 : 1)
Bullet speed = stage.enemyBulletSpeed × d(L) × (1 + (L−1) × 0.06)
```

Only when `stage.openingPacing[L]` exists:

```text
wave interval = I × spawnIntervalMultiplier
resident cap = min(C, residentCap + (b ? 3 : 0))
enemy base speed = V × enemySpeedMultiplier
initial firing cooldown = (0.5 + random() × 1.5) × enemyFireCooldownMultiplier
recurring firing cooldown = existing type/level cooldown × enemyFireCooldownMultiplier
```

| Profile field | L1 | L2 | L3 | L4+ / stages without a profile |
| --- | ---: | ---: | ---: | ---: |
| `spawnIntervalMultiplier` | 1.6 | 1.35 | 1.1 | 1 |
| `residentCap` | 4 | 8 | 16 | Existing formula |
| `enemySpeedMultiplier` | 0.7 | 0.85 | 0.95 | 1 |
| `enemyFireCooldownMultiplier` | 1.8 | 1.35 | 1.1 | 1 |
| `formationChance` | 0 | 0.2 | 0.5 | 0.6 |
| `formationSize` | 1 (unused: singles only) | 3 | 5 | 5 |

The existing recurring cooldown is `2.5 + random() × 1.5` at levels 1–2, `1.8 + random() × 1.2` at levels 3–4, and `1.2 + random() × 1.3` thereafter. Elite cooldown remains `0.4 + random() × 0.3`; elites are not in Stage 1's allowed types, and later stages have no opening multiplier. Boss firing and projectile logic are untouched.

The initial cooldown still starts at spawn, including above-screen travel, and shots still require the existing on-screen firing region. The firing multiplier is applied exactly once at initialization or reset, not on every frame.

### Bonus and entity-lifetime details

Ten-second bonuses, invulnerability, 1.5× score, 0.6× spawn interval and 1.25× enemy base speed remain unchanged. The profile remains active during early bonuses so the Level 2 bonus does not immediately bypass the calmer opening.

| Bonus setting | L1 old → new* | L2 old → new | L3 old → new | L4 old → new |
| --- | --- | --- | --- | --- |
| Wave interval, seconds | 1.2 → 1.92 | 1.010571 → 1.364271 | 0.864 → 0.9504 | 0.746 → unchanged |
| Resident cap | 27 → 7 | 33 → 11 | 39 → 19 | 45 → unchanged |
| Base enemy speed | 97.5 → 68.25 | 122.85 → 104.4225 | 150.8 → 143.26 | 181.35 → unchanged |

*A fresh Level 1 does not naturally start in bonus; that column documents the formula/test contract. The first earned bonus occurs at Level 2.*

Caps govern **admission of new spawns**, not despawning existing enemies. At bonus end, up to the extra three residents may remain until normal removal; no new wave is admitted while over the ordinary cap. Existing enemies retain their own spawn-time `baseSpeed` across level/bonus changes, preserving Phase 0 slow-effect restoration. A newly reset firing cooldown uses the current level's pacing. No old entity is suddenly accelerated, removed or stripped of its configured properties to impose a new profile.

Powerup durations, refresh/replace rules, pause semantics, collisions, scoring multipliers, stage progression and the authoritative commit path are unchanged. There are no new GameScreen pacing delays or architecture changes.

## Menu music

`MENU_MUSIC_MULTIPLIER = 0.25` is a track playback gain, not a replacement user preference:

```text
menu output level = saved/current user music volume × 0.25
gameplay/boss output level = saved/current user music volume × 1.0
```

The existing default preference remains 0.5, so default menu playback becomes **0.125**, while gameplay/boss remain 0.5. A saved 0.8 becomes menu 0.2 and gameplay/boss 0.8; saved 0 remains silent. This describes the numerical playback volume, not a measured fraction of perceived loudness.

The gain applies at creation, live volume changes and same-track resume without compounding. `getAudioSettings()` still returns the unscaled user preference. MainMenu reads existing saved preferences before its first playback and does not write, migrate or overwrite them. A disabled music preference is honored on cold launch. Returning from gameplay or Settings re-requests menu playback using the current preference, rather than reloading stale saved values.

Pending menu preference restoration/initialization is guarded when navigating away. General in-flight native track-loading races already deferred in Phase 0 remain outside this small gain/layout change; this is not a global audio-manager redesign. No audio assets changed.

## Menu layout

The old fixed 260-point button with 40-point padding on each side left approximately 178–180 points for an inline emoji and label. The new shared button layout:

- Width `min(320, viewportWidth − 48)`; 16-point horizontal padding.
- Separate 24-point decorative icon area and 8-point gap.
- Retains the existing pill shapes, colors, 16-point label text and letter spacing.
- All six menu labels have `numberOfLines={1}`, constrained font-fit fallback with minimum scale 0.9, and the full label exposed to accessibility.

At a 320-point viewport, the 272-point outlined button provides approximately 206 points for an icon-bearing label; at 375/390/430-point viewports the 320-point button provides approximately 254. This creates text room rather than shrinking the entire menu. Component tests cover each of those widths; they do not measure native glyph rendering.

## Pause layout

Hierarchy is now PAUSED → Resume → Gameplay (Auto-Fire, Tilt Control, Fire Button side, Tilt Sensitivity) → Audio (Sound FX, Music, Sound Volume, Music Volume) → Quit to Menu.

- Replaced repeated oversized pill controls with compact labeled rows and retained existing callbacks/settings bounds.
- Removed the subtitle and legal links from **PauseOverlay only**. Existing Terms of Service and Privacy Policy links remain in `AuthScreen`, reachable through Main Menu → Account. That screen and the underlying resources are unchanged; Settings does not contain these links.
- Numeric values use **18-point**, single-line, nonshrinking text with a **64-point minimum width**, replacing the old 28-point fixed slot. Formatting remains one decimal for sensitivity and rounded percentages for volume.
- All touchable targets, including +/- and Quit, are at least **44 × 44 points**. Toggle roles/states and descriptive adjustment labels are exposed to assistive technology. Font scaling is not disabled.
- Outer padding is 16; the card is `min(viewportWidth − 32, 360)` with 12-point inner padding and the existing 1-point border. Rows use readable 15-point labels.
- Numeric controls require at least 160 points (44 + 4 + 64 + 4 + 44). A 112-point label basis plus 8-point gap allows an inline row where space permits. Narrow/large-text rows can wrap the label above the controls rather than wrapping the digits.
- A native ScrollView with automatic iOS content insets, no bounce and no visible scrollbar provides an overflow escape for short screens or large accessibility text. It is designed to appear as a centered compact panel, not a long scrolling settings page at normal modern-iPhone sizes. No SafeAreaProvider/dependency was added.

Declared ordinary inline card geometry sums to approximately 584 points high, before device-specific insets/font measurement. At 375-point width, the card has about 317 points of inner content width; at 320 it has 262, allowing numeric rows to wrap as needed. These are source-layout budgets, **not verified iPhone screenshots or native layout measurements**.

## Tests and validation

| New production-path suite | Tests |
| --- | ---: |
| `src/__tests__/engine/openingPacing.phase05.test.js` |29|
| `src/__tests__/engine/openingPacing.integration.phase05.test.js` |13|
| `src/__tests__/scenes/MainMenu.phase05.test.js` |13|
| `src/__tests__/engine/audio.phase05.test.js` |8|
| `src/__tests__/components/PauseOverlay.phase05.test.js` |10|
| **Added** |**73**|

Before pacing implementation, the initial 29 expectations produced 25 failed / 4 passed against the old production behavior. Before menu/audio edits, the initial 17 expectations produced 14 failed / 3 passed; four further navigation/async checks were then added. Before pause cleanup, 7 of the 10 new pause checks failed. These are recorded requested-behavior regressions, not claims that every new test reproduces a historical code bug. The 13 additional progression tests verify preservation through the actual simulation rather than copied logic.

Coverage includes exact profiles and formulas, deterministic wave probabilities, initial/repeated firing, visible opening targets, capped spawning and escaped cleanup, L1→L2→L3→L4 progression, immediate bonus pacing, ordinary/bonus score, pickup expiry and slow restoration, pause/retry, single-line component contracts, touch targets, full callbacks and menu gain/preference/navigation handling.

Final commands/results:

```text
node --preserve-symlinks --preserve-symlinks-main .\node_modules\jest\bin\jest.js --runInBand --no-cache --coverage=false

Test Suites: 29 passed, 29 total
Tests:       467 passed, 467 total
Snapshots:   0 total
Time:        7.154 s

npx --no-install expo install --check
Dependencies are up to date

npx --no-install expo-doctor
18/18 checks passed. No issues detected!
```

All three final commands exited 0. The no-install flags prevent fetching/installing a missing executable. The Expo checks used authorized access after sandbox Windows Node-resolution restrictions; no package upgrade/install, prebuild or native build was performed. `git diff --check` reports no whitespace errors; Windows LF/CRLF notices are line-ending advisories only. Source/protected-path diff inspection confirms no changes to package/lock/native configuration, canvas/artwork/assets, collision/boss/projectile/powerup modules, achievements, Firebase, or GameScreen state ownership.

## Exact physical-iPhone checks

1. **Menu labels:** inspect all six buttons on the smallest supported width available (especially 320/375-point layouts) and a 390/430-point device. ACHIEVEMENTS must remain complete on one line, with its trophy separated cleanly. Check normal and enlarged text, Bold Text, VoiceOver labels and each button's navigation. Jest props cannot prove native glyph fit.
2. **Pause values:** inspect 1.5, 33%, 55% and 100%, including min/max sensitivity 0.5/3.0 and volume 0%/100%. No stacked digits, clipping or tiny text. At normal modern-iPhone size, Resume through Quit should be comfortably visible without scrolling. Check notch/home-indicator clearance.
3. **Pause accessibility:** enable a large accessibility text size on a short/narrow phone. Labels may reflow and overflow may scroll; values must stay horizontal and every action must remain reachable. Use VoiceOver on toggles and +/-; verify checked/disabled announcements, bounds, Resume and Quit. Check legal links are absent here and remain accessible through Main Menu → Account.
4. **Calm opening:** start a fresh run without tutorial or autofire. A single target should enter quickly, not a five-enemy burst. Observe at least 15–20 seconds without shooting: spaced singles, no more than the ordinary four-resident cap, and no stalled spawning after enemies escape. Repeat with tutorial dismissal and with retry.
5. **Ramp:** play through the 4-kill Level 1 target, its 10-second Level 2 bonus, the 6-kill Level 2 target, Level 3 and then Level 4. Level 2 should add moderate pressure/small formations; Level 3 should approach ordinary intensity; Level 4 should recover the previous pace. Judge the actual feel, not just the numerical table.
6. **Firing and identity:** watch Stage 1 shooters/divers for longer initial and repeated pauses. Confirm configured HP, type speed differences and existing paths still read correctly. Bullets themselves should not be globally slowed. Reach later stages and bosses to confirm their familiar speeds, patterns and corrected directions remain.
7. **Bonus/cap boundaries:** after a bonus ends, existing surplus residents may leave normally rather than vanish. New waves should wait for free capacity. Check slow pickup during early levels, pause midway, then resume/expire: each type must recover its own spawn speed. Recheck shield, weapon refresh, damage and late-level retry for Phase 0 regressions.
8. **Menu music, fresh preferences:** with no custom volume, listen to the menu for 30 seconds, then enter gameplay/boss play. Menu should be substantially less demanding; gameplay/boss retain stronger presence. No audio asset replacement should be heard.
9. **Existing audio preference:** set music 55% or 80%, exit/reenter and cold-launch. UI preference must remain 55%/80%, menu must apply the quarter gain, and gameplay must use the full chosen value. Test 0%, Music Off, re-enable, live slider changes, immediate exit/reentry and returning from Settings. Check there is no brief full-volume cold-menu start.
10. **Final regression pass:** pause/background/resume, lose/retry, complete a boss transition and final victory. Confirm no duplicate spawns, lost autofire, old pickup timers, stuck overlays or achievement changes. Native audio/navigation races noted in Phase 0 remain an observation item, not a claimed comprehensive fix.

No physical-device layout, listening, FPS or thermal claim is made from these tests. Stop after this pass; Phase 1 remains unstarted pending the next iPhone review and user decision.
