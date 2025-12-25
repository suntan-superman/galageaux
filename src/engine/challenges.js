/**
 * Daily Challenges System
 * Generates and manages daily challenges with rotating objectives
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Challenge type definitions
export const CHALLENGE_TYPES = {
  SCORE: 'score',
  KILLS: 'kills',
  SURVIVAL: 'survival',
  NO_DAMAGE: 'no_damage',
  SPEED_RUN: 'speed_run',
  COMBO: 'combo',
  POWERUP: 'powerup',
  BOSS: 'boss',
  PERFECT: 'perfect',
};

// Challenge difficulty modifiers
export const DIFFICULTY = {
  EASY: { multiplier: 1.0, rewardMultiplier: 1.0 },
  MEDIUM: { multiplier: 1.5, rewardMultiplier: 1.5 },
  HARD: { multiplier: 2.0, rewardMultiplier: 2.5 },
  EXPERT: { multiplier: 3.0, rewardMultiplier: 4.0 },
};

// Challenge templates
const CHALLENGE_TEMPLATES = [
  // Score challenges
  {
    type: CHALLENGE_TYPES.SCORE,
    name: 'Score Hunter',
    description: 'Reach {target} points in a single game',
    baseTarget: 10000,
    icon: '🎯',
    validate: (stats, target) => stats.score >= target,
  },
  {
    type: CHALLENGE_TYPES.SCORE,
    name: 'Score Master',
    description: 'Reach {target} points without using continues',
    baseTarget: 25000,
    icon: '🏆',
    validate: (stats, target) => stats.score >= target && stats.continues === 0,
  },
  
  // Kill challenges
  {
    type: CHALLENGE_TYPES.KILLS,
    name: 'Enemy Eliminator',
    description: 'Defeat {target} enemies in a single game',
    baseTarget: 50,
    icon: '💥',
    validate: (stats, target) => stats.kills >= target,
  },
  {
    type: CHALLENGE_TYPES.KILLS,
    name: 'Elite Hunter',
    description: 'Defeat {target} elite enemies',
    baseTarget: 10,
    icon: '⭐',
    validate: (stats, target) => stats.eliteKills >= target,
  },
  
  // Survival challenges
  {
    type: CHALLENGE_TYPES.SURVIVAL,
    name: 'Survivor',
    description: 'Survive for {target} seconds',
    baseTarget: 120,
    icon: '⏱️',
    validate: (stats, target) => stats.survivalTime >= target,
  },
  {
    type: CHALLENGE_TYPES.SURVIVAL,
    name: 'Last Stand',
    description: 'Survive to wave {target}',
    baseTarget: 5,
    icon: '🛡️',
    validate: (stats, target) => stats.waveReached >= target,
  },
  
  // No damage challenges
  {
    type: CHALLENGE_TYPES.NO_DAMAGE,
    name: 'Untouchable',
    description: 'Complete wave {target} without taking damage',
    baseTarget: 1,
    icon: '✨',
    validate: (stats, target) => stats.noDamageWaves >= target,
  },
  {
    type: CHALLENGE_TYPES.NO_DAMAGE,
    name: 'Ghost',
    description: 'Complete {target} waves without being hit',
    baseTarget: 3,
    icon: '👻',
    validate: (stats, target) => stats.consecutiveNoDamageWaves >= target,
  },
  
  // Speed run challenges
  {
    type: CHALLENGE_TYPES.SPEED_RUN,
    name: 'Speed Demon',
    description: 'Complete stage 1 in under {target} seconds',
    baseTarget: 60,
    icon: '⚡',
    validate: (stats, target) => stats.stage1Time > 0 && stats.stage1Time <= target,
  },
  
  // Combo challenges
  {
    type: CHALLENGE_TYPES.COMBO,
    name: 'Combo King',
    description: 'Reach a {target}x combo',
    baseTarget: 10,
    icon: '🔥',
    validate: (stats, target) => stats.maxCombo >= target,
  },
  {
    type: CHALLENGE_TYPES.COMBO,
    name: 'Chain Master',
    description: 'Maintain a 5x combo for {target} kills',
    baseTarget: 20,
    icon: '⛓️',
    validate: (stats, target) => stats.combo5Streak >= target,
  },
  
  // Powerup challenges
  {
    type: CHALLENGE_TYPES.POWERUP,
    name: 'Power Collector',
    description: 'Collect {target} powerups',
    baseTarget: 10,
    icon: '🎁',
    validate: (stats, target) => stats.powerupsCollected >= target,
  },
  {
    type: CHALLENGE_TYPES.POWERUP,
    name: 'Shield Master',
    description: 'Absorb {target} hits with shields',
    baseTarget: 5,
    icon: '🛡️',
    validate: (stats, target) => stats.shieldHitsAbsorbed >= target,
  },
  
  // Boss challenges
  {
    type: CHALLENGE_TYPES.BOSS,
    name: 'Boss Slayer',
    description: 'Defeat {target} boss(es)',
    baseTarget: 1,
    icon: '👹',
    validate: (stats, target) => stats.bossesDefeated >= target,
  },
  {
    type: CHALLENGE_TYPES.BOSS,
    name: 'Flawless Victory',
    description: 'Defeat a boss without taking damage',
    baseTarget: 1,
    icon: '💎',
    validate: (stats, target) => stats.flawlessBossKills >= target,
  },
  
  // Perfect challenges
  {
    type: CHALLENGE_TYPES.PERFECT,
    name: 'Perfect Wave',
    description: 'Get 100% accuracy in wave {target}',
    baseTarget: 1,
    icon: '🎯',
    validate: (stats, target) => stats.perfectAccuracyWaves >= target,
  },
];

/**
 * Generate a seed based on the current date
 * Ensures same challenges for all players each day
 */
