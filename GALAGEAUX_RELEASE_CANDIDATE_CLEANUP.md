# Galageaux — release-candidate cleanup

Date: 2026-09-29. Scope: focused cleanup of the release-facing contradictions in `GALAGEAUX_FINAL_PRODUCT_AUDIT.md`. This is not a new gameplay phase. Phase 0–3 simulation, pacing, choreography, effects, scoring values, the active three-stage campaign, and the 27-second Show Me presentation were left intact. No Firebase credentials, new backend, assets, dependency changes, native changes, or commit were added.

## 1. Files changed

App/route and UI: `App.js`, `src/scenes/MainMenu.js`, `src/scenes/GameScreen.js`, `src/scenes/AchievementsScreen.js`, `src/scenes/StatsScreen.js`, `src/scenes/SettingsScreen.js`, `src/components/GameHUD.js`, `src/components/StageCompleteOverlay.js`, `src/components/GameErrorFallback.js`.

Managers/effects: `src/engine/achievements.js`, `src/engine/audio.js`, `src/engine/gameEventEffects.js`.

Tests: updated `src/__tests__/components/GameHUD.readability.test.js`, `src/__tests__/engine/gameEventEffects.test.js`, `src/__tests__/scenes/GameScreen.phase0.test.js`, `src/__tests__/scenes/MainMenu.phase05.test.js`, and `src/__tests__/scenes/SettingsScreen.test.js`; added `src/__tests__/components/StageCompleteOverlay.release.test.js`, `src/__tests__/engine/achievements.release.test.js`, `src/__tests__/engine/audio.release.test.js`, `src/__tests__/scenes/AchievementsScreen.release.test.js`, `src/__tests__/scenes/App.release.test.js`, and `src/__tests__/scenes/StatsScreen.test.js`.

## 2. Firebase startup behavior

The active App → Main Menu → Stats import chain no longer imports Auth/Firebase. Account is no longer an active menu route, and Stats reads the local achievement manager. Dormant Auth/Firebase service files remain in place, but launching, Show Me, playing, saving local settings/achievements/stats, and winning do not require them. A rendered App/menu/local-Stats test clears all public Firebase variables and installs a fail-fast Firebase-import tripwire; the production simulation is also advanced in that test. This is a source/test result, not a claim about an unbuilt iOS artifact or network traffic.

## 3. Achievement fixes

The manager returns unlocked achievement **IDs**. The gallery now uses those IDs directly for each card and the completion count, so saved unlocks render unlocked and other achievements remain locked. Unknown saved IDs do not inflate the count. The always-empty, misleading `NEW` badge was removed. Initial achievement loading is shared and then cached in memory so an overlapping screen load cannot overwrite a newer gameplay update. Rendered gallery and manager persistence/duplicate-unlock tests cover this contract.

## 4. Replacement Legend achievement

The existing `legend` ID, name, and icon remain, but its requirement and description are now **Reach level 6**, following Survivor at level 5. This is reachable in the active campaign: a controlled-hit test using the production simulation reaches level 6 during Stage 3, before victory. Existing saved `maxLevel >= 6` is reconciled on load without generating a duplicate toast. No stages were enabled or balance values changed.

## 5. Stats changes

Stats now displays only the active `galageaux:stats` manager fields: `gamesPlayed`, `highScore`, `totalScore`, `totalKills`, `totalBosses`, `totalPowerups`, `maxCombo`, `maxLevel`, and `stagesCompleted`. It no longer reads the orphan `@galageaux/player_stats` shape or presents authentication, sync, or cloud claims. The labels distinguish **Best Score Reached** from **Total Finalized Score**. Fresh storage shows zero/empty history, not fabricated play.

## 6. Account hiding

The Account button, route, and eager AuthScreen import were removed from the active five-item Main Menu. The underlying Auth/Firebase code was not deleted or completed. Menu width and existing five-button layout remain responsive.

## 7. First-play cue

Direct PLAY can show a two-line, nonblocking cue: “TILT TO MOVE · HOLD FIRE TO SHOOT” and “For touch: PAUSE → Tilt Control Off.” It sits below the measured HUD, accepts no touches, auto-dismisses after 3.8 seconds, and uses the local `galageaux:firstPlayCueSeen` key. Opening Show Me suppresses the cue for that and later menu PLAY routes and records the local seen key. Show Me itself was not lengthened or rewritten.

