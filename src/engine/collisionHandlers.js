/**
 * Collision Handlers - Game collision detection and response logic
 * Handles bullet-enemy, bullet-boss, bullet-player, and powerup collisions
 */

import { aabb } from './collision';
import { spawnExplosion, spawnExplosionParticles, spawnImpactEffect, spawnSparks } from './particles';
import { triggerScreenshake } from './screenshake';
import enemiesConfig from '../config/enemies.json';

/**
 * Check player bullets against enemies
 * @param {Object[]} bullets - Player bullets
 * @param {Object[]} enemies - Enemies
 * @param {Object} options - Callback options
 * @returns {{ survivingBullets: Object[], survivingEnemies: Object[], results: Object }}
 */
export function checkBulletEnemyCollisions(bullets, enemies, {
  onEnemyDestroyed,
  comboCount = 0,
  bonusMultiplier = 1
}) {
  const bulletPool = [...bullets];
  const bulletConsumed = new Array(bulletPool.length).fill(false);
  const survivingEnemies = [];
  
  let scoreGain = 0;
  let killsEarned = 0;
  const explosions = [];
  const particles = [];
  const scoreTexts = [];
  const powerups = [];
  let newCombo = comboCount;

  enemies.forEach(enemy => {
    let hitIndex = -1;
    for (let i = 0; i < bulletPool.length; i++) {
      const bullet = bulletPool[i];
      if (!bullet || bulletConsumed[i]) continue;
      if (
        aabb(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size }
        )
      ) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex >= 0) {
      bulletConsumed[hitIndex] = true;
      const centerX = enemy.x + enemy.size / 2;
      const centerY = enemy.y + enemy.size / 2;
      const cfg = enemiesConfig[enemy.type] || enemiesConfig['grunt'];
      const enemyColor = cfg.color || '#38bdf8';
      
      // Spawn effects
      explosions.push(spawnExplosion(centerX, centerY, 26, 0.25, enemyColor));
      particles.push(
        ...spawnExplosionParticles(centerX, centerY, 16, 'default', enemyColor),
        ...spawnSparks(centerX, centerY, 8, Math.PI / 2)
      );
      
      // Update combo
      newCombo += 1;
      killsEarned += 1;
      
      // Calculate score with combo multiplier
      const comboMultiplier = newCombo >= 5 ? 2 : newCombo >= 3 ? 1.5 : newCombo >= 2 ? 1.25 : 1;
      const points = Math.floor(cfg.score * comboMultiplier * bonusMultiplier);
      scoreGain += points;
      
      // Create score text
      scoreTexts.push({
        x: centerX,
        y: centerY,
        text: `+${points}${newCombo >= 2 ? ` (${newCombo}x)` : ''}`,
        color: newCombo >= 5 ? '#fbbf24' : newCombo >= 3 ? '#fb923c' : '#22c55e',
        life: 1,
        id: Date.now() + Math.random()
      });
      
      // Call destroy callback if provided
      if (onEnemyDestroyed) {
        onEnemyDestroyed(enemy, newCombo, points);
      }
    } else {
      survivingEnemies.push(enemy);
    }
  });

  const survivingBullets = bulletPool.filter((b, idx) => b && !bulletConsumed[idx]);

  return {
    survivingBullets,
    survivingEnemies,
    results: {
      scoreGain,
      killsEarned,
      explosions,
      particles,
      scoreTexts,
      powerups,
      newCombo
    }
  };
}

/**
 * Check player bullets against boss
 * @param {Object[]} bullets - Player bullets
 * @param {Object} boss - Boss object
 * @param {Object} screenshake - Screenshake ref
 * @returns {{ survivingBullets: Object[], updatedBoss: Object, results: Object }}
 */
