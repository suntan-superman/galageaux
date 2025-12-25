/**
 * usePlayerControls - Custom hook for player input handling
 * Manages both tilt (accelerometer) and touch (pan) controls
 */

import { useEffect, useRef } from 'react';
import { PanResponder } from 'react-native';
import { Accelerometer } from 'expo-sensors';

/**
 * @typedef {Object} PlayerControlsConfig
 * @property {number} width - Screen width
 * @property {number} playerWidth - Player ship width
 * @property {boolean} tiltEnabled - Whether tilt controls are enabled
 * @property {number} tiltSensitivity - Tilt sensitivity (1-10)
 * @property {boolean} isPaused - Whether game is paused
 * @property {boolean} isAlive - Whether player is alive
 * @property {boolean} gameOver - Whether game is over
 * @property {boolean} inBonusRound - Whether in bonus round (affects speed)
 * @property {function} onPositionChange - Callback when player position changes
 */

/**
 * @typedef {Object} PlayerControlsReturn
 * @property {Object} panHandlers - PanResponder handlers for View
 * @property {function} updateTilt - Function to call in game loop to update tilt position
 * @property {React.MutableRefObject<number>} tiltCurrent - Current smoothed tilt value
 * @property {React.MutableRefObject<number>} tiltTarget - Target tilt value from sensor
 */

/**
 * Custom hook for player movement controls
 * @param {PlayerControlsConfig} config
 * @returns {PlayerControlsReturn}
 */
export default function usePlayerControls({
  width,
  playerWidth,
  tiltEnabled,
  tiltSensitivity,
  isPaused,
  isAlive,
  gameOver,
  inBonusRound = false,
  onPositionChange
}) {
  const tiltCurrent = useRef(0);
  const tiltTarget = useRef(0);
  const pausedRef = useRef(isPaused);
  const aliveRef = useRef(isAlive);

  // Keep refs in sync
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    aliveRef.current = isAlive;
  }, [isAlive]);

  // Accelerometer setup
  useEffect(() => {
    if (!tiltEnabled) {
      tiltCurrent.current = 0;
      tiltTarget.current = 0;
      return;
    }

    Accelerometer.setUpdateInterval(16);
    const subscription = Accelerometer.addListener(({ x }) => {
      tiltTarget.current = x;
    });

    return () => {
      subscription?.remove();
    };
  }, [tiltEnabled, width]);

  // Helper to clamp player X position
  const clampX = (value) => {
    const half = playerWidth / 2;
    return Math.max(0, Math.min(width - playerWidth, value - half));
  };

  // Pan responder for touch controls
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => 
        !tiltEnabled && !pausedRef.current && aliveRef.current && !gameOver,
      onMoveShouldSetPanResponder: () => 
        !tiltEnabled && !pausedRef.current && aliveRef.current && !gameOver,
      onPanResponderMove: (_evt, gesture) => {
        if (pausedRef.current) return;
        const nextX = clampX(gesture.moveX);
        onPositionChange(nextX);
      }
    })
  ).current;

  /**
   * Update player position based on tilt - call this in game loop
   * @param {number} dt - Delta time in seconds
   * @param {number} currentX - Current player X position
   * @returns {number|null} New X position or null if no change needed
   */
  const updateTilt = (dt, currentX) => {
    if (!tiltEnabled || !aliveRef.current) return null;

    // Smooth the tilt value
    const smoothed = tiltCurrent.current * 0.85 + tiltTarget.current * 0.15;
    tiltCurrent.current = smoothed;

    // Calculate movement
    const sensitivityFactor = tiltSensitivity / 5;
    const bonusFactor = inBonusRound ? 1.25 : 1;
    const delta = -smoothed * width * dt * 2.1 * sensitivityFactor * bonusFactor;

    if (Math.abs(delta) > 0.05) {
      const nextX = Math.max(0, Math.min(width - playerWidth, currentX + delta));
      if (nextX !== currentX) {
        return nextX;
      }
    }
    return null;
  };

  return {
    panHandlers: panResponder.panHandlers,
    updateTilt,
    tiltCurrent,
    tiltTarget
  };
}
