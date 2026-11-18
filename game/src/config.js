// Tuning for Emberkeep: one place for every number the game balances on.
// The field is 960 by 600 logical pixels; the canvas scales to the window.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberkeep.best';

export const PLAYER = {
  radius: 14,
  speed: 255,
  startX: FIELD.width / 2,
  startY: FIELD.height / 2,
  hearts: 3,
  invulnerableSeconds: 1.5,
};

export const LIGHT = {
  max: 100,
  drainPerSecond: 1.1,
  pulseCost: 18,
  emberRestore: 22,
  regenPerSecond: 0.6,
  minRadius: 95,
  maxRadius: 195,
  pulseRadius: 155,
  pulseCooldown: 0.45,
};

export const WISP = {
  radius: 15,
  baseSpeed: 52,
  speedPerWave: 6,
  dartSpeedMultiplier: 1.65,
  dartChance: 0.25,
  dartFromWave: 3,
  wobble: 0.9,
};

export const EMBER = {
  radius: 9,
  collectRadius: 28,
  score: 25,
  spawnEverySeconds: 2.4,
  maxOnField: 6,
};

export const WAVE = {
  baseCount: 5,
  perWave: 3,
  spawnIntervalStart: 1.3,
  spawnIntervalPerWave: 0.07,
  spawnIntervalMin: 0.45,
  clearBonusPerWave: 100,
  bannerSeconds: 2.2,
};

export const COMBO = {
  windowSeconds: 3.5,
  maxMultiplier: 5,
};

export const SCORE = {
  kill: 10,
};
