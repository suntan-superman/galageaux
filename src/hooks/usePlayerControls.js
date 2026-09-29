/**
 * usePlayerControls - Custom hook for player input handling
 * Manages both tilt (accelerometer) and touch (pan) controls
 */

import { useCallback, useEffect, useRef } from 'react';
import { PanResponder } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { PLAYER } from '../constants/game';
import { normalizeTiltSensitivity } from '../engine/inputSettings';

// Preserve the original 0.85 retention per 60 Hz sample as an elapsed-time filter.
const TILT_DECAY_RATE = -Math.log(0.85) * 60;
const MIN_MOVEMENT_SPEED = 0.05 * 60;

const canMove = config => !config.isPaused && config.isAlive && !config.gameOver;

/**
 * @typedef {Object} PlayerControlsConfig
 * @property {number} width - Screen width
 * @property {number} playerWidth - Player ship width
 * @property {boolean} tiltEnabled - Whether tilt controls are enabled
 * @property {number} tiltSensitivity - Tilt sensitivity (0.5-3, default 1.5)
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
  const current = useRef(null);
  // Input callbacks can run before passive effects: never wait for an effect to
  // publish current mode, geometry, settings or the simulation input callback.
  current.current = {
    width, playerWidth, tiltEnabled, tiltSensitivity, isPaused, isAlive,
    gameOver, inBonusRound, onPositionChange,
  };

  // Accelerometer setup
  useEffect(() => {
    if (!tiltEnabled || isPaused || !isAlive || gameOver) {
      tiltCurrent.current = 0;
      tiltTarget.current = 0;
      return;
    }

    Accelerometer.setUpdateInterval(16);
    const subscription = Accelerometer.addListener(({ x }) => {
      if (current.current.tiltEnabled && canMove(current.current) && Number.isFinite(x)) {
        tiltTarget.current = x;
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [tiltEnabled, isPaused, isAlive, gameOver]);

  // Pan responder for touch controls
  const panResponder = useRef(null);
  if (!panResponder.current) {
    const canTouch = () => !current.current.tiltEnabled && canMove(current.current);
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: canTouch,
      onMoveShouldSetPanResponder: canTouch,
      onPanResponderMove: (_evt, gesture) => {
        if (!canTouch() || !Number.isFinite(gesture.moveX)) return;
        const config = current.current;
        const nextX = Math.max(0, Math.min(
          config.width - config.playerWidth,
          gesture.moveX - config.playerWidth / 2,
        ));
        config.onPositionChange(nextX);
      }
    });
  }

  /**
   * Update player position based on tilt - call this in game loop
   * @param {number} dt - Delta time in seconds
   * @param {number} currentX - Current player X position
   * @returns {number|null} New X position or null if no change needed
   */
  const updateTilt = useCallback((dt, currentX) => {
    const config = current.current;
    if (!config.tiltEnabled || !canMove(config) || !Number.isFinite(dt) || dt <= 0) return null;

    const previous = tiltCurrent.current;
    const target = tiltTarget.current;
    const retained = Math.exp(-TILT_DECAY_RATE * dt);
    tiltCurrent.current = target + (previous - target) * retained;

    // Integrate this same filter over the interval, avoiding endpoint-sampling
    // movement differences between 30/60/120 updates. No ship inertia is added.
    const integratedTilt = target * dt + (previous - target) * (1 - retained) / TILT_DECAY_RATE;
    const sensitivityFactor = normalizeTiltSensitivity(config.tiltSensitivity) / PLAYER.TILT_SENSITIVITY_DEFAULT;
    const bonusFactor = config.inBonusRound ? 1.25 : 1;
    const delta = -integratedTilt * config.width * 2.1 * sensitivityFactor * bonusFactor;

    // Keep the existing jitter cutoff in units/second instead of units/frame.
    if (Math.abs(delta) > MIN_MOVEMENT_SPEED * dt) {
      const nextX = Math.max(0, Math.min(config.width - config.playerWidth, currentX + delta));
      if (nextX !== currentX) {
        return nextX;
      }
    }
    return null;
  }, []);

  return {
    panHandlers: panResponder.current.panHandlers,
    updateTilt,
    tiltCurrent,
    tiltTarget
  };
}
