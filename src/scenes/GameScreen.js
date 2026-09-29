import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Canvas, Group } from '@shopify/react-native-skia';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { createGameSession, commandGameSession, stepGameSession, isGameplayActive, MAX_FRAME_SECONDS } from '../engine/gameSimulation';
import { getAchievementUpdates, playGameEventSounds } from '../engine/gameEventEffects';
import { getLevelTarget } from '../engine/difficulty';
import * as AudioManager from '../engine/audio';
import * as AchievementManager from '../engine/achievements';
import PauseOverlay from '../components/PauseOverlay';
import ControlHintsOverlay from '../components/ControlHintsOverlay';
import AchievementToast from '../components/AchievementToast';
import GameHUD from '../components/GameHUD';
import FireButton from '../components/FireButton';
import ScorePopup from '../components/ScorePopup';
import LevelBanner from '../components/LevelBanner';
import BonusBanner from '../components/BonusBanner';
import StageCompleteOverlay from '../components/StageCompleteOverlay';
import HitFlash from '../components/HitFlash';
import BossHealthBar from '../components/BossHealthBar';
import BossAnnouncement from '../components/BossAnnouncement';
import bossConfig from '../config/boss.json';
import { BOSS_IDENTITY, BOSS_STATE } from '../engine/bossEncounter';
import { createPresentationState, advancePresentation, getWorldOffset, getDamageFlash, getHitFlashes } from '../engine/presentation';
import { Background, StarField, PlayerShip, Enemies, BossShip, PlayerBullets, EnemyBullets, MuzzleFlashes, Explosions, Particles, Powerups } from '../components/canvas';
import GameOverOverlay from './GameOverOverlay';
import { STAGES } from '../constants/game';
import useGameSettings from '../hooks/useGameSettings';
import useStarField from '../hooks/useStarField';
import usePlayerControls from '../hooks/usePlayerControls';

const FIRST_PLAY_CUE_KEY = 'galageaux:firstPlayCueSeen';

