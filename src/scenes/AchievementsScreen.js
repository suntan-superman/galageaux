/**
 * AchievementsScreen - Display achievement gallery
 * Shows all achievements with lock/unlock state and progress
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACHIEVEMENTS, loadAchievements, getUnlockedAchievements, getStats } from '../engine/achievements';
import LiquidGlassCard from '../components/LiquidGlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Achievement category groupings
const CATEGORIES = {
  combat: {
    label: 'Combat',
    icon: '⚔️',
    achievements: ['firstBlood', 'sharpshooter', 'exterminator']
  },
  bosses: {
    label: 'Boss Battles',
    icon: '👾',
    achievements: ['bossSlayer', 'bossHunter']
  },
  powerups: {
    label: 'Power-Ups',
    icon: '⚡',
    achievements: ['powerCollector', 'powerAddict']
  },
  combos: {
    label: 'Combos',
    icon: '🔥',
    achievements: ['comboMaster', 'comboGod']
  },
  stages: {
    label: 'Stages',
    icon: '🎯',
    achievements: ['stageClear', 'veteranPilot', 'acePilot']
  },
  mastery: {
    label: 'Mastery',
    icon: '👑',
    achievements: ['untouchable', 'scoreChaser', 'scoreKing', 'survivor', 'legend']
  }
};

function AchievementCard({ achievement, isUnlocked, progress, isNew }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();

    if (isUnlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [isUnlocked]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6]
  });

  return (
    <Animated.View style={[
      styles.achievementCard,
      { transform: [{ scale: scaleAnim }] },
      isUnlocked && styles.achievementCardUnlocked
    ]}>
      {isUnlocked && (
        <Animated.View style={[styles.glowOverlay, { opacity: glowOpacity }]} />
      )}
      
      <View style={styles.achievementIconContainer}>
        <Text style={[
          styles.achievementIcon,
          !isUnlocked && styles.achievementIconLocked
        ]}>
          {isUnlocked ? achievement.icon : '🔒'}
        </Text>
      </View>
      
      <View style={styles.achievementInfo}>
        <View style={styles.achievementHeader}>
          <Text style={[
            styles.achievementTitle,
            !isUnlocked && styles.textLocked
          ]}>
            {achievement.title}
          </Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW!</Text>
            </View>
          )}
        </View>
        
        <Text style={[
          styles.achievementDescription,
          !isUnlocked && styles.textLocked
        ]}>
          {achievement.description}
        </Text>
        
        {!isUnlocked && progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.floor(progress)}%</Text>
          </View>
        )}
      </View>
      
      {isUnlocked && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </Animated.View>
  );
}

function CategorySection({ category, categoryKey, unlockedSet, stats, newAchievements }) {
  const achievements = category.achievements.map(id => ACHIEVEMENTS[id]).filter(Boolean);
  
  const unlockedCount = achievements.filter(a => unlockedSet.has(a.id)).length;
  const totalCount = achievements.length;

  const getProgress = (achievement) => {
    if (!achievement.requirement) return 0;
    
    const { type, value } = achievement.requirement;
    let current = 0;
    
    switch (type) {
      case 'kills':
        current = stats.totalKills || 0;
        break;
      case 'powerups':
        current = stats.totalPowerups || 0;
        break;
      case 'bosses':
        current = stats.totalBosses || 0;
        break;
      case 'combo':
        current = stats.maxCombo || 0;
        break;
      case 'score':
        current = stats.highScore || 0;
        break;
      case 'level':
        current = stats.maxLevel || 0;
        break;
      case 'stageComplete':
        current = (stats.stagesCompleted || []).length;
        break;
      default:
        current = 0;
    }
    
    return Math.min((current / value) * 100, 100);
  };

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryLabel}>{category.label}</Text>
        <View style={styles.categoryProgress}>
          <Text style={styles.categoryProgressText}>
            {unlockedCount}/{totalCount}
          </Text>
        </View>
      </View>
      
      <View style={styles.achievementsList}>
        {achievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isUnlocked={unlockedSet.has(achievement.id)}
            progress={getProgress(achievement)}
            isNew={newAchievements.has(achievement.id)}
          />
        ))}
      </View>
    </View>
  );
}

export default function AchievementsScreen({ onBack }) {
  const [unlocked, setUnlocked] = useState(new Set());
  const [stats, setStats] = useState({});
  const [newAchievements] = useState(new Set()); // Could track recently unlocked
  const [loading, setLoading] = useState(true);

  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = unlocked.size;
  const completionPercent = Math.round((unlockedCount / totalAchievements) * 100);

  useEffect(() => {
    async function load() {
      await loadAchievements();
      const unlockedList = getUnlockedAchievements();
      setUnlocked(new Set(unlockedList.map(a => a.id)));
      setStats(getStats());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            {unlockedCount}/{totalAchievements}
          </Text>
          <Text style={styles.headerStatsPercent}>{completionPercent}%</Text>
        </View>
      </View>

      <View style={styles.overallProgressContainer}>
        <View style={styles.overallProgressBar}>
          <View style={[styles.overallProgressFill, { width: `${completionPercent}%` }]} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(CATEGORIES).map(([key, category]) => (
          <CategorySection
            key={key}
            categoryKey={key}
            category={category}
            unlockedSet={unlocked}
            stats={stats}
            newAchievements={newAchievements}
          />
        ))}
        
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>📊 Lifetime Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalKills || 0}</Text>
              <Text style={styles.statLabel}>Enemies Destroyed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalBosses || 0}</Text>
              <Text style={styles.statLabel}>Bosses Defeated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPowerups || 0}</Text>
              <Text style={styles.statLabel}>Power-Ups Collected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.maxCombo || 0}x</Text>
              <Text style={styles.statLabel}>Best Combo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(stats.highScore || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>High Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.gamesPlayed || 0}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStatsText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '700',
  },
  headerStatsPercent: {
    color: '#64748b',
    fontSize: 12,
  },
  overallProgressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  overallProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryLabel: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  categoryProgress: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryProgressText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  achievementCardUnlocked: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  achievementIcon: {
    fontSize: 26,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  achievementDescription: {
    color: '#94a3b8',
    fontSize: 13,
  },
  textLocked: {
    opacity: 0.6,
  },
  newBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  progressText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  statsSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  statsTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
