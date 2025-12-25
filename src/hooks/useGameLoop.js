/**
 * useGameLoop - Custom hook for managing the game loop
 * 
 * Encapsulates the requestAnimationFrame loop, delta time calculation,
 * and provides a clean interface for the game's step function.
 * 
 * @module useGameLoop
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * @typedef {Object} GameLoopOptions
 * @property {boolean} isPaused - Whether the game is paused
 * @property {boolean} gameOver - Whether the game has ended
 * @property {boolean} playerAlive - Whether the player is alive
 * @property {Function} onStep - Callback function called each frame with delta time
 */

/**
 * Custom hook for managing the game loop
 * Handles requestAnimationFrame, delta time, and pause state
 * 
 * @param {GameLoopOptions} options - Game loop configuration
 * @returns {Object} Game loop controls
 */
export default function useGameLoop({ 
  isPaused = false, 
  gameOver = false, 
  playerAlive = true,
  onStep 
}) {
  const lastTimeRef = useRef(Date.now());
  const frameIdRef = useRef(null);
  const isRunningRef = useRef(false);
  
  // Track cumulative stats
  const statsRef = useRef({
    frameCount: 0,
    totalTime: 0,
    avgDeltaTime: 0,
    maxDeltaTime: 0,
    minDeltaTime: Infinity,
  });

  /**
   * Reset the timing reference
   * Call this when resuming from pause to avoid large delta jumps
   */
  const resetTiming = useCallback(() => {
    lastTimeRef.current = Date.now();
  }, []);

  /**
   * Get current loop statistics
   * Useful for performance monitoring
   */
  const getStats = useCallback(() => ({
    ...statsRef.current,
    isRunning: isRunningRef.current,
  }), []);

  /**
   * Reset loop statistics
   */
  const resetStats = useCallback(() => {
    statsRef.current = {
      frameCount: 0,
      totalTime: 0,
      avgDeltaTime: 0,
      maxDeltaTime: 0,
      minDeltaTime: Infinity,
    };
  }, []);

  useEffect(() => {
    // Determine if loop should run
    const shouldRun = !isPaused && !gameOver && playerAlive;
    
    if (!shouldRun) {
      // Cancel any existing frame
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      isRunningRef.current = false;
      return;
    }

    isRunningRef.current = true;

    /**
     * Main loop function
     * Calculates delta time and calls the step function
     */
    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = now;

      // Clamp delta time to prevent huge jumps (e.g., after tab switch)
      // Max 100ms (10fps minimum) to prevent physics explosions
      const clampedDt = Math.min(dt, 0.1);

      // Update statistics
      const stats = statsRef.current;
      stats.frameCount++;
      stats.totalTime += clampedDt;
      stats.avgDeltaTime = stats.totalTime / stats.frameCount;
      stats.maxDeltaTime = Math.max(stats.maxDeltaTime, clampedDt);
      stats.minDeltaTime = Math.min(stats.minDeltaTime, clampedDt);

      // Call the step function
      if (onStep) {
        onStep(clampedDt);
      }

      // Schedule next frame
      frameIdRef.current = requestAnimationFrame(loop);
    };

    // Reset timing on start/resume to avoid large delta
    resetTiming();
    
    // Start the loop
    frameIdRef.current = requestAnimationFrame(loop);

    // Cleanup on unmount or when conditions change
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [isPaused, gameOver, playerAlive, onStep, resetTiming]);

  return {
    resetTiming,
    getStats,
    resetStats,
    isRunning: isRunningRef.current,
  };
}

/**
 * Calculate frames per second from delta time
 * @param {number} dt - Delta time in seconds
 * @returns {number} Frames per second
 */
export function calculateFPS(dt) {
  if (dt <= 0) return 0;
  return Math.round(1 / dt);
}

/**
 * Fixed timestep accumulator for physics
 * Use this for consistent physics regardless of frame rate
 * 
 * @param {number} dt - Delta time from frame
 * @param {number} fixedStep - Fixed timestep (default 1/60 = ~16.67ms)
 * @param {Function} stepFn - Function to call for each fixed step
 * @returns {number} Remaining accumulator time
 */
export function fixedTimestep(dt, fixedStep, stepFn, accumulator = 0) {
  accumulator += dt;
  
  while (accumulator >= fixedStep) {
    stepFn(fixedStep);
    accumulator -= fixedStep;
  }
  
  return accumulator;
}

/**
 * Interpolation helper for smooth rendering between physics steps
 * @param {number} accumulator - Remaining time from fixed timestep
 * @param {number} fixedStep - Fixed timestep value
 * @returns {number} Interpolation alpha (0-1)
 */
export function getInterpolationAlpha(accumulator, fixedStep) {
  return accumulator / fixedStep;
}
