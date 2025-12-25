/**
 * swoops.js - Enemy Swoop Attack Patterns
 * 
 * Manages enemy dive attacks where enemies leave formation
 * and follow curved paths toward the player before returning.
 * 
 * @module swoops
 */

/**
 * @typedef {'straight'|'arc-left'|'arc-right'|'corkscrew'} SwoopPattern
 */

/**
 * @typedef {Object} SwoopState
 * @property {boolean} active - Whether swoop is in progress
 * @property {SwoopPattern|null} pattern - Current swoop pattern
 * @property {number} time - Elapsed time in seconds
 * @property {number} duration - Total swoop duration
 * @property {number} startX - Starting X position
 * @property {number} startY - Starting Y position
 * @property {number} targetX - Target X (usually bottom of screen)
 * @property {number} targetY - Target Y
 * @property {number} returnX - Formation X to return to
 * @property {number} returnY - Formation Y to return to
 */

/**
 * Create a new swoop state object
 * @returns {SwoopState} Initial swoop state
 */
export function createSwoopState() {
  return {
    active: false,
    pattern: null,
    time: 0,
    duration: 0,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
    returnX: 0,
    returnY: 0
  };
}

/**
 * Start a swoop attack for an enemy
 * @param {Object} enemy - Enemy starting the swoop
 * @param {SwoopPattern} patternType - Type of swoop pattern
 * @param {number} [targetX] - Target X (defaults to center)
 * @param {number} [targetY] - Target Y (defaults to below screen)
 * @param {number} screenWidth - Screen width for calculations
 * @param {number} screenHeight - Screen height for calculations
 * @returns {SwoopState} Configured swoop state
 */
export function startSwoop(enemy, patternType, targetX, targetY, screenWidth, screenHeight) {
  const swoop = createSwoopState();
  swoop.active = true;
  swoop.pattern = patternType;
  swoop.startX = enemy.x;
  swoop.startY = enemy.y;
  swoop.returnX = enemy.baseX;
  swoop.returnY = enemy.baseY;
  
  if (patternType === 'straight') {
    swoop.targetX = targetX || screenWidth / 2;
    swoop.targetY = targetY || screenHeight + 50;
    swoop.duration = 1.5;
  } else if (patternType === 'arc-left') {
    swoop.targetX = -50;
    swoop.targetY = screenHeight + 50;
    swoop.duration = 2.0;
  } else if (patternType === 'arc-right') {
    swoop.targetX = screenWidth + 50;
    swoop.targetY = screenHeight + 50;
    swoop.duration = 2.0;
  } else if (patternType === 'corkscrew') {
    swoop.targetX = screenWidth / 2;
    swoop.targetY = screenHeight + 50;
    swoop.duration = 2.5;
  }
  
  return swoop;
}

/**
 * Update swoop position based on pattern and elapsed time
 * @param {Object} enemy - Enemy being updated
 * @param {SwoopState} swoopState - Current swoop state
 * @param {number} dt - Delta time in seconds
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Updated enemy with new position and behavior
 */
export function updateSwoop(enemy, swoopState, dt, screenWidth, screenHeight) {
  if (!swoopState || !swoopState.active) {
    return { ...enemy, behavior: enemy.behavior || 'idle' };
  }
  
  swoopState.time += dt;
  const progress = Math.min(swoopState.time / swoopState.duration, 1);
  
  let newX = enemy.x;
  let newY = enemy.y;
  let behavior = 'swoop';
  
  if (swoopState.pattern === 'straight') {
    newX = swoopState.startX + (swoopState.targetX - swoopState.startX) * progress;
    newY = swoopState.startY + (swoopState.targetY - swoopState.startY) * progress;
    
    if (progress >= 1) {
      behavior = 'return';
      newX = swoopState.returnX + (swoopState.startX - swoopState.returnX) * (progress - 1) * 2;
      newY = swoopState.returnY + (swoopState.startY - swoopState.returnY) * (progress - 1) * 2;
      
      if (progress >= 1.5) {
        swoopState.active = false;
        behavior = 'idle';
        newX = swoopState.returnX;
        newY = swoopState.returnY;
      }
    }
  } else if (swoopState.pattern === 'arc-left') {
    const t = progress;
    const controlX = swoopState.startX - 100;
    const controlY = (swoopState.startY + swoopState.targetY) / 2;
    
    if (t < 0.5) {
      newX = swoopState.startX + (controlX - swoopState.startX) * (t * 2);
      newY = swoopState.startY + (controlY - swoopState.startY) * (t * 2);
    } else {
      const t2 = (t - 0.5) * 2;
      newX = controlX + (swoopState.targetX - controlX) * t2;
      newY = controlY + (swoopState.targetY - controlY) * t2;
    }
    
    if (progress >= 1) {
      behavior = 'return';
      const returnProgress = (progress - 1) * 2;
      if (returnProgress >= 1) {
        swoopState.active = false;
        behavior = 'idle';
        newX = swoopState.returnX;
        newY = swoopState.returnY;
      } else {
        newX = swoopState.targetX + (swoopState.returnX - swoopState.targetX) * returnProgress;
        newY = swoopState.targetY + (swoopState.returnY - swoopState.targetY) * returnProgress;
      }
    }
  } else if (swoopState.pattern === 'arc-right') {
    const t = progress;
    const controlX = swoopState.startX + 100;
    const controlY = (swoopState.startY + swoopState.targetY) / 2;
    
    if (t < 0.5) {
      newX = swoopState.startX + (controlX - swoopState.startX) * (t * 2);
      newY = swoopState.startY + (controlY - swoopState.startY) * (t * 2);
    } else {
      const t2 = (t - 0.5) * 2;
      newX = controlX + (swoopState.targetX - controlX) * t2;
      newY = controlY + (swoopState.targetY - controlY) * t2;
    }
    
    if (progress >= 1) {
      behavior = 'return';
      const returnProgress = (progress - 1) * 2;
      if (returnProgress >= 1) {
        swoopState.active = false;
        behavior = 'idle';
        newX = swoopState.returnX;
        newY = swoopState.returnY;
      } else {
        newX = swoopState.targetX + (swoopState.returnX - swoopState.targetX) * returnProgress;
        newY = swoopState.targetY + (swoopState.returnY - swoopState.targetY) * returnProgress;
      }
    }
  } else if (swoopState.pattern === 'corkscrew') {
    const t = progress;
    const radius = 60;
    const turns = 2;
    const angle = t * Math.PI * 2 * turns;
    const centerX = swoopState.startX + (swoopState.targetX - swoopState.startX) * t;
    const centerY = swoopState.startY + (swoopState.targetY - swoopState.startY) * t;
    
    newX = centerX + Math.cos(angle) * radius * (1 - t);
    newY = centerY + Math.sin(angle) * radius * (1 - t);
    
    if (progress >= 1) {
      behavior = 'return';
      const returnProgress = (progress - 1) * 2;
      if (returnProgress >= 1) {
        swoopState.active = false;
        behavior = 'idle';
        newX = swoopState.returnX;
        newY = swoopState.returnY;
      } else {
        newX = swoopState.targetX + (swoopState.returnX - swoopState.targetX) * returnProgress;
        newY = swoopState.targetY + (swoopState.returnY - swoopState.targetY) * returnProgress;
      }
    }
  }
  
  return {
    ...enemy,
    x: newX,
    y: newY,
    behavior
  };
}

