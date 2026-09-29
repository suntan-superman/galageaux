import { BULLET_WIDTH, BULLET_HEIGHT } from '../entities/types';
import { POWERUP_TYPES } from './powerups';

/**
 * Player shots use the same screen-space velocity convention as enemy shots:
 * +X is right and +Y is down. The retained speed is the velocity magnitude.
 */
export function createPlayerBullets(player) {
  const centerX = player.x + player.width / 2;
  const create = (offset, speed, angle = 0) => ({
    x: centerX + offset - BULLET_WIDTH / 2,
    y: player.y - BULLET_HEIGHT,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    speed,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed
  });

  if (player.weaponType === POWERUP_TYPES.SPREAD_SHOT) {
    // The old spread traveled around 370 units/s; retain that pace while
    // giving the existing five shots a restrained +/-11.5-degree fan.
    return [-0.2, -0.1, 0, 0.1, 0.2]
      .map(angle => create(Math.sin(angle) * 20, 370, angle));
  }
  if (player.weaponLevel === 1) return [create(0, 420)];
  if (player.weaponLevel === 2 || player.weaponType === POWERUP_TYPES.DOUBLE_SHOT) {
    return [create(-8, 430), create(8, 430)];
  }
  return [create(0, 440), create(-10, 430), create(10, 430)];
}
