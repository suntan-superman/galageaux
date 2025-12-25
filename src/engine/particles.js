/**
 * Particle Effects Engine
 * Creates and manages visual particle effects for explosions, impacts, and ambient effects
 * @module engine/particles
 */

/**
 * @typedef {Object} Particle
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} vx - X velocity (pixels/second)
 * @property {number} vy - Y velocity (pixels/second)
 * @property {number} life - Remaining life in seconds
 * @property {number} maxLife - Initial life for alpha calculations
 * @property {number} radius - Current particle radius
 * @property {string} type - Particle type for rendering
 * @property {string} color - Hex color string
 * @property {number} rotation - Current rotation in radians
 * @property {number} rotationSpeed - Rotation speed (radians/second)
 */

/**
 * Color schemes for different particle types
 * @constant {Object.<string, string[]>}
 */
const COLOR_SCHEMES = {
  default: ['#fbbf24', '#fb923c', '#f87171', '#fef3c7'],
  debris: ['#64748b', '#475569', '#94a3b8', '#334155'],
  energy: ['#38bdf8', '#22d3ee', '#818cf8', '#a78bfa'],
  boss: ['#a855f7', '#c026d3', '#ec4899', '#f472b6'],
  powerup: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'],
  fire: ['#ff4500', '#ff6b35', '#ffa500', '#ffd700'],
  electric: ['#00ffff', '#4169e1', '#9370db', '#ffffff'],
};

/**
 * Spawns explosion particles at a location
 * Creates a burst of particles that spread outward and fade
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} [count=12] - Number of main particles
 * @param {string} [particleType='default'] - Type: 'default', 'debris', 'energy', 'boss', 'powerup'
 * @param {string|null} [color=null] - Override color (uses type colors if null)
 * @returns {Particle[]} Array of new particles
 */
export function spawnExplosionParticles(x, y, count = 12, particleType = 'default', color = null) {
  const parts = [];
  
  const colors = color ? [color] : (COLOR_SCHEMES[particleType] || COLOR_SCHEMES.default);
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 120; // Increased speed range
    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.3, // Longer life
      maxLife: 0.5 + Math.random() * 0.3,
      radius: 2.5 + Math.random() * 2.5, // Larger particles
      type: particleType,
      color: particleColor,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }
  
  // Add inner burst of smaller, faster particles
  const burstCount = Math.floor(count / 2);
  for (let i = 0; i < burstCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 100;
    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.3 + Math.random() * 0.2,
      radius: 1 + Math.random() * 1.5,
      type: particleType,
      color: particleColor,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 15
    });
  }
  
  // Add debris chunks for debris type
  if (particleType === 'debris') {
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      parts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 0.7 + Math.random() * 0.4,
        radius: 1.5 + Math.random() * 2,
        type: 'debris',
        color: '#475569',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8
      });
    }
  }
  
  return parts;
}

/**
 * Spawns a large, cinematic explosion with multiple layers
 * Used for boss deaths and large enemies
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {string} [type='boss'] - 'boss', 'large', 'mega'
 * @returns {Object} Contains particles and screen flash data
 */
export function spawnLargeExplosion(x, y, type = 'boss') {
  const parts = [];
  const config = {
    boss: { count: 30, debrisCount: 15, sparkCount: 20, flashIntensity: 0.6 },
    large: { count: 24, debrisCount: 12, sparkCount: 15, flashIntensity: 0.4 },
    mega: { count: 40, debrisCount: 25, sparkCount: 30, flashIntensity: 0.8 },
  }[type] || { count: 20, debrisCount: 10, sparkCount: 15, flashIntensity: 0.5 };
  
  const colors = type === 'boss' ? COLOR_SCHEMES.boss : COLOR_SCHEMES.fire;
  
  // Main explosion ring
  for (let i = 0; i < config.count; i++) {
    const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.3;
    const speed = 120 + Math.random() * 180;
    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.4,
      maxLife: 0.7 + Math.random() * 0.4,
      radius: 4 + Math.random() * 4,
      type: 'explosion',
      color: particleColor,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8,
      glow: true,
    });
  }
  
  // Inner bright burst
  for (let i = 0; i < Math.floor(config.count / 2); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 150;
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.4 + Math.random() * 0.2,
      radius: 2 + Math.random() * 2,
      type: 'spark',
      color: '#ffffff',
      rotation: 0,
      rotationSpeed: 0,
    });
  }
  
  // Debris with physics
  for (let i = 0; i < config.debrisCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 100;
    
    parts.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50, // Initial upward bias
      life: 1.0 + Math.random() * 0.5,
      maxLife: 1.0 + Math.random() * 0.5,
      radius: 2 + Math.random() * 3,
      type: 'debris',
      color: COLOR_SCHEMES.debris[Math.floor(Math.random() * COLOR_SCHEMES.debris.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 12,
      gravity: 200 + Math.random() * 100,
    });
  }
  
  // Sparks shooting outward
  const sparks = spawnSparks(x, y, config.sparkCount);
  parts.push(...sparks);
  
  return {
    particles: parts,
    screenFlash: {
      intensity: config.flashIntensity,
      color: type === 'boss' ? '#a855f7' : '#fbbf24',
      duration: 0.15,
    },
  };
}

