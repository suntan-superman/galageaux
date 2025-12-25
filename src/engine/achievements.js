import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'galageaux:achievements';
const STATS_KEY = 'galageaux:stats';

// Achievement definitions
export const ACHIEVEMENTS = {
  firstBlood: {
    id: 'firstBlood',
    title: 'First Blood',
    description: 'Destroy your first enemy',
    icon: '💀',
    requirement: { type: 'kills', value: 1 }
  },
  sharpshooter: {
    id: 'sharpshooter',
    title: 'Sharpshooter',
    description: 'Destroy 100 enemies',
    icon: '🎯',
    requirement: { type: 'kills', value: 100 }
  },
  exterminator: {
    id: 'exterminator',
    title: 'Exterminator',
    description: 'Destroy 500 enemies',
    icon: '💥',
    requirement: { type: 'kills', value: 500 }
  },
  powerCollector: {
    id: 'powerCollector',
    title: 'Power Collector',
    description: 'Collect 25 power-ups',
    icon: '⚡',
    requirement: { type: 'powerups', value: 25 }
  },
  powerAddict: {
    id: 'powerAddict',
    title: 'Power Addict',
    description: 'Collect 100 power-ups',
    icon: '🔋',
    requirement: { type: 'powerups', value: 100 }
  },
  bossSlayer: {
    id: 'bossSlayer',
    title: 'Boss Slayer',
    description: 'Defeat your first boss',
    icon: '👾',
    requirement: { type: 'bosses', value: 1 }
  },
  bossHunter: {
    id: 'bossHunter',
    title: 'Boss Hunter',
    description: 'Defeat 10 bosses',
    icon: '🏆',
    requirement: { type: 'bosses', value: 10 }
  },
  untouchable: {
    id: 'untouchable',
    title: 'Untouchable',
    description: 'Complete a level without taking damage',
    icon: '🛡️',
    requirement: { type: 'flawless', value: 1 }
  },
  comboMaster: {
    id: 'comboMaster',
    title: 'Combo Master',
    description: 'Reach a 10x combo',
    icon: '🔥',
    requirement: { type: 'combo', value: 10 }
  },
  comboGod: {
    id: 'comboGod',
    title: 'Combo God',
    description: 'Reach a 25x combo',
    icon: '⚡',
    requirement: { type: 'combo', value: 25 }
  },
  stageClear: {
    id: 'stageClear',
    title: 'Stage Clear',
    description: 'Complete Stage 1',
    icon: '✅',
    requirement: { type: 'stageComplete', value: 1 }
  },
  veteranPilot: {
    id: 'veteranPilot',
    title: 'Veteran Pilot',
    description: 'Complete Stage 2',
    icon: '🎖️',
    requirement: { type: 'stageComplete', value: 2 }
  },
  acePilot: {
    id: 'acePilot',
    title: 'Ace Pilot',
    description: 'Complete Stage 3',
    icon: '⭐',
    requirement: { type: 'stageComplete', value: 3 }
  },
  scoreChaser: {
    id: 'scoreChaser',
    title: 'Score Chaser',
    description: 'Score 50,000 points in one game',
    icon: '💯',
    requirement: { type: 'score', value: 50000 }
  },
  scoreKing: {
    id: 'scoreKing',
    title: 'Score King',
    description: 'Score 100,000 points in one game',
    icon: '👑',
    requirement: { type: 'score', value: 100000 }
  },
  survivor: {
    id: 'survivor',
    title: 'Survivor',
    description: 'Reach level 5',
    icon: '💪',
    requirement: { type: 'level', value: 5 }
  },
  legend: {
    id: 'legend',
    title: 'Legend',
    description: 'Reach level 10',
    icon: '🌟',
    requirement: { type: 'level', value: 10 }
  }
};

// Initialize achievement state
let achievementState = {
  unlocked: {},
  stats: {
    totalKills: 0,
    totalPowerups: 0,
    totalBosses: 0,
    maxCombo: 0,
    highScore: 0,
    maxLevel: 0,
    stagesCompleted: [],
    gamesPlayed: 0,
    totalScore: 0
  },
  loaded: false
};

/**
 * Load achievements and stats from storage
 */
export async function loadAchievements() {
  try {
    const [achievementsData, statsData] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(STATS_KEY)
    ]);

    if (achievementsData) {
      achievementState.unlocked = JSON.parse(achievementsData);
    }

    if (statsData) {
      achievementState.stats = { ...achievementState.stats, ...JSON.parse(statsData) };
    }

    achievementState.loaded = true;
  } catch (error) {
    console.error('Failed to load achievements:', error);
  }
}

/**
 * Save achievements to storage
 */
async function saveAchievements() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(achievementState.unlocked));
  } catch (error) {
    console.error('Failed to save achievements:', error);
  }
}

/**
 * Save stats to storage
 */
