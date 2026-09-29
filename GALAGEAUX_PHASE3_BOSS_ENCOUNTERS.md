# Galageaux — Phase 3 boss encounters

Implemented for the three active campaign stages. This report records what changed and what still needs physical-iPhone review; automated checks do not establish device feel or frame rate.

## 1. Previous boss architecture

At the existing ordinary-enemy spawn quota, the session created a generic 80×60 boss at `(screen center − 40, −120)`. `boss.js` moved it linearly to `y=100` at 40/50/60 px/s, then applied a roughly 12 px sine oscillation. Its initial 1.2 s fire cooldown ran during entry, followed by roughly 1.1 s volleys. HP thresholds selected a pattern, but there were no encounter or phase-transition states. A lethal hit created the large effects and stage transition/victory immediately. The small rectangular Skia body and health bar did not distinguish stages. Phase 0's corrected projectile angles, absolute-HP thresholds and single cooldown decrement were the starting contracts.

## 2. New encounter-state architecture

The authoritative boss snapshot now owns `ANNOUNCING → ENTERING → READY → TELEGRAPHING → ATTACKING → RECOVERING`, with `PHASE_TRANSITION`, `DYING` and `DEFEATED` branches. It stores state/encounter/phase/attack elapsed time, attack index/family, captured target, active movement path, telegraph/recovery values and death-cue progress. All changes are advanced by the simulation clock in `bossEncounter.js`/`gameSimulation.js`; no gameplay timer is owned by React or `setTimeout`. Pause and background suspension freeze the clock through the existing session lifecycle. A due volley is committed only after player-bullet collision resolution, so a lethal/threshold hit can cancel it.

## 3. Boss arrival sequence

The original spawn-count quota is unchanged. Crossing it clears ordinary enemies and hostile bullets, creating a protected 1.15 s announcement/breathing interval. The boss then follows a cubic entry path lasting 1.9/1.7/2.15 s for stages 1/2/3 and settles for 0.42/0.36/0.48 s before its first tell. Boss and enemy bullets are absent during announcement, entrance and ready. The combat lane ends at `min(0.27 × screen height, 178)` rather than the former `y=100`, separating the hull from the screen-fixed HUD.

## 4. Boss announcement

A short, non-intercepting “WARNING · STAGE GUARDIAN” banner names Aegis Sentinel, Violet Wraith or Inferno Citadel. It fades in during announcement and out during early entry. The existing appearance sound and a small shake coincide with entry, not quota crossing. This is a screen overlay, not a gameplay-blocking cutscene.

## 5. Boss 1 visual identity

Aegis Sentinel is broad and symmetric, with blue armor, cyan core and paired side emitters. Its 46 px lateral offset and long recovery make it the teaching encounter.

## 6. Boss 2 visual identity

Violet Wraith uses a more angular, winged hull with purple/magenta energy and a pointed core. Its 82 px lateral offset and shorter recovery make it visibly more active without continuous pursuit.

## 7. Boss 3 visual identity

Inferno Citadel has the heaviest armored silhouette, orange/red sections and a white-hot central core in later phases. Its 58 px deliberate repositioning, longer arrival and larger death effects distinguish the campaign climax without faster projectile configuration.

## 8. Procedural boss rendering

All three craft use stage-specific SVG geometry parsed into nine cached Skia paths at module load (three each), with local fills/strokes, two gradients, cores and emitters. Paths are not rebuilt per frame. A tell charges the core for radial/spiral patterns and the emitters for spread/aimed/burst; phase-index accents change persistently. The existing world-only shake transform applies to the craft, while HUD remains fixed. No bitmap, shader, package or native configuration was added.

## 9. Collision/hitbox policy

The authoritative boss remains exactly 80×60 at its simulation coordinates; art is drawn inside that body apart from a small non-colliding energy halo. Rendering transforms and death fade do not change collision. Player projectiles continue to use the existing AABB collision and per-contact location. A legacy seeded boss snapshot can be normalized into an explicit state without moving its authored coordinates.

## 10. Boss movement choreography

Entrance and post-attack repositioning reuse the Phase 2 cubic-path sampler. Stage-specific, indexed left/right/center offsets give intentional arcs rather than random or continuous player tracking. Movement clamps to a 16 px horizontal margin; combat arcs rise only 7/16/10 px for stages 1/2/3. On a 400×800 test field, 60 Hz position deltas remain below 8 px/frame, and 30/60/120 Hz equal-time endpoints are close. No ordinary-enemy path code was edited.

## 11. Telegraph system

Every volley has an explicit 0.58–0.84 s tell, varying by pattern and stage. The boss lights either its core or emitters, and aimed/burst patterns capture the player's position when the tell begins, giving a committed destination and a fair chance to move. There is no invisible continuous homing. The attack cue is the existing single `bossFired` event at release; no rapid extra audio loop was introduced.

