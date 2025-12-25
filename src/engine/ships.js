/**
 * Ship Customization System
 * Manages ship variants, unlocks, and player customization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Ship definitions
export const SHIPS = {
  // Default starter ship
  falcon: {
    id: 'falcon',
    name: 'Falcon',
    description: 'Standard fighter with balanced stats',
    tier: 'starter',
    unlocked: true,
    unlockCondition: null,
    stats: {
      speed: 100,
      fireRate: 100,
      damage: 100,
      shield: 100,
    },
    colors: {
      primary: '#38bdf8',
      secondary: '#0ea5e9',
      accent: '#ffffff',
    },
    shape: 'standard',
  },
  
  // Speed-focused ship
  viper: {
    id: 'viper',
    name: 'Viper',
    description: 'Fast and agile with reduced armor',
    tier: 'common',
    unlocked: false,
    unlockCondition: {
      type: 'score',
      value: 50000,
      description: 'Reach 50,000 score',
    },
    stats: {
      speed: 140,
      fireRate: 110,
      damage: 80,
      shield: 70,
    },
    colors: {
      primary: '#22c55e',
      secondary: '#16a34a',
      accent: '#dcfce7',
    },
    shape: 'slim',
  },
  
  // Tank-focused ship
  titan: {
    id: 'titan',
    name: 'Titan',
    description: 'Heavy armor with powerful weapons',
    tier: 'common',
    unlocked: false,
    unlockCondition: {
      type: 'kills',
      value: 500,
      description: 'Defeat 500 enemies',
    },
    stats: {
      speed: 70,
      fireRate: 80,
      damage: 130,
      shield: 150,
    },
    colors: {
      primary: '#ef4444',
      secondary: '#dc2626',
      accent: '#fecaca',
    },
    shape: 'heavy',
  },
  
  // Rapid fire ship
  hornet: {
    id: 'hornet',
    name: 'Hornet',
    description: 'Rapid fire with spread shot',
    tier: 'rare',
    unlocked: false,
    unlockCondition: {
      type: 'wave',
      value: 10,
      description: 'Reach wave 10',
    },
    stats: {
      speed: 110,
      fireRate: 150,
      damage: 70,
      shield: 80,
    },
    colors: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#fef3c7',
    },
    shape: 'standard',
    special: 'spreadShot',
  },
  
  // Stealth ship
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    description: 'Stealth ship with dodge ability',
    tier: 'rare',
    unlocked: false,
    unlockCondition: {
      type: 'noDamage',
      value: 5,
      description: 'Complete 5 waves without damage',
    },
    stats: {
      speed: 120,
      fireRate: 90,
      damage: 90,
      shield: 60,
    },
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#ddd6fe',
    },
    shape: 'slim',
    special: 'phaseShift',
  },
  
  // Boss killer
  devastator: {
    id: 'devastator',
    name: 'Devastator',
    description: 'Charged shots deal massive damage',
    tier: 'epic',
    unlocked: false,
    unlockCondition: {
      type: 'boss',
      value: 10,
      description: 'Defeat 10 bosses',
    },
    stats: {
      speed: 85,
      fireRate: 60,
      damage: 200,
      shield: 100,
    },
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fed7aa',
    },
    shape: 'heavy',
    special: 'chargedShot',
  },
  
  // Perfect run reward
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Legendary ship with energy shields',
    tier: 'legendary',
    unlocked: false,
    unlockCondition: {
      type: 'perfect',
      value: 1,
      description: 'Complete a stage without damage',
    },
    stats: {
      speed: 110,
      fireRate: 110,
      damage: 110,
      shield: 130,
    },
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#cffafe',
    },
    shape: 'standard',
    special: 'energyShield',
  },
  
  // All challenges complete
  omega: {
    id: 'omega',
    name: 'Omega',
    description: 'Ultimate ship with all abilities',
    tier: 'legendary',
    unlocked: false,
    unlockCondition: {
      type: 'challenges',
      value: 30,
      description: 'Complete 30 daily challenges',
    },
    stats: {
      speed: 130,
      fireRate: 130,
      damage: 130,
      shield: 130,
    },
    colors: {
      primary: '#ec4899',
      secondary: '#db2777',
      accent: '#fbcfe8',
    },
    shape: 'standard',
    special: 'adaptiveWeapons',
  },
};

// Ship tiers with colors
export const SHIP_TIERS = {
  starter: { name: 'Starter', color: '#9ca3af' },
  common: { name: 'Common', color: '#22c55e' },
  rare: { name: 'Rare', color: '#3b82f6' },
  epic: { name: 'Epic', color: '#a855f7' },
  legendary: { name: 'Legendary', color: '#f59e0b' },
};

// Special abilities descriptions
export const SPECIAL_ABILITIES = {
  spreadShot: {
    name: 'Spread Shot',
    description: 'Fire 3 bullets in a spread pattern',
  },
  phaseShift: {
    name: 'Phase Shift',
    description: 'Briefly become invulnerable (3s cooldown)',
  },
  chargedShot: {
    name: 'Charged Shot',
    description: 'Hold fire for a powerful charged attack',
  },
  energyShield: {
    name: 'Energy Shield',
    description: 'Regenerating shield absorbs hits',
  },
  adaptiveWeapons: {
    name: 'Adaptive Weapons',
    description: 'Weapons adapt to enemy weaknesses',
  },
};

// Ship skins/color variants
export const SHIP_SKINS = {
  default: {
    id: 'default',
    name: 'Default',
    unlocked: true,
    colors: null, // Use ship's default colors
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    unlocked: false,
    unlockCondition: { type: 'score', value: 100000 },
    colors: { primary: '#dc2626', secondary: '#b91c1c', accent: '#fecaca' },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    unlocked: false,
    unlockCondition: { type: 'playTime', value: 3600 }, // 1 hour
    colors: { primary: '#1e293b', secondary: '#0f172a', accent: '#94a3b8' },
  },
  solar: {
    id: 'solar',
    name: 'Solar Flare',
    unlocked: false,
    unlockCondition: { type: 'kills', value: 1000 },
    colors: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fef3c7' },
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    unlocked: false,
    unlockCondition: { type: 'wave', value: 20 },
    colors: { primary: '#a855f7', secondary: '#7c3aed', accent: '#e9d5ff' },
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic',
    unlocked: false,
    unlockCondition: { type: 'noDamage', value: 10 },
    colors: { primary: '#e0f2fe', secondary: '#bae6fd', accent: '#ffffff' },
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    unlocked: false,
    unlockCondition: { type: 'boss', value: 25 },
    colors: { primary: '#f97316', secondary: '#ea580c', accent: '#fed7aa' },
  },
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic',
    unlocked: false,
    unlockCondition: { type: 'challenges', value: 50 },
    colors: { primary: '#ec4899', secondary: '#be185d', accent: '#fce7f3' },
  },
};

// Storage key
const STORAGE_KEY = '@galageaux/ship_customization';

// Default player state
const DEFAULT_STATE = {
  selectedShip: 'falcon',
  selectedSkin: 'default',
  unlockedShips: ['falcon'],
  unlockedSkins: ['default'],
  playerStats: {
    totalScore: 0,
    totalKills: 0,
    highestWave: 0,
    noDamageWaves: 0,
    bossesDefeated: 0,
    challengesCompleted: 0,
    playTime: 0,
  },
};

/**
 * Load customization state from storage
 */