function getDailySeed() {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate daily challenges
 * @param {number} count - Number of challenges to generate
 * @returns {Object[]} Array of daily challenges
 */
export function generateDailyChallenges(count = 3) {
  const seed = getDailySeed();
  const challenges = [];
  const usedTemplates = new Set();
  
  // Select unique challenge templates
  for (let i = 0; i < count && usedTemplates.size < CHALLENGE_TEMPLATES.length; i++) {
    let templateIndex;
    let attempts = 0;
    
    do {
      templateIndex = Math.floor(seededRandom(seed + i + attempts * 100) * CHALLENGE_TEMPLATES.length);
      attempts++;
    } while (usedTemplates.has(templateIndex) && attempts < 50);
    
    if (!usedTemplates.has(templateIndex)) {
      usedTemplates.add(templateIndex);
      const template = CHALLENGE_TEMPLATES[templateIndex];
      
      // Determine difficulty based on day of week
      const dayOfWeek = new Date().getDay();
      const difficulties = Object.values(DIFFICULTY);
      const difficultyIndex = Math.min(
        Math.floor(seededRandom(seed + i * 10) * 4),
        difficulties.length - 1
      );
      const difficulty = difficulties[difficultyIndex];
      const difficultyName = Object.keys(DIFFICULTY)[difficultyIndex];
      
      // Calculate target with difficulty modifier
      const target = Math.ceil(template.baseTarget * difficulty.multiplier);
      
      // Calculate reward (base XP + difficulty bonus)
      const baseReward = 100;
      const reward = Math.ceil(baseReward * difficulty.rewardMultiplier);
      
      challenges.push({
        id: `daily_${seed}_${i}`,
        templateId: templateIndex,
        type: template.type,
        name: template.name,
        description: template.description.replace('{target}', target),
        target,
        icon: template.icon,
        difficulty: difficultyName,
        reward,
        completed: false,
        progress: 0,
        expiresAt: getEndOfDay(),
        validate: template.validate,
      });
    }
  }
  
  return challenges;
}

/**
 * Get the end of the current day (midnight)
 */
function getEndOfDay() {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return endOfDay.getTime();
}

/**
 * Check if a challenge has expired
 */
export function isChallengeExpired(challenge) {
  return Date.now() >= challenge.expiresAt;
}

/**
 * Get time remaining for challenges
 */
export function getTimeRemaining() {
  const endOfDay = getEndOfDay();
  const remaining = endOfDay - Date.now();
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, remaining };
}

/**
 * Update challenge progress based on game stats
 * @param {Object[]} challenges - Current challenges
 * @param {Object} stats - Game statistics
 * @returns {Object} Updated challenges and newly completed ones
 */