## 8. Exit removal

The live gameplay HUD Exit action is gone. Deliberate Quit to Menu remains inside Pause; Game Over, Victory, and Show Me navigation remain. Before returning to the menu, GameScreen waits for already-queued achievement/stat writes to settle so an immediately opened Stats or gallery view sees committed state.

## 9. Terminal audio policy

- Loss: play the existing `playerDeath` cue and loop the existing `gameOver` theme; gameplay/boss music yields to it.
- Victory: play the existing `levelUp` cue and stop the active music. The final screen is intentionally quiet afterward.
- Retry/Play Again: request the gameplay theme for the new session.
- Return to Menu: request the menu theme once that route is active.

The audio manager serializes native track transitions and honors the latest navigation intent, including rapid retry/menu changes and user music/SFX preferences. No new audio asset was introduced.

## 10. Victory presentation

After the existing staged final-boss destruction resolves to the `won` phase, the card shows **YOU WIN**, **FINAL SCORE**, the grouped final score, **PLAY AGAIN**, and **MAIN MENU**. No change was made to boss-death or victory timing. The card uses a bounded width and fitted headings for narrow screens; physical layout is still a device-check item.

## 11. Toast queue

Simultaneous achievement unlocks now enter a small FIFO queue and display sequentially instead of replacing one another. Dismissal is guarded by toast identity and session ID; retry/unmount clears stale items. The gallery does not pretend an unlock is “NEW” when no recent-unlock state exists.

## 12. Settings cleanup

Main Settings now contains only persistent Sound FX, Music, their volumes, Tilt Sensitivity, and Fire Button Side. Unrendered internal `tiltEnabled`/`autoFire` state was removed; Pause remains the place for session-only Tilt Control and Auto-Fire. Reset removes only the three visible persistent setting keys and applies defaults after storage succeeds. Failed writes show an accessible warning; an unrelated successful write cannot clear the warning for a different unsaved setting.

## 13. Quit/statistics policy

A real session start, including a Retry/Play Again session, increments `gamesPlayed` once. Kills, bosses, powerups, level/stage milestones, max combo, and high score are committed as their events occur, so they can include progress from a later-abandoned run. `totalScore` counts **only finalized loss or victory runs**; deliberate Pause → Quit does not emit `sessionEnded` or add the partial score. Stats labels and tests follow this policy. A zero-score finalized run adds zero, not an extra score event.

## 14. Audio initialization ownership

Concurrent callers share one pending `initializeAudio()` promise. A cold immediate PLAY and the music request itself await readiness instead of returning an early false/silent result. Music operations are serialized by latest route intent; music disabled/enabled transitions retain the latest intended track while respecting terminal stop. Focused audio lifecycle tests cover cold launch, immediate PLAY, Show Me → PLAY, retry, menu return, music disabled, and rapid navigation.

## 15. Error UX changes

The render fallback now offers a Main Menu escape, and no longer guarantees that scores are safe after an error. Config validation failures use player-facing copy; raw validation details are development-only. Settings write/reset failures display an explicit warning. This is intentionally small; it is not a general crash recovery or telemetry system.

## 16. Legal/support placement

The existing Terms and Privacy URLs moved from hidden Account to the nonintrusive Settings footer: `https://galageaux.com/terms` and `https://galageaux.com/privacy`. The URLs were preserved, not invented or verified here. No real support destination was present in active source, so **a genuine support contact/location remains a release item** rather than a fabricated address.

## 17. Tests added

Focused rendered/manager/lifecycle coverage now exercises App startup with missing Firebase env, saved gallery IDs/count/locked state, the reachable Legend requirement, local Stats across fresh/loss/retry/victory/reload and maxima/cumulative behavior, Account absence, first-play cue and Show Me suppression, absence of live Exit, terminal/cold-start/rapid-navigation audio, Victory final score, sequential toasts, Settings truthfulness/failures, and deliberate quit accounting. Existing phase tests were retained.

## 18. Final validation results

