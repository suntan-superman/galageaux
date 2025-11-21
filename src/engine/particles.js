export function spawnExplosionParticles(x, y, count = 12, particleType = 'default') {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 80;
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.4 + Math.random() * 0.2,
      radius: 2 + Math.random() * 2,
      type: particleType,
      color: particleType === 'debris' ? '#64748b' : 'rgba(248,250,252,0.8)'
    });
  }
  
  if (particleType === 'debris') {
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      parts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.6 + Math.random() * 0.3,
        radius: 1.5 + Math.random() * 1.5,
        type: 'debris',
        color: '#475569'
      });
    }
  }
  
  return parts;
}

export function updateParticles(particles, dt) {
  return particles
    .map(p => {
      const newLife = p.life - dt;
      const alpha = Math.max(0, newLife / p.maxLife);
      return {
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        life: newLife,
        radius: p.radius * alpha
      };
    })
    .filter(p => p.life > 0);
}

export function spawnExplosion(x, y, radius = 26, life = 0.25) {
  return {
    x,
    y,
    radius: 0,
    maxRadius: radius,
    life,
    maxLife: life,
    frames: 8
  };
}

export function updateExplosion(explosion, dt) {
  if (!explosion || explosion.life <= 0) return null;
  
  const progress = 1 - (explosion.life / explosion.maxLife);
  const newLife = explosion.life - dt;
  
  return {
    ...explosion,
    life: newLife,
    radius: explosion.maxRadius * (1 - progress * progress)
  };
}
