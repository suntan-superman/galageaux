import { STAGES } from '../constants/game';
import * as Audio from './audio';

/**
 * Translate one already-consumed session event batch into the achievement
 * manager's delta/maxima contract. The screen owns event de-duplication and
 * serializes persistence; cumulative session kill/pickup totals are not deltas.
 */
export function getAchievementUpdates(events, state) {
  const updates = {};
  let maxCombo = Math.max(state.combo || 0, state.sessionStats?.maxCombo || 0);
  for (const event of events) {
    switch (event.type) {
      case 'enemyKilled':
        updates.kills = (updates.kills || 0) + 1;
        maxCombo = Math.max(maxCombo, event.combo || 0);
        break;
      case 'bossKilled': {
        updates.bosses = (updates.bosses || 0) + 1;
        const stage = STAGES.indexOf(event.stage) + 1;
        if (stage > 0) updates.stageComplete = stage;
        break;
      }
      case 'powerupCollected':
        updates.powerups = (updates.powerups || 0) + 1;
        break;
      case 'levelUp':
        updates.flawless = Boolean(updates.flawless || event.flawless);
        break;
      case 'gameStarted':
        updates.gameStart = true;
        break;
      case 'sessionEnded':
        updates.totalScore = state.score;
        break;
    }
  }
  // Shots, hit feedback and idle frames need no achievement storage writes.
  if (Object.keys(updates).length === 0) return updates;
  return { ...updates, combo: maxCombo, score: state.score, level: state.level };
}

/** Play existing cues for committed events; no simulation or reward mutations. */
export function playGameEventSounds(events) {
  for (const event of events) {
    switch (event.type) {
      case 'shotFired':
        Audio.playSound(event.cue, event.volume ?? 0.3);
        break;
      case 'enemyHit':
        if (event.hp > 0) Audio.playSound('enemyHit', 0.4);
        break;
      case 'enemyKilled':
        Audio.playSound('enemyDestroy', 0.5);
        if (event.combo >= 2) Audio.playSound('comboIncrease', 0.6);
        break;
      case 'bossHit':
        Audio.playSound('enemyHit', 0.4);
        break;
      case 'bossAppeared':
        Audio.playSound('bossAppear', 0.9);
        break;
      case 'bossKilled':
        Audio.playSound('bossDeath', 0.8);
        break;
      case 'bossPhaseChanged':
        Audio.playSound('levelUp', 0.35);
        break;
      case 'victory':
        Audio.playSound('levelUp', 0.8);
        break;
      case 'playerHit':
        Audio.playSound('playerHit', 0.8);
        break;
      case 'shieldHit':
        Audio.playSound('shieldActivate', 0.5);
        break;
      case 'powerupCollected':
        Audio.playSound('powerupCollect', 0.7);
        if (event.kind === 'shield') Audio.playSound('shieldActivate', 0.7);
        break;
      case 'levelUp':
        Audio.playSound('levelUp', 0.8);
        break;
      case 'sessionEnded':
        if (event.outcome === 'lost') Audio.playSound('playerDeath', 0.9);
        break;
      case 'music':
        Audio.playMusic(event.track);
        break;
    }
  }
}
