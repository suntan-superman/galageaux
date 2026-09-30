# Galageaux — development-only Capture Studio

Date: 2026-09-29. This is a developer utility for physical-device App Store, website, future marketing, and visual-regression captures. It is **not** a player feature and does not take or edit screenshots. The production simulation, enemy/boss choreography, powerups, scoring, audio rules, Show Me presentation, and production navigation were not rebalanced or replaced.

## 1. Purpose

Capture Studio opens real GameScreen, Show Me, Achievements, Settings, and Stats screens at useful starting moments without replaying the campaign. Gameplay scenarios create legitimate production-compatible snapshots, then run through the existing simulation and renderers. A developer chooses when to freeze and take an iPhone screenshot.

## 2. Files added/changed

- New isolated development modules: `src/dev/captureGate.js`, `src/dev/captureScenarios.js`, `src/dev/captureFixtures.js`, `src/dev/CaptureStudio.js`.
- Active-route integration: `src/scenes/MainMenu.js`, `src/scenes/GameScreen.js`, `src/scenes/StatsScreen.js`, `src/scenes/AchievementsScreen.js`. `src/hooks/useStarField.js` accepts an optional RNG while retaining its existing default.
- New tests: `src/__tests__/dev/captureScenarios.test.js`, `src/__tests__/dev/captureFixtures.test.js`, `src/__tests__/dev/CaptureStudio.test.js`. Updated gate/production-compatibility tests: `src/__tests__/scenes/MainMenu.phase05.test.js`, `src/__tests__/scenes/GameScreen.phase0.test.js`, `src/__tests__/hooks/useStarField.phase1.test.js`.
- This document. Pre-existing unrelated worktree changes in `.gitignore` and `galageauxweb` were left untouched. No dependencies, native/App Store configuration, assets, or website files were changed for Capture Studio.

## 3. Exact production-safety gate

The shared gate is exactly `__DEV__ === true && process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO === 'true'`. It defaults **off**. `__DEV__` must be a development build **and** the local opt-in must be the exact string `true`; either condition alone is insufficient.

MainMenu evaluates this gate before showing `DEV · CAPTURE STUDIO`, before setting its capture route, and before executing the conditional `require('../dev/CaptureStudio')`. The Studio component checks the gate again if mounted directly. GameScreen checks it before using any injected initial snapshot, seeded RNG, capture speed, or capture-only stat-suppression path. Stats/Achievements check it before accepting display fixtures. In a release build, the normal five-item menu and ordinary Stage-1 GameScreen initialization remain active even if an opt-in value was mistakenly supplied. The guard-only module is imported by production screens; the Studio/scenario/fixture modules are not **evaluated** by a disabled menu. This is runtime route exclusion, not a claim that Metro omits their bytes from every release bundle.

## 4. How to enable locally

In PowerShell, for a local Expo development session only:

```powershell
$env:EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO = 'true'
npx expo start --clear
```

Open the development build, then tap the small orange `DEV · CAPTURE STUDIO` entry below the normal Main Menu buttons. Restart Metro after changing an `EXPO_PUBLIC_` value so the client receives the updated value. Do **not** commit the opt-in to a production config or add it to the EAS production environment. A production build stays gated off by `__DEV__` regardless.

## 5. How to disable

Remove the local variable and restart Metro:

```powershell
Remove-Item Env:EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO -ErrorAction SilentlyContinue
npx expo start --clear
```

Setting any value other than the exact string `true` also disables the feature. Confirm the menu returns to its normal five entries.

## 6. Scenario catalog

There are **33 gameplay/presentation scenarios**, plus real-screen shortcuts:

| Group | Launches |
|---|---|
| GAMEPLAY | `stage1_early`, `stage1_choreography`, `stage2_action`, `stage3_action`, `formation_entrance`, `breakaway_pair`, `mirror_attack`, `follow_the_leader`, `deep_dive_targeted` |
| POWERUPS | `powerup_double`, `powerup_triple`, `powerup_spread`, `powerup_rapid`, `powerup_shield`, `powerup_slow` |
| BOSSES | Boss 1 Aegis Sentinel, Boss 2 Violet Wraith, Boss 3 Inferno Citadel; each has `arrival`, `phase1`, `phase2`, `final`, and `death` (`boss1_arrival` through `boss3_death`) |
| PRESENTATION | `bonus_mode`, `game_over`, `final_victory` |
| SCREENS | Real Main Menu, Show Me, Achievements, Settings, Stats, plus optional representative Achievements/Stats display fixtures |

Stage-1 Early is the actual production opening snapshot. Stage action uses the configured stage, eligible enemy types, real Phase-2 flight paths, and subsequent real enemy fire. Powerup states are obtained through a production pickup step. Boss phase snapshots use production phase resolution/encounter advancement; near-death scenarios fire real player shots into a one-HP boss, and Final Victory advances through the real staged Boss-3 death before the real final-score card. Bonus countdown and Game Over use the production session logic. Representative starting scores/levels and the final score are set only in these dev snapshots, before rendering; scoring after launch follows normal rules. No screenshot-specific enemy, projectile, attack, or renderer was added.

## 7. Determinism

Each scenario ID hashes to a stable seed. Setup, live simulation, and starfield each receive deterministic, separate streams, so stars cannot perturb enemy or boss choices. `RESET SCENARIO` remounts the real GameScreen with a fresh snapshot and RNG streams using the same seed and capture session identity. The same viewport, scenario, input, and timing substantially reproduce the same entrance, selection, formation, and encounter sequence.