## 12. Attack/recovery rhythm

One volley is emitted on `TELEGRAPHING → ATTACKING`, followed by a 0.12 s attack state and a full reposition/recovery before the next tell. Stage 1 recovery is 1.8/1.65/1.5 s by phase; Stage 2 is 1.5/1.35/1.25 s; Stage 3 is 1.75/1.6/1.45/1.3 s. Recovery and phase transitions remain vulnerable, with no new invulnerability rule. This intentionally reduces volley frequency versus the old ~1.1 s cadence.

## 13. Boss 1 attack choreography

Existing radial (12), spread (7), then burst (8) families remain bound to the three configured HP phases. The radial core tell introduces the system; spread/burst illuminate emitters. Its generous recovery and 46 px offset keep the first boss approachable.

## 14. Boss 2 attack choreography

Existing spiral (6), aimed (1), then burst (8) families retain their configured order. The spiral core tell differs from the emitter-led aimed strike, and the latter uses the target captured at tell start. Longer lateral arcs follow volleys, not simultaneous firing.

## 15. Boss 3 attack choreography

Existing radial (12), spiral (6), aimed (1) and burst (8) phases remain. The final phase alternates familiar burst and radial volleys, each separated by the full recovery and reposition; it never stacks simultaneous families. Thus every generator's per-volley count is unchanged, but alternating final-phase radial volleys contain 12 instead of the former phase-only burst count of 8. There is no increase to configured bullet speeds.

## 16. Phase transitions

Existing absolute-HP thresholds are applied exactly at the boundary. A crossing cancels a due attack, emits one phase event, pauses attacks for 0.8/0.9/1.05 s, pulses the body/bar and shifts accents. The player can still damage the boss. Multiple thresholds are reachable; no duplicate transition is emitted from subsequent frames.

## 17. Boss damage feedback

The existing Phase 1 contact particles/flash remain at actual hit coordinates. Ordinary hits immediately reduce authoritative HP, emit `bossHit` and have no large new shake. Threshold hits get the stronger phase pulse; lethal hits begin destruction. Score remains +1000 once per boss.

## 18. Health-bar changes

The thin boss bar and name appear only once entry finishes. The bar receives true HP immediately and a separate trailing presentation value; threshold ticks and brief phase border pulse add context. Its top is `max(130, initial safe-area top + 88)` screen pixels, with the name above. It stays out of the world shake and disappears on death. Device inspection must still confirm notch/Dynamic Island clearance for the actual iPhone model.

## 19. Death sequence

At zero HP, all hostile bullets, enemies and player bullets are cleared, firing stops and the session enters `bossDeath`. Four simulation-timed cues occur at +0.10 s (core instability), +0.28 s (two flank bursts), +0.52 s (central release, restrained particles and strongest shake) and +0.72 s (shockwave). The body fades by +0.9 s. The overlay begins at +1.35 s for stages 1/2 or +1.5 s for Stage 3. Death can be paused/resumed without an out-of-band timer.

## 20. Audio sequencing

Boss music starts at quota crossing; `bossAppear` plays at entrance, `bossDeath` at lethal hit, existing `levelUp` is a quiet phase cue and a louder one marks final victory. Music returns to gameplay after the existing Stage 1/2 handoff. No new audio assets or library were added. Whether these align pleasantly in headphones/phone speakers remains a device-review question.

## 21. Stage-complete/victory timing

The Stage Complete overlay cannot appear before the death clock finishes. Stage 1/2 retain the pre-existing 2 s transition after the new 1.35 s payoff, then return to gameplay music. Stage 3 enters `won` after its 1.5 s payoff, emitting `victory` and `sessionEnded` then—not underneath the destruction. No hostile collision runs during death or transition.

## 22. Determinism strategy

Stage, phase and attack index choose each attack; stage-specific offset tables choose movement destinations. Position paths and all clocks derive only from the session's substeps. Aimed target is a stored snapshot. The new choreography uses no `Math.random`; existing visual particle randomness remains non-gameplay presentation. Same snapshot, input, RNG and frame schedule replay identically in tests.

## 23. Performance/effect budgets

At most one boss uses about 16 Skia shape primitives (17 with hit flash), plus two gradient nodes; the nine path objects are cached. A regular contact uses the existing small Phase 1 effect. The staged death creates at most three simultaneously live localized explosions around the central release, one shockwave ring and **34** new particles for Stages 1/2 or **44** for Stage 3 (including debris). A new volley contains 1–12 hostile bullets; the existing global limits remain 150 hostile bullets, 300 particles and 20 explosions. No global cap was raised. These are design budgets, not measured iPhone GPU/FPS claims.

## 24. Files changed

