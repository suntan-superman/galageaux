/**
 * Input Abstraction Layer for Galageaux
 * 
 * Provides a unified input interface that supports:
 * - Touch/tilt controls (mobile)
 * - Keyboard controls (web/desktop)
 * - Gamepad controls (future)
 * - Mouse controls (web/desktop)
 * 
 * @module engine/input
 */

import { Dimensions, Platform } from 'react-native';

// ============================================================================
// INPUT STATE TYPES
// ============================================================================

/**
 * Normalized input state structure
 * @typedef {Object} InputState
 * @property {number} moveX - Horizontal movement (-1 to 1)
 * @property {number} moveY - Vertical movement (-1 to 1)
 * @property {boolean} fire - Fire button pressed
 * @property {boolean} pause - Pause button pressed
 * @property {boolean} confirm - Confirm/select action
 * @property {boolean} cancel - Cancel/back action
 */

/**
 * Input source type
 * @typedef {'touch'|'tilt'|'keyboard'|'gamepad'|'mouse'} InputSource
 */

// ============================================================================
// INPUT CONSTANTS
// ============================================================================

/**
 * Keyboard key mappings
 */
const KEY_BINDINGS = {
  // Movement - WASD
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  
  // Actions
  fire: ['Space', 'KeyZ', 'KeyJ'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space'],
  cancel: ['Escape', 'Backspace'],
};

/**
 * Gamepad button mappings (standard gamepad)
 */
const GAMEPAD_BINDINGS = {
  fire: [0], // A/X button
  pause: [9], // Start button
  confirm: [0], // A/X button
  cancel: [1], // B/O button
};

/**
 * Dead zone for analog inputs
 */
const ANALOG_DEAD_ZONE = 0.15;

/**
 * Tilt sensitivity range
 */
const TILT_SENSITIVITY = {
  min: 0.2,
  max: 1.5,
  default: 0.7,
};

// ============================================================================
// INPUT MANAGER
// ============================================================================

/**
 * Creates an input manager instance
 * @param {Object} options - Configuration options
 * @returns {Object} Input manager interface
 */
export function createInputManager(options = {}) {
  // Current input state
  const state = {
    moveX: 0,
    moveY: 0,
    fire: false,
    pause: false,
    confirm: false,
    cancel: false,
  };

  // Previous frame state (for edge detection)
  const prevState = { ...state };

  // Keyboard state
  const keysPressed = new Set();

  // Tilt state
  let tiltX = 0;
  let tiltY = 0;
  let tiltEnabled = options.tiltEnabled ?? true;
  let tiltSensitivity = options.tiltSensitivity ?? TILT_SENSITIVITY.default;

  // Touch state
  let touchX = 0;
  let touchY = 0;
  let touchActive = false;
  let autoFireEnabled = options.autoFireEnabled ?? true;

  // Active input source
  let activeSource = Platform.OS === 'web' ? 'keyboard' : 'tilt';

  // Event listeners (for cleanup)
  const listeners = [];

  // ========================================================================
  // KEYBOARD INPUT
  // ========================================================================

  /**
   * Handle keyboard key down
   * @param {KeyboardEvent} event 
   */
  function handleKeyDown(event) {
    keysPressed.add(event.code);
    activeSource = 'keyboard';
  }

  /**
   * Handle keyboard key up
   * @param {KeyboardEvent} event 
   */
  function handleKeyUp(event) {
    keysPressed.delete(event.code);
  }

  /**
   * Check if any key in binding is pressed
   * @param {string[]} keys - Array of key codes
   * @returns {boolean}
   */
  function isKeyPressed(keys) {
    return keys.some(key => keysPressed.has(key));
  }

  /**
   * Process keyboard input into normalized state
   */
  function processKeyboardInput() {
    let kbMoveX = 0;
    let kbMoveY = 0;

    if (isKeyPressed(KEY_BINDINGS.moveLeft)) kbMoveX -= 1;
    if (isKeyPressed(KEY_BINDINGS.moveRight)) kbMoveX += 1;
    if (isKeyPressed(KEY_BINDINGS.moveUp)) kbMoveY -= 1;
    if (isKeyPressed(KEY_BINDINGS.moveDown)) kbMoveY += 1;

    // Normalize diagonal movement
    if (kbMoveX !== 0 && kbMoveY !== 0) {
      const magnitude = Math.sqrt(kbMoveX * kbMoveX + kbMoveY * kbMoveY);
      kbMoveX /= magnitude;
      kbMoveY /= magnitude;
    }

    return {
      moveX: kbMoveX,
      moveY: kbMoveY,
      fire: isKeyPressed(KEY_BINDINGS.fire),
      pause: isKeyPressed(KEY_BINDINGS.pause),
      confirm: isKeyPressed(KEY_BINDINGS.confirm),
      cancel: isKeyPressed(KEY_BINDINGS.cancel),
    };
  }

  // ========================================================================
  // GAMEPAD INPUT
  // ========================================================================

  /**
   * Process gamepad input into normalized state
   * @returns {Object|null} Gamepad input state or null if no gamepad
   */
  function processGamepadInput() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return null;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad

    if (!gamepad) return null;

    activeSource = 'gamepad';

    // Process analog sticks
    let gpMoveX = gamepad.axes[0] || 0; // Left stick X
    let gpMoveY = gamepad.axes[1] || 0; // Left stick Y

    // Apply dead zone
    if (Math.abs(gpMoveX) < ANALOG_DEAD_ZONE) gpMoveX = 0;
    if (Math.abs(gpMoveY) < ANALOG_DEAD_ZONE) gpMoveY = 0;

    // Check D-pad (axes 6,7 or buttons 12-15)
    if (gamepad.buttons[14]?.pressed) gpMoveX = -1; // Left
    if (gamepad.buttons[15]?.pressed) gpMoveX = 1;  // Right
    if (gamepad.buttons[12]?.pressed) gpMoveY = -1; // Up
    if (gamepad.buttons[13]?.pressed) gpMoveY = 1;  // Down

    // Process buttons
    const isButtonPressed = (indices) => 
      indices.some(i => gamepad.buttons[i]?.pressed);

    return {
      moveX: gpMoveX,
      moveY: gpMoveY,
      fire: isButtonPressed(GAMEPAD_BINDINGS.fire),
      pause: isButtonPressed(GAMEPAD_BINDINGS.pause),
      confirm: isButtonPressed(GAMEPAD_BINDINGS.confirm),
      cancel: isButtonPressed(GAMEPAD_BINDINGS.cancel),
    };
  }

  // ========================================================================
  // TILT INPUT
  // ========================================================================

  /**
   * Update tilt values from device motion
   * @param {Object} motion - Device motion data { x, y, z }
   */
  function updateTilt(motion) {
    if (!tiltEnabled) return;

    activeSource = 'tilt';
    
    // motion.x and motion.y are typically in radians
    // Normalize to -1 to 1 range with sensitivity
    tiltX = Math.max(-1, Math.min(1, motion.x * tiltSensitivity));
    tiltY = Math.max(-1, Math.min(1, motion.y * tiltSensitivity));
  }

  /**
   * Process tilt input into normalized state
   */
  function processTiltInput() {
    return {
      moveX: tiltX,
      moveY: tiltY,
      fire: autoFireEnabled, // Auto-fire when using tilt
      pause: false,
      confirm: false,
      cancel: false,
    };
  }

  // ========================================================================
  // TOUCH INPUT
  // ========================================================================

  /**
   * Update touch position
   * @param {Object} touch - Touch position { x, y }
   * @param {boolean} active - Whether touch is active
   */
  function updateTouch(touch, active) {
    touchX = touch?.x ?? 0;
    touchY = touch?.y ?? 0;
    touchActive = active;

    if (active) {
      activeSource = 'touch';
    }
  }

  /**
   * Process touch input into normalized state
   * @param {Object} screenDimensions - { width, height }
   * @param {Object} playerPosition - Current player position { x, y }
   */
  function processTouchInput(screenDimensions, playerPosition) {
    if (!touchActive) {
      return {
        moveX: 0,
        moveY: 0,
        fire: false,
        pause: false,
        confirm: false,
        cancel: false,
      };
    }

    // Calculate direction to touch point
    const dx = touchX - (playerPosition?.x ?? screenDimensions.width / 2);
    const dy = touchY - (playerPosition?.y ?? screenDimensions.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize
    let moveX = 0;
    let moveY = 0;
    if (distance > 10) { // Dead zone
      moveX = dx / distance;
      moveY = dy / distance;
    }

    return {
      moveX,
      moveY,
      fire: autoFireEnabled && touchActive,
      pause: false,
      confirm: touchActive,
      cancel: false,
    };
  }

  // ========================================================================
  // MAIN UPDATE LOOP
  // ========================================================================

  /**
   * Update input state (call once per frame)
   * @param {Object} context - Update context
   * @returns {InputState} Current input state
   */
  function update(context = {}) {
    // Save previous state for edge detection
    Object.assign(prevState, state);

    // Get input from all sources
    const inputs = [];

    // Keyboard (web/desktop)
    if (Platform.OS === 'web') {
      inputs.push(processKeyboardInput());
    }

    // Gamepad
    const gamepadInput = processGamepadInput();
    if (gamepadInput) {
      inputs.push(gamepadInput);
    }

    // Tilt (mobile)
    if (tiltEnabled && Platform.OS !== 'web') {
      inputs.push(processTiltInput());
    }

    // Touch (mobile)
    if (touchActive) {
      inputs.push(processTouchInput(
        context.screenDimensions || Dimensions.get('window'),
        context.playerPosition
      ));
    }

    // Combine inputs (use the most significant value for each axis)
    state.moveX = 0;
    state.moveY = 0;
    state.fire = false;
    state.pause = false;
    state.confirm = false;
    state.cancel = false;

    for (const input of inputs) {
      if (Math.abs(input.moveX) > Math.abs(state.moveX)) {
        state.moveX = input.moveX;
      }
      if (Math.abs(input.moveY) > Math.abs(state.moveY)) {
        state.moveY = input.moveY;
      }
      state.fire = state.fire || input.fire;
      state.pause = state.pause || input.pause;
      state.confirm = state.confirm || input.confirm;
      state.cancel = state.cancel || input.cancel;
    }

    return { ...state };
  }

  /**
   * Check if action was just pressed (edge detection)
   * @param {string} action - Action name (fire, pause, confirm, cancel)
   * @returns {boolean} True if action was just pressed this frame
   */
  function justPressed(action) {
    return state[action] && !prevState[action];
  }

  /**
   * Check if action was just released
   * @param {string} action - Action name
   * @returns {boolean} True if action was just released this frame
   */
  function justReleased(action) {
    return !state[action] && prevState[action];
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  /**
   * Set tilt sensitivity
   * @param {number} sensitivity - Sensitivity value (0.2 to 1.5)
   */
  function setTiltSensitivity(sensitivity) {
    tiltSensitivity = Math.max(
      TILT_SENSITIVITY.min,
      Math.min(TILT_SENSITIVITY.max, sensitivity)
    );
  }

  /**
   * Enable or disable tilt controls
   * @param {boolean} enabled 
   */
  function setTiltEnabled(enabled) {
    tiltEnabled = enabled;
    if (!enabled) {
      tiltX = 0;
      tiltY = 0;
    }
  }

  /**
   * Enable or disable auto-fire
   * @param {boolean} enabled 
   */
  function setAutoFire(enabled) {
    autoFireEnabled = enabled;
  }

  /**
   * Get current active input source
   * @returns {InputSource}
   */
  function getActiveSource() {
    return activeSource;
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Initialize input listeners (call on mount)
   */
  function initialize() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      listeners.push(
        () => window.removeEventListener('keydown', handleKeyDown),
        () => window.removeEventListener('keyup', handleKeyUp)
      );
    }
  }

  /**
   * Clean up input listeners (call on unmount)
   */
  function destroy() {
    listeners.forEach(cleanup => cleanup());
    listeners.length = 0;
    keysPressed.clear();
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  return {
    // Core
    update,
    getState: () => ({ ...state }),
    
    // Edge detection
    justPressed,
    justReleased,
    
    // Input source updates
    updateTilt,
    updateTouch,
    
    // Configuration
    setTiltSensitivity,
    setTiltEnabled,
    setAutoFire,
    getActiveSource,
    
    // Lifecycle
    initialize,
    destroy,
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global input manager instance
 */
let globalInputManager = null;

/**
 * Get or create the global input manager
 * @param {Object} options - Configuration options (only used on first call)
 * @returns {Object} Input manager instance
 */
export function getInputManager(options = {}) {
  if (!globalInputManager) {
    globalInputManager = createInputManager(options);
  }
  return globalInputManager;
}

/**
 * Reset the global input manager (useful for testing)
 */
export function resetInputManager() {
  if (globalInputManager) {
    globalInputManager.destroy();
    globalInputManager = null;
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for input management
 * @param {Object} options - Configuration options
 * @returns {Object} Input manager and state
 */
export function useInput(options = {}) {
  // Note: This is a basic hook structure. In actual usage, you'd want to:
  // 1. Use useEffect to initialize/destroy the input manager
  // 2. Use useState or useRef for the input state
  // 3. Call update() in the game loop, not in a React effect
  
  const inputManager = getInputManager(options);
  
  return {
    inputManager,
    update: inputManager.update,
    updateTilt: inputManager.updateTilt,
    updateTouch: inputManager.updateTouch,
    getState: inputManager.getState,
    justPressed: inputManager.justPressed,
    justReleased: inputManager.justReleased,
  };
}

export default {
  createInputManager,
  getInputManager,
  resetInputManager,
  useInput,
  KEY_BINDINGS,
  GAMEPAD_BINDINGS,
  ANALOG_DEAD_ZONE,
  TILT_SENSITIVITY,
};