export default function GameScreen({ onExit, showTutorial = false, showFirstPlayCue = false }) {
  const { width, height } = useWindowDimensions();
  const sessionRef = useRef(null);
  if (!sessionRef.current) sessionRef.current = createGameSession(width, height, showTutorial);
  const presentationRef = useRef(null);
  if (!presentationRef.current) presentationRef.current = createPresentationState(sessionRef.current);
  const [snapshot, setSnapshot] = useState(sessionRef.current);
  const [hudHeight, setHudHeight] = useState(58);
  const [tiltControlEnabled, setTiltControlEnabled] = useState(true);
  const [achievementToast, setAchievementToast] = useState(null);
  const [controlCueVisible, setControlCueVisible] = useState(false);
  const pendingToasts = useRef([]);
  const activeToast = useRef(null);
  const mounted = useRef(false);
  const achievementQueue = useRef(Promise.resolve());
  const exiting = useRef(false);
  const startedSession = useRef(null);
  const lastTimeRef = useRef(null);
  const fireHeldRef = useRef(false);
  const frameRef = useRef(null);
  const { stars, updateStars, resetStars } = useStarField(width, height);
  const {
    tiltSensitivity, fireButtonPosition, audioSettings, loaded,
    handleTiltSensitivityChange, handleFireButtonPositionChange, handleToggleSounds,
    handleToggleMusic, handleChangeSoundVolume, handleChangeMusicVolume
  } = useGameSettings();
  const {
    player, bullets, enemyBullets, enemies, explosions, particles, powerups, boss,
    score, scoreTexts, autoFire, playerHitFlash, hudPulse, muzzleFlashes,
    level, levelKills, levelBanner, bonusTimeLeft, currentStage, phase
  } = snapshot;
  const isPaused = phase === 'paused';
  const gameOver = phase === 'lost';
  const showGuide = phase === 'tutorial';
  const inBonusRound = bonusTimeLeft > 0;
  const stageComplete = phase === 'transition' || phase === 'won';
  const levelTarget = getLevelTarget(level);
  const controlsStopped = !isGameplayActive(snapshot);
  const showNextToast = () => {
    if (!mounted.current || activeToast.current || !pendingToasts.current.length) return;
    const next = pendingToasts.current.shift();
    activeToast.current = next;
    setAchievementToast(next);
    AudioManager.playSound('powerupCollect', 0.8);
  };
  const dismissAchievement = (toast, sessionId) => {
    if (!mounted.current || sessionRef.current.sessionId !== sessionId || activeToast.current !== toast) return;
    activeToast.current = null;
    setAchievementToast(null);
    showNextToast();
  };

  // Consume events after commit, never inside a React state updater/effect replay.
  const consumeEvents = (events, state) => {
    if (!events.length) return;
    Promise.resolve(playGameEventSounds(events)).catch(error => console.warn('Game audio event failed:', error));
    const updates = getAchievementUpdates(events, state);
    if (!Object.keys(updates).length) return;
    const sessionId = state.sessionId;
    achievementQueue.current = achievementQueue.current
      .then(() => AchievementManager.checkAchievements(updates))
      .then(unlocked => {
        if (mounted.current && sessionRef.current.sessionId === sessionId && unlocked?.length) {
          pendingToasts.current.push(...unlocked);
          showNextToast();
        }
      }).catch(error => console.warn('Achievement update failed:', error));
  };
  const commit = (result, visualDt = 0) => {
    // Authority changes immediately; passive effects never mirror gameplay state.
    sessionRef.current = result.state;
    presentationRef.current = advancePresentation(presentationRef.current, result.state, visualDt);
    setSnapshot(result.state);
    consumeEvents(result.events, result.state);
  };
  const command = action => commit(commandGameSession(sessionRef.current, action));
  const { panHandlers, updateTilt } = usePlayerControls({
    width, playerWidth: player.width, tiltEnabled: tiltControlEnabled, tiltSensitivity,
    isPaused: controlsStopped, isAlive: player.alive, gameOver, inBonusRound,
    onPositionChange: x => command({ type: 'move', x })
  });
  // Read current input/settings/geometry even before passive effects run.
  frameRef.current = elapsed => {
    const state = sessionRef.current;
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, elapsed));
    if (isGameplayActive(state)) {
      const playerX = updateTilt(dt, state.player.x);
      commit(stepGameSession({ ...state, width, height }, dt, { playerX, firePressed: fireHeldRef.current }), dt);
      updateStars(dt);
    } else if (state.phase === 'transition' || state.phase === 'bossDeath') {
      commit(stepGameSession(state, dt), dt);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (startedSession.current !== sessionRef.current.sessionId) {
      startedSession.current = sessionRef.current.sessionId;
      consumeEvents([{ type: 'gameStarted' }], sessionRef.current);
    }
    let id;
    const loop = timestamp => {
      if (!mounted.current) return;
      const now = Number.isFinite(timestamp) ? timestamp : Date.now();
      const dt = lastTimeRef.current === null ? 0 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      frameRef.current(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    const subscription = AppState.addEventListener('change', next => {
      lastTimeRef.current = null;
      // Backgrounding pauses play; resuming gameplay requires the existing Resume action.
      if (next !== 'active') { fireHeldRef.current = false; command({ type: 'pause' }); }
    });
    return () => {
      mounted.current = false;
      pendingToasts.current = [];
      activeToast.current = null;
      fireHeldRef.current = false;
      cancelAnimationFrame(id);
      subscription.remove();
      AudioManager.pauseMusic();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    AudioManager.initializeAudio().then(() => {
      if (!cancelled && mounted.current) {
        const current = sessionRef.current;
        if (current.phase === 'won' || current.phase === 'lost') return;
        return AudioManager.playMusic(current.boss?.alive ? 'boss' : 'gameplay');
      }
    }).catch(error => console.warn('Game audio initialization failed:', error));
    return () => { cancelled = true; };
  }, [loaded]);
  useEffect(() => { AudioManager.setMusicTempo(level); }, [level]);
  useEffect(() => {
    if (!showFirstPlayCue || showTutorial) return;
    let cancelled = false;
    AsyncStorage.getItem(FIRST_PLAY_CUE_KEY).then(seen => {
      if (cancelled || seen === '1' || !isGameplayActive(sessionRef.current)) return;
      setControlCueVisible(true);
      Promise.resolve(AsyncStorage.setItem(FIRST_PLAY_CUE_KEY, '1')).catch(error =>
        console.warn('Could not save first-play cue state:', error));
    }).catch(error => {
      console.warn('Could not read first-play cue state:', error);
      if (!cancelled) setControlCueVisible(true);
    });
    return () => { cancelled = true; };
  }, [showFirstPlayCue, showTutorial]);
  useEffect(() => {
    if (!controlCueVisible) return;
    const timer = setTimeout(() => setControlCueVisible(false), 3800);
    return () => clearTimeout(timer);
  }, [controlCueVisible]);
  useEffect(() => {
    if (!achievementToast) return;
    const toast = achievementToast;
    const sessionId = snapshot.sessionId;
    const timer = setTimeout(() => dismissAchievement(toast, sessionId), 4000);
    return () => clearTimeout(timer);
  }, [achievementToast, snapshot.sessionId]);

  const resetGame = () => {
    const fresh = createGameSession(width, height, false, sessionRef.current.sessionId + 1);
    exiting.current = false;
    presentationRef.current = createPresentationState(fresh);
    fireHeldRef.current = false;
    sessionRef.current = fresh; setSnapshot(fresh);
    startedSession.current = fresh.sessionId;
    pendingToasts.current = []; activeToast.current = null;
    setAchievementToast(null); setControlCueVisible(false); resetStars(); lastTimeRef.current = null;
    consumeEvents([{ type: 'gameStarted' }, { type: 'music', track: 'gameplay' }], fresh);
  };
  const handlePauseToggle = () => {
    fireHeldRef.current = false;
    lastTimeRef.current = null;
    command({ type: sessionRef.current.phase === 'paused' ? 'resume' : 'pause' });
  };
  const handleResume = () => { fireHeldRef.current = false; lastTimeRef.current = null; command({ type: 'resume' }); };
  const handleExitToMenu = async () => {
    if (exiting.current) return;
    exiting.current = true;
    const sessionId = sessionRef.current.sessionId;
    fireHeldRef.current = false;
    command({ type: 'pause' });
    // Let committed event deltas finish before a freshly opened Stats/gallery route reads them.
    try { await achievementQueue.current; }
    finally {
      if (sessionRef.current.sessionId === sessionId) onExit();
      else exiting.current = false;
    }
  };
  const handleGuideDismiss = () => { fireHeldRef.current = false; lastTimeRef.current = null; command({ type: 'start' }); };
  const handleAutoToggle = () => command({ type: 'toggleAutoFire' });
  const fireWeapon = () => command({ type: 'fire' });
  const beginFireHold = () => {
    if (!isGameplayActive(sessionRef.current)) return;
    fireHeldRef.current = true;
    fireWeapon();
  };
  const endFireHold = () => { fireHeldRef.current = false; };

  const { ox, oy } = getWorldOffset(snapshot.screenOffset);
  const presentation = presentationRef.current;
  const hitFlashes = getHitFlashes(particles);
  const damageFlash = getDamageFlash(playerHitFlash);
  const hudScale = 1 + hudPulse * 0.08;
  // Keep the touch responder active through cooldown so a held press repeats.
  const fireButtonDisabled = controlsStopped;
  const hudTop = Math.max(40, (initialWindowMetrics?.insets.top || 0) + 8);
  const bossBarWidth = Math.min(248, width - 48);
  const bossCombatY = boss?.targetY ?? Math.min(height * 0.27, 178);
  const preferredBossBarY = hudTop + hudHeight + 30;
  // If large accessibility text pushes the HUD into the boss lane, use the
  // clear space below the ship instead of covering either the HUD or hull.
  const bossBarY = preferredBossBarY <= bossCombatY - 21 ? preferredBossBarY
    : Math.min(height - 42, bossCombatY + (boss?.height || 60) + 32);
  const bossBarVisible = boss?.alive && ![BOSS_STATE.ANNOUNCING, BOSS_STATE.ENTERING].includes(boss.encounterState);
  const bossIdentity = BOSS_IDENTITY[currentStage];
  const phasePulse = boss?.encounterState === BOSS_STATE.PHASE_TRANSITION
    ? Math.sin(Math.PI * Math.min(1, boss.stateElapsed / bossIdentity.phaseChange)) : 0;
  const bossHitPulse = boss?.alive && Number.isFinite(presentation.bossHealth)
    ? Math.min(1, Math.max(0, (presentation.bossHealth - boss.hp) / 0.9)) : 0;
  const bossHitVisible = bossHitPulse > 0.15;

  return (
    <View style={styles.container} {...panHandlers}>
      <Canvas style={styles.canvas}>
        <Background width={width} height={height} stage={currentStage} time={presentation.time} />
        {/* Shake is applied once to the world, never to authoritative coordinates.
            The base background and HUD remain screen-fixed. */}
        <Group transform={[{ translateX: ox }, { translateY: oy }]}>
        <StarField stars={stars} ox={0} oy={0} time={presentation.time} />
        
        {player.alive && (
          <PlayerShip
            player={player}
            ox={0}
            oy={0}
            bank={presentation.bank}
            velocityX={presentation.velocityX}
            time={presentation.time}
            inBonusRound={inBonusRound}
            hitFlash={damageFlash}
          />
        )}

        <Enemies enemies={enemies} ox={0} oy={0} hitFlashes={hitFlashes.enemy} />
        <BossShip boss={boss} stage={currentStage} ox={0} oy={0} screenWidth={width} hitFlash={hitFlashes.boss} showHealthBar={false} />
        <Explosions explosions={explosions} ox={0} oy={0} />
        <Particles particles={particles} ox={0} oy={0} />
        <Powerups powerups={powerups} ox={0} oy={0} time={presentation.time} />
        <MuzzleFlashes flashes={muzzleFlashes} ox={0} oy={0} />
        <PlayerBullets bullets={bullets} ox={0} oy={0} rapidFire={player.rapidFire} />
        {/* Threat cores stay above transient effects so patterns remain legible. */}
        <EnemyBullets bullets={enemyBullets} ox={0} oy={0} />
        </Group>
        {bossBarVisible && <BossHealthBar health={boss.hp} maxHealth={boss.maxHp}
          trailingHealth={presentation.bossHealth} x={(width - bossBarWidth) / 2} y={bossBarY}
          width={bossBarWidth} height={11} hitPulse={bossHitPulse}
          accent={bossIdentity.phaseColors[Math.min(boss.phaseIndex || 0, bossIdentity.phaseColors.length - 1)]} phasePulse={phasePulse}
          phaseThresholds={bossConfig[currentStage].phases.map(phase => phase.hpThreshold)} />}
      </Canvas>

      <BossAnnouncement boss={boss} stage={currentStage} top={hudTop + hudHeight + 15} />
      {bossBarVisible && <View pointerEvents="none" style={[styles.bossStatus,
        { top: bossBarY - 23, left: (width - bossBarWidth) / 2, width: bossBarWidth }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
          style={[styles.bossNameText, { color: bossIdentity.color }]}>{bossIdentity.name}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
          style={[styles.bossHpText, bossHitVisible && styles.bossHpHit]}>
          {bossHitVisible ? 'HIT · ' : ''}{boss.hp}/{boss.maxHp} HP
        </Text>
      </View>}

      <HitFlash intensity={damageFlash} />
      <LevelBanner text={levelBanner} visible={!inBonusRound} />
      <BonusBanner visible={inBonusRound} timeLeft={bonusTimeLeft} />

      <GameHUD
        score={score}
        currentStage={currentStage}
        level={level}
        levelKills={levelKills}
        levelTarget={levelTarget}
        lives={player.lives}
        hasShield={player.shield}
        isPaused={isPaused}
        isBossEncounter={phase === 'boss' || phase === 'bossDeath'}
        bossDefeated={phase === 'bossDeath'}
        hudScale={hudScale}
        top={hudTop}
        onLayout={event => {
          const measured = event.nativeEvent?.layout?.height;
          if (Number.isFinite(measured) && measured > 0) {
            setHudHeight(previous => Math.abs(previous - measured) > 0.5 ? measured : previous);
          }
        }}
        onPauseToggle={handlePauseToggle}
      />

      {controlCueVisible && isGameplayActive(snapshot) && <View pointerEvents="none"
        style={[styles.controlCue, { top: hudTop + hudHeight + 10, maxWidth: width - 24 }]}>
        <Text style={styles.controlCuePrimary}>TILT TO MOVE · HOLD FIRE TO SHOOT</Text>
        <Text style={styles.controlCueSecondary}>For touch: PAUSE → Tilt Control Off</Text>
      </View>}

      <FireButton
        position={fireButtonPosition}
        disabled={fireButtonDisabled}
        autoFire={autoFire}
        onFire={fireWeapon}
        onPressIn={beginFireHold}
        onPressOut={endFireHold}
        visible={player.alive && !gameOver && phase !== 'won' && phase !== 'bossDeath'}
      />

      <ScorePopup items={scoreTexts} offsetX={ox} offsetY={oy} />

      <PauseOverlay
        visible={isPaused && !gameOver && !showGuide}
        onResume={handleResume}
        onExit={handleExitToMenu}
        autoFire={autoFire}
        onToggleAutoFire={handleAutoToggle}
        tiltControl={tiltControlEnabled}
        onToggleTiltControl={() => setTiltControlEnabled(prev => !prev)}
        tiltSensitivity={tiltSensitivity}
        onChangeTiltSensitivity={handleTiltSensitivityChange}
        fireButtonPosition={fireButtonPosition}
        onToggleFireButtonPosition={() => handleFireButtonPositionChange(fireButtonPosition === 'left' ? 'right' : 'left')}
        soundsEnabled={audioSettings.soundsEnabled}
        musicEnabled={audioSettings.musicEnabled}
        soundVolume={audioSettings.soundVolume}
        musicVolume={audioSettings.musicVolume}
        onToggleSounds={handleToggleSounds}
        onToggleMusic={handleToggleMusic}
        onChangeSoundVolume={handleChangeSoundVolume}
        onChangeMusicVolume={handleChangeMusicVolume}
      />

      <ControlHintsOverlay 
        visible={showGuide && !gameOver} 
        onDismiss={handleGuideDismiss}
        onBack={showTutorial ? handleExitToMenu : null}
      />

      <StageCompleteOverlay 
        visible={stageComplete && !gameOver} 
        currentStage={currentStage} 
        allStages={STAGES}
        score={score}
        onRetry={resetGame}
        onExit={handleExitToMenu}
      />

      {gameOver && (
        <GameOverOverlay score={score} onRetry={resetGame} onExit={handleExitToMenu} />
      )}
      
      {achievementToast && (
        <AchievementToast achievement={achievementToast} visible={true}
          onDismiss={() => dismissAchievement(achievementToast, snapshot.sessionId)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { flex: 1 },
  controlCue: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(88,202,250,0.55)',
    backgroundColor: 'rgba(2,8,23,0.82)', alignItems: 'center' },
  controlCuePrimary: { color: '#e8f4ff', fontSize: 11, fontWeight: '900', letterSpacing: 0.3,
    textAlign: 'center' },
  controlCueSecondary: { color: '#79d7ff', fontSize: 10, fontWeight: '700', marginTop: 3,
    textAlign: 'center' },
  bossStatus: { position: 'absolute', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 6, minHeight: 18, paddingHorizontal: 3,
    backgroundColor: 'rgba(2, 6, 23, 0.75)' },
  bossNameText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
  bossHpText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  bossHpHit: { color: '#ffffff' },
});