- New: `src/engine/bossEncounter.js`, `src/components/BossAnnouncement.js`, `src/__tests__/engine/bossEncounter.phase3.test.js`, `src/__tests__/components/BossVisuals.phase3.test.js`, this report.
- Updated runtime: `src/engine/gameSimulation.js`, `collisionHandlers.js`, `gameEventEffects.js`, `presentation.js`; `src/components/canvas/BossShip.js`, `src/components/BossHealthBar.js`, `src/scenes/GameScreen.js`.
- Updated regression tests: `WorldVisuals.phase1.test.js`, `gameEventEffects.test.js`, `gameSimulation.edge.test.js`, `gameSimulation.phase0.test.js`, `impactProduction.phase1.test.js`, `GameScreen.phase0.test.js`.
- Untouched: boss configuration/projectile generators, ordinary-enemy movement/types/counts/firing, player physics, scoring rules, dependencies and native configuration.

## 25. Tests added/changed

New production-path tests cover all encounter states, arrival protection and first-volley timing, per-phase volley counts/directions, target commitment, bounded/continuous motion and equal-time tolerance, exact HP boundaries, once-only phase events, vulnerability, hit location, replay determinism, death cues, hazard cleanup, pause/resume, stage handoff and clean retry. New component tests cover silhouette identity, tells, phase accents, death fade, true/trailing HP, markers and announcement touch behavior. Legacy tests changed only where they encoded instant boss entry firing, immediate death overlays/effects, or the former fixed bar position; they retain the underlying once-only, collision, scoring, lifecycle and safety assertions. Existing ordinary-enemy tests remain unchanged and pass.

## 26. Final validation counts

Final run: **42/42 Jest suites and 664/664 tests passed**; `npx --no-install expo install --check` reported dependencies up to date; `npx --no-install expo-doctor` passed **18/18 checks**; `git diff --check` exited 0 (only Git LF→CRLF working-copy notices, no whitespace errors). No physical-iPhone run was performed here.

## 27. Exact player-facing behavioral changes

| Behavior | Before | Phase 3 |
| --- | --- | --- |
| Arrival | Immediate generic boss, slow linear descent to `y=100`; could fire during entry | Protected 1.15 s announcement, 1.7–2.15 s authored entrance, 0.36–0.48 s settle, then tell; combat lane `min(27% height,178)` |
| Attack cadence | Initial 1.2 s cooldown then ~1.1 s per volley, even during entry | Every volley follows a 0.58–0.84 s tell and 0.12 s attack, then 1.25–1.8 s recovery/reposition |
| Projectile counts/speeds | Existing radial 12, spread 7, spiral 6, aimed 1, burst 8; stage speeds 260/280/300 (aimed ×1.2) | Generator counts and speeds unchanged; only Stage 3 final phase alternates 8-shot burst with 12-shot radial, so final-phase total over time differs |
| Movement range | ~12 px sine oscillation after entry | Indexed curved left/center/right offsets of 46/82/58 px by stage; clamped to 16 px side margins |
| Vulnerability | Damageable throughout entry/combat | Still damageable in all visible states, including phase transitions and recovery; no added invulnerability |
| Phase change | Pattern switched immediately at threshold | Immediate HP/pattern index, then 0.8/0.9/1.05 s visible attack pause; due volley is canceled |
| Death and stage handoff | Explosion and completion/victory overlay on lethal frame | Hazards cleared immediately, four cues through +0.72 s, overlay at +1.35/+1.5 s; existing Stage 1/2 2 s transition follows |

## 28. Physical-iPhone acceptance checklist

- Fight each boss start to finish: is Stage 1 approachable, Stage 2 more mobile yet readable, and Stage 3 an unmistakable but fair climax? Check first tell, pattern contrast, dodging after aimed commitment, useful recovery, phase-change clarity and no projectile walls.
- Check actual impact position, immediate bar decrease, boss name/markers and HUD clearance on the device's notch/Dynamic Island. Confirm body/hitbox alignment and that no boss becomes invisible or duplicates.
- Check death pacing: no post-zero hazards, four readable local cues, no premature overlay, stronger Stage 3 payoff; listen for appearance/death/transition audio timing.
- Complete a roughly 10-minute/full-campaign run. Pause/resume and background/resume during combat, telegraph, phase transition and death; retry after boss-related loss and after victory. Watch for stale timers, stuck bar, duplicate events, frame degradation, heat or audio issues. Record observations rather than assuming automated results prove feel/performance.

## 29. Deliberately deferred

No Stage 4–6 activation, new bosses/enemies/weapons/progression, multiplayer, Firebase/social/monetization work, asset/shader experiments, renderer/worklet/ECS or broad pooling migration, graphics/audio dependencies or device-performance claims. **Stop after this implementation and wait for physical-iPhone assessment before further polish or another phase.**
