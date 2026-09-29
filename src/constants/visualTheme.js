/** Presentation only. Never import these controls into movement, damage or timing rules. */
export const PALETTE = Object.freeze({
  player: '#67e8f9', playerDeep: '#087ca7', friendly: '#67e8f9', core: '#f1fcff',
  hostile: '#ff783d', hostileEdge: '#d93835', boss: '#bd86d9', shield: '#71e5d1',
  bonus: '#e8bd62', damage: '#ff725e', metal: '#182c43',
});

// Independent reduction points for a future accessibility setting. Zero motion
// removes banking; zero shake removes camera displacement, never physical motion.
export const EFFECTS = Object.freeze({ motion: 1, glow: 1, impact: 1, shake: 1, background: 1 });
export const PRESENTATION = Object.freeze({
  maxStep: 0.1, damageFlashSeconds: 0.14, damageTintOpacity: 0.14,
  cameraScale: 0.45, healthTrailSeconds: 0.12,
});
