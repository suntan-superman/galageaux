/**
 * Stats Screen for Galageaux
 * 
 * Displays player lifetime statistics including:
 * - Total games played
 * - High score
 * - Enemies destroyed
 * - Play time
 * - Achievement progress
 * 
 * @module scenes/StatsScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Canvas, Rect, Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { CloudSaveService } from '../../services/firebase';
import * as AudioManager from '../engine/audio';
import { formatScore, formatDuration } from '../i18n';

// Storage keys for local stats
const LOCAL_STATS_KEY = '@galageaux/player_stats';

/**
 * Default stats structure
 */
const DEFAULT_STATS = {
  highScore: 0,
  highestStage: 1,
  highestWave: 1,
  totalGamesPlayed: 0,
  totalEnemiesDestroyed: 0,
  totalBossesDefeated: 0,
  totalPowerupsCollected: 0,
  totalPlayTime: 0, // in seconds
  longestCombo: 0,
  perfectStages: 0,
  totalDeaths: 0,
  totalBulletsFired: 0,
  firstPlayDate: null,
  lastPlayDate: null,
};

/**
 * StatsScreen Component
 */
export default function StatsScreen({ onBack }) {
  const { width, height } = useWindowDimensions();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [isAuthenticated]);

  /**
   * Load stats from local storage and optionally from cloud
   */
  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load local stats first
      const localStatsStr = await AsyncStorage.getItem(LOCAL_STATS_KEY);
      let localStats = localStatsStr ? JSON.parse(localStatsStr) : DEFAULT_STATS;

      // If authenticated, try to load from cloud and merge
      if (isAuthenticated && user?.id) {
        const cloudResult = await CloudSaveService.loadProgress(user.id);
        
        if (cloudResult.success && cloudResult.data?.stats) {
          const cloudStats = cloudResult.data.stats;
          
          // Merge stats (keep highest values)
          localStats = {
            highScore: Math.max(localStats.highScore || 0, cloudResult.data.highScore || 0),
            highestStage: Math.max(localStats.highestStage || 1, cloudResult.data.highestStage || 1),
            highestWave: Math.max(localStats.highestWave || 1, cloudResult.data.highestWave || 1),
            totalGamesPlayed: Math.max(localStats.totalGamesPlayed || 0, cloudStats.totalGamesPlayed || 0),
            totalEnemiesDestroyed: Math.max(localStats.totalEnemiesDestroyed || 0, cloudStats.totalEnemiesDestroyed || 0),
            totalBossesDefeated: Math.max(localStats.totalBossesDefeated || 0, cloudStats.totalBossesDefeated || 0),
            totalPowerupsCollected: Math.max(localStats.totalPowerupsCollected || 0, cloudStats.totalPowerupsCollected || 0),
            totalPlayTime: Math.max(localStats.totalPlayTime || 0, cloudStats.totalPlayTime || 0),
            longestCombo: Math.max(localStats.longestCombo || 0, cloudStats.longestCombo || 0),
            perfectStages: Math.max(localStats.perfectStages || 0, cloudStats.perfectStages || 0),
            totalDeaths: Math.max(localStats.totalDeaths || 0, cloudStats.totalDeaths || 0),
            totalBulletsFired: localStats.totalBulletsFired || 0,
            firstPlayDate: localStats.firstPlayDate || null,
            lastPlayDate: localStats.lastPlayDate || null,
          };
          
          setCloudSynced(true);
        }
      }

      setStats(localStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(DEFAULT_STATS);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle back button press
   */
  const handleBack = () => {
    AudioManager.playSound('uiClick', 0.6);
    onBack();
  };

  /**
   * Calculate derived statistics
   */
  const getDerivedStats = () => {
    const accuracy = stats.totalBulletsFired > 0
      ? ((stats.totalEnemiesDestroyed / stats.totalBulletsFired) * 100).toFixed(1)
      : '0.0';

    const avgScorePerGame = stats.totalGamesPlayed > 0
      ? Math.round(stats.highScore / stats.totalGamesPlayed)
      : 0;

    const avgEnemiesPerGame = stats.totalGamesPlayed > 0
      ? Math.round(stats.totalEnemiesDestroyed / stats.totalGamesPlayed)
      : 0;

    const avgPlayTimePerGame = stats.totalGamesPlayed > 0
      ? Math.round(stats.totalPlayTime / stats.totalGamesPlayed)
      : 0;

    return { accuracy, avgScorePerGame, avgEnemiesPerGame, avgPlayTimePerGame };
  };

  const derived = getDerivedStats();

  /**
   * Render a stat row
   */
  const StatRow = ({ label, value, highlight = false }) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );

  /**
   * Render a stat card section
   */
  const StatCard = ({ title, children }) => (
    <View style={styles.statCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background */}
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

      {/* Content */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 STATISTICS</Text>
          {cloudSynced && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncText}>☁️ Synced</Text>
            </View>
          )}
        </View>

        {isLoading ? (
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
            {/* High Scores */}
            <StatCard title="🏆 High Scores">
              <StatRow label="Best Score" value={formatScore(stats.highScore)} highlight />
              <StatRow label="Highest Stage" value={`Stage ${stats.highestStage}`} />
              <StatRow label="Highest Wave" value={`Wave ${stats.highestWave}`} />
              <StatRow label="Longest Combo" value={`${stats.longestCombo}x`} highlight />
            </StatCard>

            {/* Combat Stats */}
            <StatCard title="💥 Combat">
              <StatRow label="Enemies Destroyed" value={formatScore(stats.totalEnemiesDestroyed)} />
              <StatRow label="Bosses Defeated" value={stats.totalBossesDefeated} />
              <StatRow label="Deaths" value={stats.totalDeaths} />
              <StatRow label="Perfect Stages" value={stats.perfectStages} />
            </StatCard>

            {/* Items & Powerups */}
            <StatCard title="⚡ Powerups">
              <StatRow label="Powerups Collected" value={formatScore(stats.totalPowerupsCollected)} />
              <StatRow label="Avg per Game" value={
                stats.totalGamesPlayed > 0 
                  ? (stats.totalPowerupsCollected / stats.totalGamesPlayed).toFixed(1)
                  : '0'
              } />
            </StatCard>

            {/* Play Time */}
            <StatCard title="⏱️ Time Played">
              <StatRow label="Total Play Time" value={formatDuration(stats.totalPlayTime)} highlight />
              <StatRow label="Games Played" value={stats.totalGamesPlayed} />
              <StatRow label="Avg Game Length" value={formatDuration(derived.avgPlayTimePerGame)} />
            </StatCard>

            {/* Averages */}
            <StatCard title="📈 Averages">
              <StatRow label="Enemies per Game" value={derived.avgEnemiesPerGame} />
              {stats.totalBulletsFired > 0 && (
                <StatRow label="Accuracy" value={`${derived.accuracy}%`} />
              )}
            </StatCard>

            {/* Account info if authenticated */}
            {isAuthenticated && (
              <StatCard title="👤 Account">
                <StatRow label="Signed in as" value={user?.displayName || user?.email || 'Player'} />
                <StatRow label="Cloud Sync" value={cloudSynced ? 'Active' : 'Not synced'} />
              </StatCard>
            )}

            {/* First/Last play dates */}
            {stats.firstPlayDate && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  First played: {new Date(stats.firstPlayDate).toLocaleDateString()}
                </Text>
                {stats.lastPlayDate && (
                  <Text style={styles.footerText}>
                    Last played: {new Date(stats.lastPlayDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            {/* Sign in prompt if not authenticated */}
            {!isAuthenticated && (
              <View style={styles.signInPrompt}>
                <Text style={styles.promptText}>
                  Sign in to sync your stats across devices!
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginRight: 50, // Balance the back button
  },
  syncBadge: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  syncText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.5)',
    paddingBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 15,
  },
  statValue: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
  statValueHighlight: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 4,
  },
  signInPrompt: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
  },
  promptText: {
    color: '#60a5fa',
    fontSize: 14,
    textAlign: 'center',
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Save stats to local storage
 * @param {Object} newStats - Stats to save
 */
export async function saveLocalStats(newStats) {
  try {
    const existingStr = await AsyncStorage.getItem(LOCAL_STATS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : DEFAULT_STATS;
    
    // Merge with existing (keep highest values)
    const merged = {
      highScore: Math.max(existing.highScore || 0, newStats.highScore || 0),
      highestStage: Math.max(existing.highestStage || 1, newStats.highestStage || 1),
      highestWave: Math.max(existing.highestWave || 1, newStats.highestWave || 1),
      totalGamesPlayed: (existing.totalGamesPlayed || 0) + (newStats.gamesPlayed || 1),
      totalEnemiesDestroyed: (existing.totalEnemiesDestroyed || 0) + (newStats.enemiesDestroyed || 0),
      totalBossesDefeated: (existing.totalBossesDefeated || 0) + (newStats.bossesDefeated || 0),
      totalPowerupsCollected: (existing.totalPowerupsCollected || 0) + (newStats.powerupsCollected || 0),
      totalPlayTime: (existing.totalPlayTime || 0) + (newStats.playTime || 0),
      longestCombo: Math.max(existing.longestCombo || 0, newStats.maxCombo || 0),
      perfectStages: (existing.perfectStages || 0) + (newStats.perfectStages || 0),
      totalDeaths: (existing.totalDeaths || 0) + (newStats.deaths || 0),
      totalBulletsFired: (existing.totalBulletsFired || 0) + (newStats.bulletsFired || 0),
      firstPlayDate: existing.firstPlayDate || new Date().toISOString(),
      lastPlayDate: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error('Failed to save stats:', error);
    return null;
  }
}

/**
 * Get current stats from local storage
 * @returns {Object} Current stats
 */
export async function getLocalStats() {
  try {
    const statsStr = await AsyncStorage.getItem(LOCAL_STATS_KEY);
    return statsStr ? JSON.parse(statsStr) : DEFAULT_STATS;
  } catch (error) {
    console.error('Failed to get stats:', error);
    return DEFAULT_STATS;
  }
}
