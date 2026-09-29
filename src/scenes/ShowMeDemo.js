import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { Background, StarField, PlayerShip, Enemies, BossShip, PlayerBullets, EnemyBullets, Powerups } from '../components/canvas';
import BossHealthBar from '../components/BossHealthBar';
import { BOSS_IDENTITY } from '../engine/bossEncounter';
import { DEMO_DURATION, DEMO_STEPS, getDemoFrame } from './showMeDemoTimeline';

/** Scripted practice replay: no session, saved score, achievement, or random drop. */
export default function ShowMeDemo({ onBack, onPlay }) {
  const { width, height } = useWindowDimensions();
  const safeTop = initialWindowMetrics?.insets?.top || 0;
  const safeBottom = initialWindowMetrics?.insets?.bottom || 0;
  const topPadding = Math.max(safeTop, 40);
  const fieldWidth = Math.max(240, Math.min(440, width - 24));
  const fieldHeight = Math.max(250, Math.min(500, height - topPadding - safeBottom - 275));
  const [seconds, setSeconds] = useState(0);
  const lastTick = useRef(Date.now());
  const active = useRef(true);
  const stars = useMemo(() => Array.from({ length: 28 }, (_, index) => ({
    id: `demo-star-${index}`,
    x: ((index * 73 + 17) % 397) / 397 * fieldWidth,
    y: ((index * 113 + 31) % 503) / 503 * fieldHeight,
    size: 0.8 + index % 3 * 0.55,
    color: index % 4 === 0 ? '171,198,222' : '130,182,207',
    layer: index % 3 === 0 ? 'near' : 'far',
    twinkleOffset: index * 0.7, twinkleSpeed: 0.8 + index % 4 * 0.13,
  })), [fieldWidth, fieldHeight]);

  useEffect(() => {
    const subscription = AppState.addEventListener?.('change', state => {
      active.current = state === 'active';
      lastTick.current = Date.now();
    });
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, Math.min(0.1, (now - lastTick.current) / 1000));
      lastTick.current = now;
      if (active.current) setSeconds(previous => previous >= DEMO_DURATION ? previous : Math.min(DEMO_DURATION, previous + dt));
    }, 33);
    return () => { clearInterval(timer); subscription?.remove?.(); };
  }, []);

  const replay = () => { lastTick.current = Date.now(); setSeconds(0); };
  const frame = getDemoFrame(seconds, fieldWidth, fieldHeight);
  const step = DEMO_STEPS[frame.stepIndex];
  const bossLabel = frame.boss?.alive ? `AEGIS SENTINEL · ${frame.boss.hp}/100 HP` : null;
  const fireActive = (seconds >= 3.2 && seconds < 8.5) || (seconds >= 16 && seconds < 23.5);

  return <View style={[styles.screen, { paddingTop: topPadding, paddingBottom: Math.max(safeBottom, 10) }]}>
    <View style={styles.header}>
      <TouchableOpacity testID="demo-back" onPress={onBack} style={styles.backButton}
        accessibilityRole="button" accessibilityLabel="Back to menu">
        <Text style={styles.backText}>‹ BACK</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>SHOW ME HOW</Text>
        <Text style={styles.headerSubtitle}>PRACTICE REPLAY · NO SCORE SAVED</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>

    <View style={[styles.field, { width: fieldWidth, height: fieldHeight }]}>
      <Canvas style={{ width: fieldWidth, height: fieldHeight }}>
        <Background width={fieldWidth} height={fieldHeight} stage="stage1" time={seconds} />
        <StarField stars={stars} time={seconds} />
        <Enemies enemies={frame.enemies} />
        <Powerups powerups={frame.powerups} time={seconds} />
        {frame.boss && <BossShip boss={frame.boss} stage="stage1" screenWidth={fieldWidth} showHealthBar={false} />}
        {frame.boss?.alive && <BossHealthBar health={frame.boss.hp} maxHealth={100}
          x={fieldWidth / 2 - Math.min(130, fieldWidth * 0.37)} y={87}
          width={Math.min(260, fieldWidth * 0.74)} height={10}
          accent={BOSS_IDENTITY.stage1.color} phaseThresholds={[70, 40]} />}
        <PlayerBullets bullets={frame.bullets} />
        <EnemyBullets bullets={frame.enemyBullets} />
        <PlayerShip player={frame.player} time={seconds}
          velocityX={seconds < 5.1 || seconds >= 19.4 && seconds < 21.2 ? 140 : 0} />
        {seconds >= 15.1 && seconds < 15.5 && <Circle
          cx={frame.player.x + 20} cy={frame.player.y + 11} r={34 + (seconds - 15.1) * 34}
          color="#22c55e" style="stroke" strokeWidth={2} opacity={1 - (seconds - 15.1) / 0.4} />}
        {seconds >= 23.5 && seconds < 24.5 && <Circle cx={fieldWidth / 2} cy={Math.max(108, fieldHeight * 0.28) + 28}
          r={16 + (seconds - 23.5) * 43} color="#58cafa" style="stroke" strokeWidth={2}
          opacity={1 - (seconds - 23.5)} />}
      </Canvas>

      <View pointerEvents="none" style={styles.gameHud}>
        <View style={styles.hudRow}>
          <Text style={styles.hudValue}>SCORE  {frame.score.toLocaleString('en-US')}</Text>
          <Text style={styles.hudValue}>ENEMIES  {frame.kills}/8</Text>
        </View>
        <View style={styles.hudRow}>
          <Text style={styles.hudMinor}>LIVES  ♥ ♥ ♥ ♥ ♥</Text>
          <Text style={[styles.hudMinor, frame.shield && styles.shieldOnline]}>
            SHIELD  {frame.shield ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        {bossLabel && <Text style={styles.bossLabel}>{bossLabel}</Text>}
      </View>
      {!!frame.popup && <View pointerEvents="none" style={styles.popupWrap}>
        <Text style={[styles.popup, frame.popup === 'BLOCKED!' && styles.blocked]}>{frame.popup}</Text>
      </View>}
      <View pointerEvents="none" style={[styles.firePrompt, fireActive && styles.firePromptActive]}>
        <Text style={[styles.firePromptText, fireActive && styles.firePromptTextActive]}>FIRE</Text>
      </View>
    </View>

    <View style={styles.lesson}>
      <Text style={styles.stepCount}>STEP {frame.stepIndex + 1} OF {DEMO_STEPS.length}</Text>
      <Text style={styles.lessonTitle}>{step.title}</Text>
      <Text style={styles.lessonText}>{step.text}</Text>
      <View style={styles.progressRow} accessibilityRole="progressbar"
        accessibilityLabel={`Practice step ${frame.stepIndex + 1} of ${DEMO_STEPS.length}`}>
        {DEMO_STEPS.map((item, index) => <View key={item.start}
          style={[styles.progressSegment, index <= frame.stepIndex && styles.progressActive]} />)}
      </View>
    </View>

    <View style={styles.actions}>
      <TouchableOpacity testID="demo-replay" onPress={replay} style={styles.secondaryButton}
        accessibilityRole="button" accessibilityLabel="Replay demonstration">
        <Text style={styles.secondaryText}>REPLAY</Text>
      </TouchableOpacity>
      {!frame.done && <TouchableOpacity testID="demo-skip" onPress={() => setSeconds(DEMO_DURATION)}
        style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Skip demonstration to the end">
        <Text style={styles.secondaryText}>SKIP</Text>
      </TouchableOpacity>}
      <TouchableOpacity testID="demo-play" onPress={onPlay} style={styles.playButton}
        accessibilityRole="button" accessibilityLabel="Play game now">
        <Text style={styles.playText}>PLAY NOW</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#020817' },
  header: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 7 },
  backButton: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  backText: { color: '#79d7ff', fontSize: 15, fontWeight: '800' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#e8f4ff', fontSize: 18, fontWeight: '900', letterSpacing: 1.4 },
  headerSubtitle: { color: '#7e9eb0', fontSize: 9, fontWeight: '700', letterSpacing: 0.7, marginTop: 3 },
  headerSpacer: { width: 72 },
  field: { borderColor: '#28455a', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  gameHud: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 9, paddingTop: 7 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  hudValue: { color: '#e4f3ff', fontWeight: '900', fontSize: 12, letterSpacing: 0.3 },
  hudMinor: { color: '#94a8bc', fontWeight: '700', fontSize: 10 },
  shieldOnline: { color: '#5dea97' },
  bossLabel: { color: '#73d9ff', fontSize: 10, textAlign: 'center', fontWeight: '800',
    letterSpacing: 0.8, marginTop: 7 },
  popupWrap: { position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center' },
  popup: { color: '#ffd477', fontWeight: '900', fontSize: 20, textShadowColor: '#071625',
    textShadowRadius: 8 },
  blocked: { color: '#5dea97' },
  firePrompt: { position: 'absolute', bottom: 8, right: 8, width: 47, height: 47,
    borderRadius: 24, borderWidth: 1.5, borderColor: '#3c5365', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#102536a8' },
  firePromptActive: { borderColor: '#58cafa', backgroundColor: '#1a5275bc' },
  firePromptText: { color: '#7e9eb0', fontWeight: '900', fontSize: 11 },
  firePromptTextActive: { color: '#ddf6ff' },
  lesson: { width: '100%', maxWidth: 460, paddingHorizontal: 18, paddingTop: 11, minHeight: 113 },
  stepCount: { color: '#86a2b9', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  lessonTitle: { color: '#64d0ff', fontSize: 17, fontWeight: '900', marginTop: 3 },
  lessonText: { color: '#e3edf6', fontSize: 13, lineHeight: 17, marginTop: 4 },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#203446' },
  progressActive: { backgroundColor: '#55cafa' },
  actions: { width: '100%', maxWidth: 460, flexDirection: 'row', gap: 7,
    paddingHorizontal: 14, paddingTop: 6, alignItems: 'center' },
  secondaryButton: { minHeight: 44, minWidth: 70, borderRadius: 9, borderWidth: 1,
    borderColor: '#536d81', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  secondaryText: { color: '#cae3f4', fontWeight: '800', fontSize: 12 },
  playButton: { flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: '#4adb88',
    alignItems: 'center', justifyContent: 'center' },
  playText: { color: '#06271c', fontWeight: '900', fontSize: 14, letterSpacing: 0.6 },
});
