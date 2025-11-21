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