export async function loadCustomization() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load customization:', error);
  }
  return DEFAULT_STATE;
}

/**
 * Save customization state to storage
 */
export async function saveCustomization(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save customization:', error);
  }
}

/**
 * Get the currently selected ship with applied skin
 */
export function getSelectedShip(state) {
  const ship = SHIPS[state.selectedShip] || SHIPS.falcon;
  const skin = SHIP_SKINS[state.selectedSkin];
  
  // Apply skin colors if available
  if (skin && skin.colors) {
    return {
      ...ship,
      colors: skin.colors,
      skinId: skin.id,
    };
  }
  
  return ship;
}

/**
 * Check if a ship is unlocked
 */
export function isShipUnlocked(shipId, state) {
  return state.unlockedShips.includes(shipId);
}

/**
 * Check if a skin is unlocked
 */
export function isSkinUnlocked(skinId, state) {
  return state.unlockedSkins.includes(skinId);
}

/**
 * Get unlock progress for a ship
 */
export function getShipUnlockProgress(shipId, playerStats) {
  const ship = SHIPS[shipId];
  if (!ship || !ship.unlockCondition) return { progress: 100, isUnlocked: true };
  
  const condition = ship.unlockCondition;
  let current = 0;
  
  switch (condition.type) {
    case 'score':
      current = playerStats.totalScore;
      break;
    case 'kills':
      current = playerStats.totalKills;
      break;
    case 'wave':
      current = playerStats.highestWave;
      break;
    case 'noDamage':
      current = playerStats.noDamageWaves;
      break;
    case 'boss':
      current = playerStats.bossesDefeated;
      break;
    case 'challenges':
      current = playerStats.challengesCompleted;
      break;
    case 'perfect':
      current = playerStats.perfectRuns || 0;
      break;
    default:
      current = 0;
  }
  
  const progress = Math.min(100, (current / condition.value) * 100);
  const isUnlocked = current >= condition.value;
  
  return {
    progress,
    isUnlocked,
    current,
    required: condition.value,
  };
}

/**
 * Get unlock progress for a skin
 */
export function getSkinUnlockProgress(skinId, playerStats) {
  const skin = SHIP_SKINS[skinId];
  if (!skin || !skin.unlockCondition) return { progress: 100, isUnlocked: true };
  
  const condition = skin.unlockCondition;
  let current = 0;
  
  switch (condition.type) {
    case 'score':
      current = playerStats.totalScore;
      break;
    case 'kills':
      current = playerStats.totalKills;
      break;
    case 'wave':
      current = playerStats.highestWave;
      break;
    case 'noDamage':
      current = playerStats.noDamageWaves;
      break;
    case 'boss':
      current = playerStats.bossesDefeated;
      break;
    case 'challenges':
      current = playerStats.challengesCompleted;
      break;
    case 'playTime':
      current = playerStats.playTime;
      break;
    default:
      current = 0;
  }
  
  const progress = Math.min(100, (current / condition.value) * 100);
  const isUnlocked = current >= condition.value;
  
  return {
    progress,
    isUnlocked,
    current,
    required: condition.value,
  };
}

