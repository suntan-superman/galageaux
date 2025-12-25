/**
 * Configuration Validator
 * Validates game configuration files to catch errors at startup
 */

const WAVE_SCHEMA = {
  required: ['name', 'spawnInterval', 'maxEnemies', 'enemySpeed', 'enemyBulletSpeed', 'patterns', 'enemyTypes'],
  types: {
    name: 'string',
    spawnInterval: 'number',
    maxEnemies: 'number',
    enemySpeed: 'number',
    enemyBulletSpeed: 'number',
    patterns: 'array',
    enemyTypes: 'array'
  },
  ranges: {
    spawnInterval: { min: 0.1, max: 10 },
    maxEnemies: { min: 1, max: 1000 },
    enemySpeed: { min: 10, max: 1000 },
    enemyBulletSpeed: { min: 50, max: 1000 }
  }
};

const BOSS_SCHEMA = {
  required: ['hp', 'enterY', 'speed', 'bulletSpeed', 'phases'],
  types: {
    hp: 'number',
    enterY: 'number',
    speed: 'number',
    bulletSpeed: 'number',
    phases: 'array'
  },
  ranges: {
    hp: { min: 1, max: 10000 },
    enterY: { min: 0, max: 500 },
    speed: { min: 1, max: 500 },
    bulletSpeed: { min: 50, max: 1000 }
  }
};

const BOSS_PHASE_SCHEMA = {
  required: ['hpThreshold', 'pattern'],
  types: {
    hpThreshold: 'number',
    pattern: 'string'
  },
  validPatterns: ['radial', 'spread', 'burst', 'spiral', 'aimed']
};

const ENEMY_SCHEMA = {
  required: ['hp', 'speed', 'points', 'size', 'color'],
  types: {
    hp: 'number',
    speed: 'number',
    points: 'number',
    size: 'number',
    color: 'string'
  },
  ranges: {
    hp: { min: 1, max: 100 },
    speed: { min: 0.1, max: 10 },
    points: { min: 1, max: 10000 },
    size: { min: 5, max: 100 }
  }
};

class ValidationError extends Error {
  constructor(configName, path, message) {
    super(`[${configName}] ${path}: ${message}`);
    this.name = 'ValidationError';
    this.configName = configName;
    this.path = path;
  }
}

function validateType(value, expectedType, path, configName) {
  if (expectedType === 'array') {
    if (!Array.isArray(value)) {
      throw new ValidationError(configName, path, `Expected array, got ${typeof value}`);
    }
  } else if (typeof value !== expectedType) {
    throw new ValidationError(configName, path, `Expected ${expectedType}, got ${typeof value}`);
  }
}

function validateRange(value, range, path, configName) {
  if (range.min !== undefined && value < range.min) {
    throw new ValidationError(configName, path, `Value ${value} is below minimum ${range.min}`);
  }
  if (range.max !== undefined && value > range.max) {
    throw new ValidationError(configName, path, `Value ${value} exceeds maximum ${range.max}`);
  }
}

function validateObject(obj, schema, path, configName) {
  // Check required fields
  for (const field of schema.required) {
    if (obj[field] === undefined) {
      throw new ValidationError(configName, `${path}.${field}`, 'Required field is missing');
    }
  }

  // Check types
  for (const [field, expectedType] of Object.entries(schema.types)) {
    if (obj[field] !== undefined) {
      validateType(obj[field], expectedType, `${path}.${field}`, configName);
    }
  }

  // Check ranges
  if (schema.ranges) {
    for (const [field, range] of Object.entries(schema.ranges)) {
      if (obj[field] !== undefined && typeof obj[field] === 'number') {
        validateRange(obj[field], range, `${path}.${field}`, configName);
      }
    }
  }
}