This is **not pixel-identical replay**: existing production particle/shake helpers still use their own random samples, and real device input/frame timing can differ. No uncontrolled RNG was added in capture setup. The factory tests validate every catalog ID at 400×800 and 390×844 and verify seeded live stepping.

## 8. Fixture-data policy

`captureFixtures.js` holds representative Stats and unlocked-achievement IDs only in memory. The actual StatsScreen/AchievementsScreen receive them via a gated `captureFixture` prop and skip local manager loading in fixture mode. They never write fixture data to AsyncStorage or overwrite the developer's saved `galageaux:stats`/achievements. Regular non-fixture screen shortcuts show the developer's real local data.

Capture gameplay also bypasses AchievementManager/stat persistence and first-play cue storage, so synthetic scores, boss kills, and resets cannot contaminate lifetime data. It still runs the actual game simulation, visual effects, and audio events. The Settings shortcut is the **real** Settings screen; changing a setting there can persist it normally, so use it intentionally.

## 9. Freeze, speed, and clean-capture controls

The orange developer panel offers `PAUSE CAPTURE`/`RESUME CAPTURE`, `0.5x`, `1.0x`, `RESET SCENARIO`, `RETURN TO CAPTURE STUDIO`, and `CAPTURE HUD: OFF`. Freeze skips capture simulation frames and blocks direct movement/fire/auto-fire commands; Pause and exit navigation remain available. Half speed scales only capture frame time at the GameScreen boundary. Neither changes production game-speed logic. Leaving a scenario unmounts its frame loop/listener and resets capture speed/chrome state.

`CAPTURE HUD: OFF` hides **only developer chrome**, not the production game HUD or legitimate in-game overlays. A transparent upper-left 44-point hotspot restores developer controls; it does not appear in the screenshot. Independently animated native UI/audio may continue while the simulation is frozen.

## 10. Tests

Focused new tests cover all scenario IDs and valid snapshots, Stage-2/3 configuration and real projectile generation, each boss identity/phase/payoff, powerup collection, bonus/loss/victory, seed replay, fixture non-persistence and release bypass, catalog/real-screen routing, clean chrome, freeze/speed, deterministic reset, and route cleanup. Updated MainMenu/GameScreen tests prove the default and disabled gates leave the production menu, initial Stage 1, stat writes, and frame loop behavior intact. Existing release and Phase 0–3 tests were not weakened.

## 11. Validation counts

| Check | Result |
|---|---|
| `npx jest --runInBand` | **54/54 suites, 805/805 tests passed** |
| `npx expo install --check` | Passed; dependencies up to date |
| `npx expo-doctor` | Passed; **18/18 checks** |
| `git diff --check` | Passed; no whitespace errors (command-local Git safe-directory override on this workstation; only LF/CRLF notices) |

Expo diagnostics loaded the workstation's existing `.env`, which did not include Capture Studio opt-in. These are source/dependency checks, not a physical iPhone or production-artifact run. New untracked files are not covered by Git's `diff --check` until staged; they were separately inspected for trailing whitespace.

## 12. Source search proving release isolation

Reviewed `rg -n 'CAPTURE|CaptureStudio|ENABLE_CAPTURE|captureScenario' App.js src --glob '!src/__tests__/**'`. Player-accessible references are confined to guarded MainMenu entry/conditional require, guarded GameScreen snapshot/speed/score-persistence branch, and guarded fixture props on Stats/Achievements. All scenario definitions, fixture values, catalog, and developer controls live under `src/dev/`; only `captureGate.js` is imported unconditionally by the four production screens. No App route, Show Me implementation, engine balance module, EAS/native configuration, or website path exposes a capture action. Release-safety tests exercise `__DEV__=false` with opt-in true and development with opt-in false.

## 13. Exact screenshot workflow

1. Use a local development build on the target iPhone; opt in and restart Metro as above. Confirm the orange developer menu entry, then open Capture Studio.
2. Choose a real gameplay, powerup, boss, bonus, terminal, or screen shortcut. For Stage 2/3 enemy projectiles, allow a few seconds of real simulation; for a near-death boss, let the real shot connect and staged payoff run.
3. If needed, choose 0.5x, freeze on the useful frame, or reset to repeat the same seeded setup. Keep the actual game HUD visible for App Store captures.
4. Tap `CAPTURE HUD: OFF`, then take a normal physical-iPhone screenshot using iOS controls. The developer panel is absent; no in-app screenshot generation or editing occurs. Tap the invisible upper-left hotspot to restore controls.
5. For Achievements/Stats, choose saved local history or the explicitly named in-memory representative fixture. Verify every visible claim is truthful for the actual product before publishing a capture. Return to Studio or Menu when done.
6. Remove the local opt-in and restart Metro after the session. Do not copy fixture data or this environment variable into a release build.

## 14. Pre-submission absence check

Before App Store submission, confirm no `EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO=true` in committed configuration or the EAS production environment. Build/install the actual release/TestFlight artifact, where `__DEV__` is false, and inspect Main Menu, gameplay HUD, Pause, Show Me, Achievements, Stats, and Settings: no Capture Studio entry, developer controls, fixture route, stage/boss jump, or synthetic score should be accessible. Run the release-safety tests and the source search above. This source change cannot replace that physical-artifact verification.