export function checkBulletBossCollisions(bullets, boss, screenshake) {
  if (!boss || !boss.alive) {
    return { survivingBullets: bullets, updatedBoss: boss, results: {} };
  }

  const survivingBullets = [];
  let hitCount = 0;
  const particles = [];
  const explosions = [];
  const scoreTexts = [];
  let scoreGain = 0;
  let bossDefeated = false;

  bullets.forEach(b => {
    if (
      aabb(
        { x: b.x, y: b.y, width: b.width, height: b.height },
        { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
      )
    ) {
      hitCount++;
    } else {
      survivingBullets.push(b);
    }
  });

  let updatedBoss = boss;

  if (hitCount > 0) {
    const hitX = boss.x + boss.width / 2;
    const hitY = boss.y + boss.height / 2;
    
    // Add impact sparks for each hit
    for (let i = 0; i < hitCount; i++) {
      particles.push(
        ...spawnImpactEffect(
          hitX + (Math.random() - 0.5) * boss.width * 0.5,
          hitY + (Math.random() - 0.5) * boss.height * 0.5,
          6,
          '#a855f7'
        )
      );
    }

    const nextHp = boss.hp - hitCount;
    
    if (nextHp <= 0) {
      const bossCenterX = boss.x + boss.width / 2;
      const bossCenterY = boss.y + boss.height / 2;
      
      if (screenshake) {
        triggerScreenshake(screenshake, 14, 0.6);
      }
      
      explosions.push(spawnExplosion(bossCenterX, bossCenterY, 80, 0.6, '#a855f7'));
      particles.push(
        ...spawnExplosionParticles(bossCenterX, bossCenterY, 50, 'boss'),
        ...spawnExplosionParticles(bossCenterX, bossCenterY, 30, 'debris')
      );
      
      scoreTexts.push({
        x: bossCenterX,
        y: bossCenterY,
        text: '+1000',
        color: '#fbbf24',
        life: 1.5,
        id: Date.now() + Math.random(),
        isBoss: true
      });
      
      scoreGain = 1000;
      bossDefeated = true;
      updatedBoss = { ...boss, hp: 0, alive: false };
    } else {
      updatedBoss = { ...boss, hp: nextHp };
    }
  }

  return {
    survivingBullets,
    updatedBoss,
    results: {
      hitCount,
      particles,
      explosions,
      scoreTexts,
      scoreGain,
      bossDefeated
    }
  };
}

/**
 * Check enemy bullets against player
 * @param {Object[]} bullets - Enemy bullets
 * @param {Object} player - Player object
 * @param {boolean} isInvulnerable - Player invulnerability state
 * @returns {{ survivingBullets: Object[], playerHit: boolean }}
 */
export function checkEnemyBulletPlayerCollisions(bullets, player, isInvulnerable = false) {
  if (isInvulnerable || !player.alive) {
    return { survivingBullets: bullets, playerHit: false };
  }

  const playerRect = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height
  };

  let playerHit = false;
  const survivingBullets = [];

  bullets.forEach(b => {
    if (!playerHit && aabb(playerRect, b)) {
      playerHit = true;
    } else {
      survivingBullets.push(b);
    }
  });

  return { survivingBullets, playerHit };
}

/**
 * Check powerups against player
 * @param {Object[]} powerups - Powerup objects
 * @param {Object} player - Player object
 * @param {Function} onCollect - Callback when powerup collected
 * @returns {Object[]} Remaining powerups
 */
export function checkPowerupCollisions(powerups, player, onCollect) {
  if (!player.alive) return powerups;

  const playerRect = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height
  };

  const remaining = [];

  powerups.forEach(p => {
    if (aabb(playerRect, { x: p.x, y: p.y, width: p.size, height: p.size })) {
      if (onCollect) onCollect(p.kind);
    } else {
      remaining.push(p);
    }
  });

  return remaining;
}

/**
 * Check enemy-player collisions (for kamikaze enemies)
 * @param {Object[]} enemies - Enemy objects
 * @param {Object} player - Player object
 * @param {boolean} isInvulnerable - Player invulnerability state
 * @returns {{ survivingEnemies: Object[], playerHit: boolean, collidedEnemy: Object|null }}
 */
export function checkEnemyPlayerCollisions(enemies, player, isInvulnerable = false) {
  if (isInvulnerable || !player.alive) {
    return { survivingEnemies: enemies, playerHit: false, collidedEnemy: null };
  }

  const playerRect = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height
  };

  let playerHit = false;
  let collidedEnemy = null;
  const survivingEnemies = [];

  enemies.forEach(e => {
    const enemyRect = { x: e.x, y: e.y, width: e.size, height: e.size };
    if (!playerHit && aabb(playerRect, enemyRect)) {
      playerHit = true;
      collidedEnemy = e;
    } else {
      survivingEnemies.push(e);
    }
  });

  return { survivingEnemies, playerHit, collidedEnemy };
}
