/**
 * In-memory display fixtures for development-only Capture Studio screenshots.
 * These are never written to AsyncStorage or the achievements manager.
 */

export const CAPTURE_STATS_FIXTURE = Object.freeze({
  totalKills: 487,
  totalPowerups: 91,
  totalBosses: 8,
  maxCombo: 16,
  highScore: 125000,
  maxLevel: 6,
  stagesCompleted: Object.freeze([1, 2, 3]),
  gamesPlayed: 12,
  totalScore: 420350,
});

export const CAPTURE_ACHIEVEMENTS_FIXTURE = Object.freeze({
  stats: CAPTURE_STATS_FIXTURE,
  unlocked: Object.freeze([
    'firstBlood',
    'sharpshooter',
    'powerCollector',
    'bossSlayer',
    'untouchable',
    'comboMaster',
    'stageClear',
    'veteranPilot',
    'acePilot',
    'scoreChaser',
    'scoreKing',
    'survivor',
    'legend',
  ]),
});