/**
 * Check and unlock any newly available ships/skins
 * @param {Object} state - Current customization state
 * @returns {Object} Updated state and newly unlocked items
 */
export function checkUnlocks(state) {
  const newlyUnlockedShips = [];
  const newlyUnlockedSkins = [];
  
  // Check ships
  for (const [shipId, ship] of Object.entries(SHIPS)) {
    if (state.unlockedShips.includes(shipId)) continue;
    
    const { isUnlocked } = getShipUnlockProgress(shipId, state.playerStats);
    if (isUnlocked) {
      newlyUnlockedShips.push(shipId);
    }
  }
  
  // Check skins
  for (const [skinId, skin] of Object.entries(SHIP_SKINS)) {
    if (state.unlockedSkins.includes(skinId)) continue;
    
    const { isUnlocked } = getSkinUnlockProgress(skinId, state.playerStats);
    if (isUnlocked) {
      newlyUnlockedSkins.push(skinId);
    }
  }
  
  // Update state if new unlocks
  const updatedState = {
    ...state,
    unlockedShips: [...state.unlockedShips, ...newlyUnlockedShips],
    unlockedSkins: [...state.unlockedSkins, ...newlyUnlockedSkins],
  };
  
  return {
    state: updatedState,
    newlyUnlockedShips: newlyUnlockedShips.map(id => SHIPS[id]),
    newlyUnlockedSkins: newlyUnlockedSkins.map(id => SHIP_SKINS[id]),
  };
}

/**
 * Update player stats and check for unlocks
 */
export async function updatePlayerStats(gameStats) {
  const state = await loadCustomization();
  
  // Accumulate stats
  state.playerStats.totalScore += gameStats.score || 0;
  state.playerStats.totalKills += gameStats.kills || 0;
  state.playerStats.highestWave = Math.max(state.playerStats.highestWave, gameStats.wave || 0);
  state.playerStats.noDamageWaves += gameStats.noDamageWaves || 0;
  state.playerStats.bossesDefeated += gameStats.bossesDefeated || 0;
  state.playerStats.playTime += gameStats.playTime || 0;
  
  if (gameStats.perfectRun) {
    state.playerStats.perfectRuns = (state.playerStats.perfectRuns || 0) + 1;
  }
  
  // Check for new unlocks
  const { state: updatedState, newlyUnlockedShips, newlyUnlockedSkins } = checkUnlocks(state);
  
  // Save updated state
  await saveCustomization(updatedState);
  
  return {
    state: updatedState,
    newlyUnlockedShips,
    newlyUnlockedSkins,
  };
}

/**
 * Select a ship
 */
export async function selectShip(shipId) {
  const state = await loadCustomization();
  
  if (!state.unlockedShips.includes(shipId)) {
    return { success: false, error: 'Ship not unlocked' };
  }
  
  state.selectedShip = shipId;
  await saveCustomization(state);
  
  return { success: true, state };
}

/**
 * Select a skin
 */
export async function selectSkin(skinId) {
  const state = await loadCustomization();
  
  if (!state.unlockedSkins.includes(skinId)) {
    return { success: false, error: 'Skin not unlocked' };
  }
  
  state.selectedSkin = skinId;
  await saveCustomization(state);
  
  return { success: true, state };
}

/**
 * Calculate ship stats with modifiers
 */
export function calculateShipStats(ship, level = 1) {
  const baseMultiplier = 1 + (level - 1) * 0.1; // 10% boost per level
  
  return {
    speed: Math.round(ship.stats.speed * baseMultiplier),
    fireRate: Math.round(ship.stats.fireRate * baseMultiplier),
    damage: Math.round(ship.stats.damage * baseMultiplier),
    shield: Math.round(ship.stats.shield * baseMultiplier),
  };
}

/**
 * Get all ships organized by tier
 */
export function getShipsByTier() {
  const shipsByTier = {};
  
  for (const tier of Object.keys(SHIP_TIERS)) {
    shipsByTier[tier] = Object.values(SHIPS).filter(ship => ship.tier === tier);
  }
  
  return shipsByTier;
}

/**
 * Get ship count summary
 */
export function getShipSummary(state) {
  const total = Object.keys(SHIPS).length;
  const unlocked = state.unlockedShips.length;
  
  return {
    total,
    unlocked,
    locked: total - unlocked,
    percentage: Math.round((unlocked / total) * 100),
  };
}

export default {
  SHIPS,
  SHIP_TIERS,
  SHIP_SKINS,
  SPECIAL_ABILITIES,
  loadCustomization,
  saveCustomization,
  getSelectedShip,
  isShipUnlocked,
  isSkinUnlocked,
  getShipUnlockProgress,
  getSkinUnlockProgress,
  checkUnlocks,
  updatePlayerStats,
  selectShip,
  selectSkin,
  calculateShipStats,
  getShipsByTier,
  getShipSummary,
};