Final post-integration results:

| Check | Result |
|---|---|
| `npx jest --runInBand` | **51/51 suites, 721/721 tests passed** |
| `npx expo install --check` | Passed; dependencies up to date |
| `npx expo-doctor` | Passed; **18/18 checks** |
| `git diff --check` | Passed; no whitespace errors (command-local `safe.directory` override required by this workstation's repository ownership; Git reported only LF/CRLF normalization notices) |

The two Expo diagnostics loaded this workstation's `.env`; the App regression test separately cleared Firebase variables and failed on any active Firebase bootstrap import. None of these checks produces or validates a physical iPhone/TestFlight artifact. Untracked new files are not included in Git's `diff --check` until staged; they were inspected separately for trailing whitespace.

## 19. Exact physical-iPhone release-candidate checklist

1. Build/install a clean production or TestFlight iOS artifact with **no Firebase environment values**; airplane-mode cold-launch through native splash, JS splash, Main Menu, Show Me, PLAY, and a complete three-stage victory. Confirm no auth/Firebase failure or required network request. Repeat online.
2. On a fresh install, take direct PLAY: confirm cue readability, no blocked input/threats, automatic dismissal, and no repeat on later PLAY. Separately open Show Me first, then Back → PLAY and Show Me → PLAY; confirm no duplicate cue and that the 27-second demo/Replay/Skip remain correct.
3. Test tilt movement, hold-to-fire, Pause → Tilt Control Off → touch movement, Auto-Fire, Fire Button Side, sensitivity, and Pause → Quit. Confirm the live HUD has no Exit target and every intended escape remains tappable.
4. Play dense normal/bonus/boss sequences through all three stages; verify scoring, shield drops/blocks, boss HP/hit feedback, distinct choreography, inter-stage handoff, the full Stage-3 death payoff, and final Victory score. Compare score with the preceding HUD.
5. Trigger loss → Retry, Victory → Play Again, and terminal → Menu. Listen for Game Over, victory cue/quiet, gameplay restart, and menu theme. Repeat with Music and SFX off/on, including toggling Music on after a track changes while muted; test rapid navigation, silent switch, background/foreground, and interrupted audio.
6. Check Stats/Achievements on a fresh install, after a scored Pause → Quit, after loss, after Retry, after victory, and after force-close/relaunch. Confirm cumulative/max fields, finalized-only total score, earned/locked gallery cards, Legend at level 6, and no duplicate unlock toast.
7. Save each persistent setting, force-close/relaunch, and confirm it persists. Test Reset to Defaults and verify Pause-only Tilt/Auto-Fire are not implied to persist. If a storage failure can be induced, confirm the warning remains until the failed setting is successfully saved or reset.
8. Capture narrow/small supported iPhone, notched/Dynamic-Island iPhone, and enlarged-text screenshots of native launch, menu/audio badge, Show Me longest lesson/actions, first-play cue, normal/bonus/boss HUD, toast, Pause top/bottom, Settings legal footer, Stats, gallery, Game Over, inter-stage card, and Victory. Check safe areas, clipping, overlap, and touch targets.
9. Open Terms and Privacy from Settings on device; verify destination reachability/content. Identify and provide a real support destination before distribution. Confirm bundled music/SFX provenance and distribution rights.
10. Inspect the actual generated icon/native launch screen, iOS build/version metadata, motion-sensor behavior/usage strings, distribution/privacy metadata, and release-build network traffic. Do not infer these from passing Jest or Expo diagnostics.
11. On an older supported and a current iPhone, stress dense volleys, clustered kills/effects, boss transitions, repeated retries, Pause scrolling, and background/resume. Record JS/UI frame stalls, touch/fire latency, memory trend, thermal behavior, and audio handoff; fix only observed regressions.

## 20. Remaining manual verification

No physical iPhone run, clean production/TestFlight build, missing-env EAS artifact, network trace, legal-link visit, support destination verification, asset-rights check, native metadata inspection, large-text screenshot set, or device performance/audio-comfort profile was performed in this source cleanup. Those are release gates, not claims that the app failed them. The prior audit document is preserved as an untracked worktree file and was not altered by this cleanup.