export function updateChallengeProgress(challenges, stats) {
  const updatedChallenges = [];
  const newlyCompleted = [];
  
  for (const challenge of challenges) {
    if (challenge.completed || isChallengeExpired(challenge)) {
      updatedChallenges.push(challenge);
      continue;
    }
    
    // Get the template to access validate function
    const template = CHALLENGE_TEMPLATES[challenge.templateId];
    if (!template) {
      updatedChallenges.push(challenge);
      continue;
    }
    
    // Check if challenge is completed
    const isCompleted = template.validate(stats, challenge.target);
    
    // Calculate progress percentage
    let progress = 0;
    switch (challenge.type) {
      case CHALLENGE_TYPES.SCORE:
        progress = Math.min(100, (stats.score / challenge.target) * 100);
        break;
      case CHALLENGE_TYPES.KILLS:
        const kills = challenge.name.includes('Elite') ? stats.eliteKills : stats.kills;
        progress = Math.min(100, (kills / challenge.target) * 100);
        break;
      case CHALLENGE_TYPES.SURVIVAL:
        const survivalValue = challenge.name.includes('wave') ? stats.waveReached : stats.survivalTime;
        progress = Math.min(100, (survivalValue / challenge.target) * 100);
        break;
      case CHALLENGE_TYPES.COMBO:
        progress = Math.min(100, (stats.maxCombo / challenge.target) * 100);
        break;
      case CHALLENGE_TYPES.POWERUP:
        progress = Math.min(100, (stats.powerupsCollected / challenge.target) * 100);
        break;
      case CHALLENGE_TYPES.BOSS:
        progress = Math.min(100, (stats.bossesDefeated / challenge.target) * 100);
        break;
      default:
        progress = isCompleted ? 100 : 0;
    }
    
    const updated = {
      ...challenge,
      completed: isCompleted,
      progress: Math.floor(progress),
    };
    
    if (isCompleted && !challenge.completed) {
      newlyCompleted.push(updated);
    }
    
    updatedChallenges.push(updated);
  }
  
  return { challenges: updatedChallenges, newlyCompleted };
}

// Storage keys
const STORAGE_KEYS = {
  DAILY_CHALLENGES: '@galageaux/daily_challenges',
  CHALLENGE_STATS: '@galageaux/challenge_stats',
};

/**
 * Save daily challenges to storage
 */
export async function saveDailyChallenges(challenges) {
  try {
    const data = {
      challenges: challenges.map(c => ({
        ...c,
        validate: undefined, // Don't store functions
      })),
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save daily challenges:', error);
  }
}

/**
 * Load daily challenges from storage
 * Regenerates if expired or not found
 */
export async function loadDailyChallenges() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGES);
    
    if (stored) {
      const data = JSON.parse(stored);
      const challenges = data.challenges;
      
      // Check if challenges are still valid (same day)
      if (challenges.length > 0 && !isChallengeExpired(challenges[0])) {
        // Reattach validate functions
        return challenges.map(c => ({
          ...c,
          validate: CHALLENGE_TEMPLATES[c.templateId]?.validate,
        }));
      }
    }
    
    // Generate new challenges
    const newChallenges = generateDailyChallenges(3);
    await saveDailyChallenges(newChallenges);
    return newChallenges;
  } catch (error) {
    console.error('Failed to load daily challenges:', error);
    return generateDailyChallenges(3);
  }
}

/**
 * Get challenge statistics
 */
export async function getChallengeStats() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGE_STATS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load challenge stats:', error);
  }
  
  return {
    totalCompleted: 0,
    streakDays: 0,
    lastCompletedDate: null,
    totalRewardsEarned: 0,
  };
}

/**
 * Update challenge statistics
 */
export async function updateChallengeStats(completedChallenge) {
  try {
    const stats = await getChallengeStats();
    const today = new Date().toDateString();
    
    stats.totalCompleted += 1;
    stats.totalRewardsEarned += completedChallenge.reward;
    
    // Update streak
    if (stats.lastCompletedDate) {
      const lastDate = new Date(stats.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate.toDateString() === yesterday.toDateString()) {
        stats.streakDays += 1;
      } else if (lastDate.toDateString() !== today) {
        stats.streakDays = 1;
      }
    } else {
      stats.streakDays = 1;
    }
    
    stats.lastCompletedDate = today;
    
    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_STATS, JSON.stringify(stats));
    return stats;
  } catch (error) {
    console.error('Failed to update challenge stats:', error);
    return null;
  }
}

/**
 * Create empty game stats object
 */
export function createEmptyGameStats() {
  return {
    score: 0,
    kills: 0,
    eliteKills: 0,
    survivalTime: 0,
    waveReached: 0,
    noDamageWaves: 0,
    consecutiveNoDamageWaves: 0,
    maxCombo: 0,
    combo5Streak: 0,
    powerupsCollected: 0,
    shieldHitsAbsorbed: 0,
    bossesDefeated: 0,
    flawlessBossKills: 0,
    perfectAccuracyWaves: 0,
    continues: 0,
    stage1Time: 0,
  };
}

export default {
  CHALLENGE_TYPES,
  DIFFICULTY,
  generateDailyChallenges,
  getTimeRemaining,
  updateChallengeProgress,
  saveDailyChallenges,
  loadDailyChallenges,
  getChallengeStats,
  updateChallengeStats,
  createEmptyGameStats,
  isChallengeExpired,
};