async function saveStats() {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(achievementState.stats));
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
}

/**
 * Check if achievement is unlocked
 */
export function isAchievementUnlocked(achievementId) {
  return achievementState.unlocked[achievementId] === true;
}

/**
 * Get all unlocked achievements
 */
export function getUnlockedAchievements() {
  return Object.keys(achievementState.unlocked).filter(id => achievementState.unlocked[id]);
}

/**
 * Get achievement progress
 */
export function getAchievementProgress(achievementId) {
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return 0;

  const { type, value } = achievement.requirement;
  let current = 0;

  switch (type) {
    case 'kills':
      current = achievementState.stats.totalKills;
      break;
    case 'powerups':
      current = achievementState.stats.totalPowerups;
      break;
    case 'bosses':
      current = achievementState.stats.totalBosses;
      break;
    case 'combo':
      current = achievementState.stats.maxCombo;
      break;
    case 'score':
      current = achievementState.stats.highScore;
      break;
    case 'level':
      current = achievementState.stats.maxLevel;
      break;
    case 'stageComplete':
      current = achievementState.stats.stagesCompleted.includes(value) ? value : 0;
      break;
    case 'flawless':
      return isAchievementUnlocked(achievementId) ? 1 : 0;
    default:
      return 0;
  }

  return Math.min(current / value, 1);
}

/**
 * Check and unlock achievements based on stats
 */
export async function checkAchievements(updates = {}) {
  if (!achievementState.loaded) {
    await loadAchievements();
  }

  const newlyUnlocked = [];

  // Update stats
  if (updates.kills) achievementState.stats.totalKills += updates.kills;
  if (updates.powerups) achievementState.stats.totalPowerups += updates.powerups;
  if (updates.bosses) achievementState.stats.totalBosses += updates.bosses;
  if (updates.combo && updates.combo > achievementState.stats.maxCombo) {
    achievementState.stats.maxCombo = updates.combo;
  }
  if (updates.score && updates.score > achievementState.stats.highScore) {
    achievementState.stats.highScore = updates.score;
  }
  if (updates.level && updates.level > achievementState.stats.maxLevel) {
    achievementState.stats.maxLevel = updates.level;
  }
  if (updates.stageComplete && !achievementState.stats.stagesCompleted.includes(updates.stageComplete)) {
    achievementState.stats.stagesCompleted.push(updates.stageComplete);
  }
  if (updates.flawless) {
    if (!isAchievementUnlocked('untouchable')) {
      achievementState.unlocked.untouchable = true;
      newlyUnlocked.push(ACHIEVEMENTS.untouchable);
    }
  }
  if (updates.gameStart) {
    achievementState.stats.gamesPlayed += 1;
  }
  if (updates.totalScore) {
    achievementState.stats.totalScore += updates.totalScore;
  }

  // Check all achievements
  for (const achievement of Object.values(ACHIEVEMENTS)) {
    if (isAchievementUnlocked(achievement.id)) continue;

    const { type, value } = achievement.requirement;
    let unlocked = false;

    switch (type) {
      case 'kills':
        unlocked = achievementState.stats.totalKills >= value;
        break;
      case 'powerups':
        unlocked = achievementState.stats.totalPowerups >= value;
        break;
      case 'bosses':
        unlocked = achievementState.stats.totalBosses >= value;
        break;
      case 'combo':
        unlocked = achievementState.stats.maxCombo >= value;
        break;
      case 'score':
        unlocked = achievementState.stats.highScore >= value;
        break;
      case 'level':
        unlocked = achievementState.stats.maxLevel >= value;
        break;
      case 'stageComplete':
        unlocked = achievementState.stats.stagesCompleted.includes(value);
        break;
    }

    if (unlocked) {
      achievementState.unlocked[achievement.id] = true;
      newlyUnlocked.push(achievement);
    }
  }

  // Save if anything changed
  if (newlyUnlocked.length > 0 || Object.keys(updates).length > 0) {
    await Promise.all([saveAchievements(), saveStats()]);
  }

  return newlyUnlocked;
}

/**
 * Get current stats
 */
export function getStats() {
  return { ...achievementState.stats };
}

/**
 * Get all achievements with unlock status
 */
export function getAllAchievements() {
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: isAchievementUnlocked(achievement.id),
    progress: getAchievementProgress(achievement.id)
  }));
}

/**
 * Reset all achievements (for testing)
 */
export async function resetAchievements() {
  achievementState.unlocked = {};
  achievementState.stats = {
    totalKills: 0,
    totalPowerups: 0,
    totalBosses: 0,
    maxCombo: 0,
    highScore: 0,
    maxLevel: 0,
    stagesCompleted: [],
    gamesPlayed: 0,
    totalScore: 0
  };
  await Promise.all([saveAchievements(), saveStats()]);
}
