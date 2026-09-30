/**
 * Local lifetime statistics written by the active achievement manager.
 * An abandoned run counts as started and may contribute kills/high score;
 * only won/lost runs contribute to totalScore.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Canvas, Rect, Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import * as AchievementManager from '../engine/achievements';
import * as AudioManager from '../engine/audio';
import { formatScore } from '../i18n';
import { isCaptureStudioEnabled } from '../dev/captureGate';

const EMPTY_STATS = {
  totalKills: 0,
  totalPowerups: 0,
  totalBosses: 0,
  maxCombo: 0,
  highScore: 0,
  maxLevel: 0,
  stagesCompleted: [],
  gamesPlayed: 0,
  totalScore: 0,
};

export default function StatsScreen({ onBack, captureFixture }) {
  const { width, height } = useWindowDimensions();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const useFixture = isCaptureStudioEnabled() && captureFixture != null;
  const visibleStats = useFixture ? captureFixture : stats;

  useEffect(() => {
    // Capture fixture data is display-only: do not read or mutate local lifetime stats.
    if (useFixture) return undefined;
    let active = true;
    // This manager owns galageaux:stats and shares the first storage read with gameplay.
    AchievementManager.loadAchievements()
      .then(() => {
        if (active) setStats(AchievementManager.getStats());
      })
      .catch(error => console.error('Failed to load local stats:', error))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [useFixture]);

  const handleBack = () => {
    AudioManager.playSound('uiClick', 0.6);
    onBack();
  };

  const StatRow = ({ label, value, highlight = false }) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );

  const StatCard = ({ title, children }) => (
    <View style={styles.statCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  const stagesCompleted = Array.isArray(visibleStats.stagesCompleted)
    ? visibleStats.stagesCompleted.filter(stage => Number.isInteger(stage) && stage > 0)
    : [];
  const stagesLabel = stagesCompleted.length
    ? stagesCompleted.sort((a, b) => a - b).map(stage => `Stage ${stage}`).join(', ')
    : 'None yet';

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#0f172a', '#020617', '#0f172a']}
          />
        </Rect>
        {Array.from({ length: 40 }).map((_, i) => (
          <Circle
            key={i}
            cx={(i * 47) % width}
            cy={(i * 67) % height}
            r={Math.random() * 1.5 + 0.5}
            color="rgba(148,163,184,0.5)"
          />
        ))}
      </Canvas>

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 STATISTICS</Text>
        </View>

        {isLoading && !useFixture ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {visibleStats.gamesPlayed === 0 && (
              <Text style={styles.emptyNote}>No runs yet. Play a game to build your stats.</Text>
            )}

            <StatCard title="🏆 Scores">
              <StatRow label="Best Score Reached" value={formatScore(visibleStats.highScore)} highlight />
              <StatRow label="Total Finalized Score" value={formatScore(visibleStats.totalScore)} />
            </StatCard>

            <StatCard title="🚀 Campaign">
              <StatRow label="Runs Started" value={formatScore(visibleStats.gamesPlayed)} />
              <StatRow label="Highest Level Reached" value={visibleStats.maxLevel || '—'} />
              <StatRow label="Stages Cleared" value={stagesLabel} />
            </StatCard>

            <StatCard title="💥 Combat">
              <StatRow label="Enemies Destroyed" value={formatScore(visibleStats.totalKills)} />
              <StatRow label="Bosses Defeated" value={formatScore(visibleStats.totalBosses)} />
              <StatRow label="Best Combo" value={`${visibleStats.maxCombo}x`} highlight />
            </StatCard>

            <StatCard title="⚡ Powerups">
              <StatRow label="Powerups Collected" value={formatScore(visibleStats.totalPowerups)} />
            </StatCard>

            <Text style={styles.footerText}>
              Stats are saved on this device. Total Finalized Score includes won and lost runs only.
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  canvas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backButton: { padding: 10 },
  backButtonText: { color: '#60a5fa', fontSize: 16, fontWeight: '600' },
  title: {
    flex: 1, fontSize: 24, fontWeight: 'bold', color: '#f8fafc',
    textAlign: 'center', marginRight: 50,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyNote: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(71, 85, 105, 0.5)',
  },
  cardTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(71, 85, 105, 0.5)', paddingBottom: 8,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  statLabel: { color: '#94a3b8', fontSize: 15, flexShrink: 1 },
  statValue: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  statValueHighlight: { color: '#fbbf24', fontSize: 18, fontWeight: 'bold' },
  footerText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
});