/**
 * Updates all particles for one frame
 * Applies velocity, gravity (for debris), rotation, and removes dead particles
 * 
 * @param {Particle[]} particles - Array of particles to update
 * @param {number} dt - Delta time in seconds
 * @returns {Particle[]} Updated array with dead particles removed
 */
export function updateParticles(particles, dt) {
  return particles
    .map(p => {
      const newLife = p.life - dt;
      const alpha = Math.max(0, newLife / p.maxLife);
      const newRotation = (p.rotation || 0) + (p.rotationSpeed || 0) * dt;
      
      // Apply gravity (debris particles have custom gravity, others use type-based)
      const gravity = p.gravity || (p.type === 'debris' ? 100 : 0);
      
      // Apply drag for more natural motion
      const drag = p.type === 'spark' ? 0.98 : 1.0;
      
      return {
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + (p.vy * dt) + (gravity * dt * dt * 0.5),
        vx: p.vx * drag,
        vy: (p.vy + gravity * dt) * drag,
        life: newLife,
        radius: p.radius * Math.sqrt(alpha), // Smoother fade
        rotation: newRotation,
        alpha: alpha, // Store for rendering
      };
    })
    .filter(p => p.life > 0);
}

/**
 * Screen flash effect data
 * @typedef {Object} ScreenFlash
 * @property {number} intensity - Flash intensity 0-1
 * @property {string} color - Flash color
 * @property {number} life - Remaining life
 * @property {number} maxLife - Initial life
 */

/**
 * Creates a screen flash effect
 * @param {string} [color='#ffffff'] - Flash color
 * @param {number} [intensity=0.5] - Maximum intensity
 * @param {number} [duration=0.15] - Duration in seconds
 * @returns {ScreenFlash}
 */
export function createScreenFlash(color = '#ffffff', intensity = 0.5, duration = 0.15) {
  return {
    color,
    intensity,
    life: duration,
    maxLife: duration,
  };
}

/**
 * Updates screen flash effect
 * @param {ScreenFlash|null} flash - Current flash or null
 * @param {number} dt - Delta time
 * @returns {ScreenFlash|null}
 */
export function updateScreenFlash(flash, dt) {
  if (!flash || flash.life <= 0) return null;
  
  return {
    ...flash,
    life: flash.life - dt,
  };
}

/**
 * Gets current screen flash alpha
 * @param {ScreenFlash|null} flash 
 * @returns {number} Alpha value 0-1
 */
export function getScreenFlashAlpha(flash) {
  if (!flash || flash.life <= 0) return 0;
  
  const progress = flash.life / flash.maxLife;
  // Quick fade in, slow fade out
  return flash.intensity * progress;
}

export function spawnExplosion(x, y, radius = 26, life = 0.25, color = '#fbbf24') {
  return {
    x,
    y,
    radius: 0,
    maxRadius: radius,
    life,
    maxLife: life,
    frames: 8,
    color,
    shockwave: true
  };
}

export function updateExplosion(explosion, dt) {
  if (!explosion || explosion.life <= 0) return null;
  
  const progress = 1 - (explosion.life / explosion.maxLife);
  const newLife = explosion.life - dt;
  
  // Exponential expansion for more impact
  const expansionCurve = 1 - Math.pow(1 - progress, 2);
  
  return {
    ...explosion,
    life: newLife,
    radius: explosion.maxRadius * expansionCurve
  };
}

// New trail particle system
export function spawnTrailParticle(x, y, color = '#38bdf8') {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.15,
    maxLife: 0.15,
    radius: 2,
    type: 'trail',
    color
  };
}

// Impact effect for hits
export function spawnImpactEffect(x, y, count = 8, color = '#fbbf24') {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 60 + Math.random() * 40;
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.15,
      maxLife: 0.2 + Math.random() * 0.15,
      radius: 1.5 + Math.random() * 1,
      type: 'impact',
      color
    });
  }
  return parts;
}

// Sparks for critical hits or special effects
export function spawnSparks(x, y, count = 12, direction = null) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    let angle;
    if (direction) {
      // Cone of sparks in specified direction
      angle = direction + (Math.random() - 0.5) * Math.PI * 0.5;
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    
    const speed = 100 + Math.random() * 100;
    
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.3 + Math.random() * 0.2,
      radius: 1 + Math.random() * 1.5,
      type: 'spark',
      color: '#fef3c7'
    });
  }
  return parts;
}