export function validateWavesConfig(wavesConfig) {
  const errors = [];
  
  if (!wavesConfig || typeof wavesConfig !== 'object') {
    errors.push(new ValidationError('waves.json', 'root', 'Config must be an object'));
    return { valid: false, errors };
  }

  const stages = Object.keys(wavesConfig);
  if (stages.length === 0) {
    errors.push(new ValidationError('waves.json', 'root', 'Config must have at least one stage'));
    return { valid: false, errors };
  }

  for (const [stageName, stageConfig] of Object.entries(wavesConfig)) {
    try {
      validateObject(stageConfig, WAVE_SCHEMA, stageName, 'waves.json');
      
      // Validate array contents
      if (stageConfig.patterns && stageConfig.patterns.length === 0) {
        errors.push(new ValidationError('waves.json', `${stageName}.patterns`, 'Patterns array cannot be empty'));
      }
      if (stageConfig.enemyTypes && stageConfig.enemyTypes.length === 0) {
        errors.push(new ValidationError('waves.json', `${stageName}.enemyTypes`, 'Enemy types array cannot be empty'));
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateBossConfig(bossConfig) {
  const errors = [];
  
  if (!bossConfig || typeof bossConfig !== 'object') {
    errors.push(new ValidationError('boss.json', 'root', 'Config must be an object'));
    return { valid: false, errors };
  }

  for (const [stageName, stageConfig] of Object.entries(bossConfig)) {
    try {
      validateObject(stageConfig, BOSS_SCHEMA, stageName, 'boss.json');
      
      // Validate phases
      if (stageConfig.phases) {
        if (stageConfig.phases.length === 0) {
          errors.push(new ValidationError('boss.json', `${stageName}.phases`, 'Boss must have at least one phase'));
        }
        
        stageConfig.phases.forEach((phase, idx) => {
          try {
            validateObject(phase, BOSS_PHASE_SCHEMA, `${stageName}.phases[${idx}]`, 'boss.json');
            
            // Validate pattern is known
            if (phase.pattern && !BOSS_PHASE_SCHEMA.validPatterns.includes(phase.pattern)) {
              errors.push(new ValidationError(
                'boss.json',
                `${stageName}.phases[${idx}].pattern`,
                `Unknown pattern "${phase.pattern}". Valid: ${BOSS_PHASE_SCHEMA.validPatterns.join(', ')}`
              ));
            }
          } catch (e) {
            if (e instanceof ValidationError) {
              errors.push(e);
            } else {
              throw e;
            }
          }
        });
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateEnemiesConfig(enemiesConfig) {
  const errors = [];
  
  if (!enemiesConfig || typeof enemiesConfig !== 'object') {
    errors.push(new ValidationError('enemies.json', 'root', 'Config must be an object'));
    return { valid: false, errors };
  }

  const enemyTypes = Object.keys(enemiesConfig);
  if (enemyTypes.length === 0) {
    errors.push(new ValidationError('enemies.json', 'root', 'Config must have at least one enemy type'));
    return { valid: false, errors };
  }

  for (const [enemyType, enemyConfig] of Object.entries(enemiesConfig)) {
    try {
      validateObject(enemyConfig, ENEMY_SCHEMA, enemyType, 'enemies.json');
      
      // Validate color format
      if (enemyConfig.color && !/^#[0-9A-Fa-f]{6}$/.test(enemyConfig.color)) {
        errors.push(new ValidationError(
          'enemies.json',
          `${enemyType}.color`,
          `Invalid color format "${enemyConfig.color}". Expected hex color like #ff0000`
        ));
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates all game configuration files
 * @returns {Object} { valid: boolean, errors: ValidationError[] }
 */
export function validateAllConfigs() {
  const allErrors = [];
  
  try {
    const wavesConfig = require('../config/waves.json');
    const wavesResult = validateWavesConfig(wavesConfig);
    allErrors.push(...wavesResult.errors);
  } catch (e) {
    allErrors.push(new ValidationError('waves.json', 'root', `Failed to load: ${e.message}`));
  }
  
  try {
    const bossConfig = require('../config/boss.json');
    const bossResult = validateBossConfig(bossConfig);
    allErrors.push(...bossResult.errors);
  } catch (e) {
    allErrors.push(new ValidationError('boss.json', 'root', `Failed to load: ${e.message}`));
  }
  
  try {
    const enemiesConfig = require('../config/enemies.json');
    const enemiesResult = validateEnemiesConfig(enemiesConfig);
    allErrors.push(...enemiesResult.errors);
  } catch (e) {
    allErrors.push(new ValidationError('enemies.json', 'root', `Failed to load: ${e.message}`));
  }
  
  if (allErrors.length > 0) {
    console.warn('⚠️ Configuration validation errors:');
    allErrors.forEach(e => console.warn(`  - ${e.message}`));
  } else {
    console.log('✅ All game configurations validated successfully');
  }
  
  return { valid: allErrors.length === 0, errors: allErrors };
}

export default {
  validateWavesConfig,
  validateBossConfig,
  validateEnemiesConfig,
  validateAllConfigs
};
