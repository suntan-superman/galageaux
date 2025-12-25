/**
 * formations.js - Enemy formation layouts and positioning
 * Handles grid, V-shape, and wave formation patterns
 */

/**
 * @typedef {Object} FormationOffset
 * @property {number} dx - X offset from formation center
 * @property {number} dy - Y offset from formation center
 */

/**
 * Get position offsets for a formation type
 * @param {'v'|'line'|'staggered'} type - Formation type
 * @param {number} count - Number of enemies in formation
 * @param {number} [spacing=36] - Spacing between enemies
 * @returns {FormationOffset[]}
 */
export function getFormationOffsets(type, count, spacing = 36) {
  const offsets = [];
  if (type === 'v') {
    const mid = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      const dx = (i - mid) * spacing;
      const dy = Math.abs(i - mid) * 12;
      offsets.push({ dx, dy });
    }
  } else if (type === 'line') {
    const mid = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      const dx = (i - mid) * spacing;
      offsets.push({ dx, dy: 0 });
    }
  } else {
    for (let i = 0; i < count; i++) {
      offsets.push({ dx: (i - count / 2) * spacing, dy: (i % 2) * 16 });
    }
  }
  return offsets;
}

/**
 * @typedef {Object} Formation
 * @property {string} type - Formation type ('grid', 'v', 'wave')
 * @property {Object[]} enemies - Array of enemy position data
 * @property {number} baseX - Formation center X
 * @property {number} baseY - Formation top Y
 * @property {number} spacing - Spacing between units
 * @property {string} behavior - Current behavior state
 */

/**
 * Create a full formation object with enemy positions
 * @param {'grid'|'v'|'wave'} type - Formation type
 * @param {Object} [options] - Configuration options
 * @param {number} [options.width=400] - Screen width
 * @param {number} [options.height=800] - Screen height
 * @param {number} [options.spacing=36] - Unit spacing
 * @param {number} [options.rows] - Grid rows (for grid type)
 * @param {number} [options.cols] - Grid columns (for grid type)
 * @param {number} [options.size] - Formation size (for v type)
 * @param {number} [options.count] - Enemy count (for wave type)
 * @returns {Formation}
 */
export function createFormation(type, options = {}) {
  const { width = 400, height = 800, spacing = 36 } = options;
  
  if (type === 'grid') {
    const { rows = 4, cols = 6 } = options;
    const formation = {
      type: 'grid',
      rows,
      cols,
      enemies: [],
      baseX: width / 2 - (cols - 1) * spacing / 2,
      baseY: 100,
      spacing,
      behavior: 'idle'
    };
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        formation.enemies.push({
          id: `grid-${row}-${col}`,
          row,
          col,
          offsetX: col * spacing - (cols - 1) * spacing / 2,
          offsetY: row * spacing * 0.8,
          baseX: width / 2 + (col * spacing - (cols - 1) * spacing / 2),
          baseY: 100 + row * spacing * 0.8,
          behavior: 'idle'
        });
      }
    }
    return formation;
  }
  
  if (type === 'v') {
    const { size = 5 } = options;
    const formation = {
      type: 'v',
      size,
      enemies: [],
      baseX: width / 2,
      baseY: 100,
      spacing,
      behavior: 'idle'
    };
    
    const mid = Math.floor(size / 2);
    for (let i = 0; i < size; i++) {
      const dx = (i - mid) * spacing;
      const dy = Math.abs(i - mid) * 12;
      formation.enemies.push({
        id: `v-${i}`,
        index: i,
        offsetX: dx,
        offsetY: dy,
        baseX: width / 2 + dx,
        baseY: 100 + dy,
        behavior: 'idle'
      });
    }
    return formation;
  }
  
  if (type === 'wave') {
    const { count = 8 } = options;
    const formation = {
      type: 'wave',
      count,
      enemies: [],
      baseX: width / 2,
      baseY: -50,
      spacing: width / (count + 1),
      behavior: 'wave',
      waveOffset: 0
    };
    
    for (let i = 0; i < count; i++) {
      formation.enemies.push({
        id: `wave-${i}`,
        index: i,
        offsetX: (i - count / 2) * spacing + spacing / 2,
        offsetY: 0,
        baseX: (i + 1) * spacing,
        baseY: -50,
        behavior: 'wave'
      });
    }
    return formation;
  }
  
  if (type === 'circle') {
    const { count = 6, radius = 80 } = options;
    const formation = {
      type: 'circle',
      count,
      radius,
      enemies: [],
      baseX: width / 2,
      baseY: 200,
      behavior: 'circle',
      angle: 0,
      rotationSpeed: 0.5
    };
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      formation.enemies.push({
        id: `circle-${i}`,
        index: i,
        baseAngle: angle,
        offsetX: Math.cos(angle) * radius,
        offsetY: Math.sin(angle) * radius,
        behavior: 'circle'
      });
    }
    return formation;
  }
  
  return null;
}

export function updateFormation(formation, dt, width, height) {
  if (!formation) return formation;
  
  if (formation.type === 'wave') {
    formation.waveOffset += dt * 2;
    formation.enemies.forEach((enemy, idx) => {
      const waveX = enemy.baseX + Math.sin(formation.waveOffset + idx * 0.5) * 40;
      const waveY = enemy.baseY + dt * 100;
      enemy.x = waveX;
      enemy.y = waveY;
    });
  } else if (formation.type === 'circle') {
    formation.angle += dt * formation.rotationSpeed;
    formation.enemies.forEach(enemy => {
      const angle = enemy.baseAngle + formation.angle;
      enemy.x = formation.baseX + Math.cos(angle) * formation.radius;
      enemy.y = formation.baseY + Math.sin(angle) * formation.radius;
    });
  } else if (formation.type === 'grid' || formation.type === 'v') {
    formation.enemies.forEach(enemy => {
      enemy.x = enemy.baseX;
      enemy.y = enemy.baseY;
    });
  }
  
  return formation;
}
