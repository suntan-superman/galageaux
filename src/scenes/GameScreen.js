import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
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

export default function GameScreen({ onExit, showTutorial = false }) {
  const { width, height } = useWindowDimensions();
  const sessionRef = useRef(null);
  if (!sessionRef.current) sessionRef.current = createGameSession(width, height, showTutorial);
  const presentationRef = useRef(null);
  if (!presentationRef.current) presentationRef.current = createPresentationState(sessionRef.current);
  const [snapshot, setSnapshot] = useState(sessionRef.current);
  const [tiltControlEnabled, setTiltControlEnabled] = useState(true);
  const [achievementToast, setAchievementToast] = useState(null);
  const mounted = useRef(false);
  const achievementQueue = useRef(Promise.resolve());
  const startedSession = useRef(null);
  const lastTimeRef = useRef(null);
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
  const canFire = snapshot.fireCooldown <= 0;
  const levelTarget = getLevelTarget(level);
  const controlsStopped = !isGameplayActive(snapshot);
  const dismissAchievement = () => {
    if (mounted.current && sessionRef.current.sessionId === snapshot.sessionId) {
      setAchievementToast(current => current === achievementToast ? null : current);
    }
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
          setAchievementToast(unlocked[0]);
          AudioManager.playSound('powerupCollect', 0.8);
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
      commit(stepGameSession({ ...state, width, height }, dt, { playerX }), dt);
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
      if (next !== 'active') command({ type: 'pause' });
    });
    return () => {
      mounted.current = false;
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
    if (!achievementToast) return;
    const timer = setTimeout(dismissAchievement, 4000);
    return () => clearTimeout(timer);
  }, [achievementToast, snapshot.sessionId]);

  const resetGame = () => {
    const fresh = createGameSession(width, height, false, sessionRef.current.sessionId + 1);
    presentationRef.current = createPresentationState(fresh);
    sessionRef.current = fresh; setSnapshot(fresh);
    startedSession.current = fresh.sessionId;
    setAchievementToast(null); resetStars(); lastTimeRef.current = null;
    consumeEvents([{ type: 'gameStarted' }, { type: 'music', track: 'gameplay' }], fresh);
  };
  const handlePauseToggle = () => {
    lastTimeRef.current = null;
    command({ type: sessionRef.current.phase === 'paused' ? 'resume' : 'pause' });
  };
  const handleResume = () => { lastTimeRef.current = null; command({ type: 'resume' }); };
  const handleExitToMenu = () => { command({ type: 'pause' }); onExit(); };
  const handleGuideDismiss = () => { lastTimeRef.current = null; command({ type: 'start' }); };
  const handleAutoToggle = () => command({ type: 'toggleAutoFire' });
  const fireWeapon = () => command({ type: 'fire' });

  const { ox, oy } = getWorldOffset(snapshot.screenOffset);
  const presentation = presentationRef.current;
  const hitFlashes = getHitFlashes(particles);
  const damageFlash = getDamageFlash(playerHitFlash);
  const hudScale = 1 + hudPulse * 0.08;
  const fireButtonDisabled = !canFire || controlsStopped;
  const bossBarY = Math.max(130, (initialWindowMetrics?.insets.top || 0) + 88);
  const bossBarVisible = boss?.alive && ![BOSS_STATE.ANNOUNCING, BOSS_STATE.ENTERING].includes(boss.encounterState);
  const bossIdentity = BOSS_IDENTITY[currentStage];
  const phasePulse = boss?.encounterState === BOSS_STATE.PHASE_TRANSITION
    ? Math.sin(Math.PI * Math.min(1, boss.stateElapsed / bossIdentity.phaseChange)) : 0;

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
          trailingHealth={presentation.bossHealth} x={width / 2 - 100} y={bossBarY} width={200} height={10}
          accent={bossIdentity.phaseColors[Math.min(boss.phaseIndex || 0, bossIdentity.phaseColors.length - 1)]} phasePulse={phasePulse}
          phaseThresholds={bossConfig[currentStage].phases.map(phase => phase.hpThreshold)} />}
      </Canvas>

      <BossAnnouncement boss={boss} stage={currentStage} top={bossBarY + 15} />
      {bossBarVisible && <View pointerEvents="none" style={[styles.bossName, { top: bossBarY - 19 }]}>
        <Text style={[styles.bossNameText, { color: bossIdentity.color }]}>{bossIdentity.name}</Text>
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
        hudScale={hudScale}
        onPauseToggle={handlePauseToggle}
        onExit={handleExitToMenu}
      />

      <FireButton
        position={fireButtonPosition}
        disabled={fireButtonDisabled}
        autoFire={autoFire}
        onFire={fireWeapon}
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
        onBack={showTutorial ? onExit : null}
      />

      <StageCompleteOverlay 
        visible={stageComplete && !gameOver} 
        currentStage={currentStage} 
        allStages={STAGES}
        onRetry={resetGame}
        onExit={handleExitToMenu}
      />

      {gameOver && (
        <GameOverOverlay score={score} onRetry={resetGame} onExit={onExit} />
      )}
      
      {achievementToast && (
        <AchievementToast achievement={achievementToast} visible={true} onDismiss={dismissAchievement} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { flex: 1 },
  bossName: { position: 'absolute', left: 90, right: 90, alignItems: 'center' },
  bossNameText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
});
