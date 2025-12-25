/**
 * Screen Transitions Component
 * 
 * Provides smooth animated transitions between game scenes including:
 * - Fade in/out
 * - Stage complete wipe
 * - Game over effects
 * - Level start animations
 * 
 * @module components/ScreenTransitions
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

// ============================================================================
// TRANSITION TYPES
// ============================================================================

export const TransitionType = {
  NONE: 'none',
  FADE: 'fade',
  WIPE_DOWN: 'wipe_down',
  WIPE_UP: 'wipe_up',
  ZOOM: 'zoom',
  FLASH: 'flash',
};

// ============================================================================
// FADE TRANSITION
// ============================================================================

/**
 * Fade transition overlay
 * @param {Object} props
 * @param {boolean} props.visible - Whether transition is active
 * @param {string} props.direction - 'in' or 'out'
 * @param {number} props.duration - Duration in ms
 * @param {function} props.onComplete - Called when transition completes
 * @param {string} props.color - Overlay color
 */
export function FadeTransition({ 
  visible, 
  direction = 'in', 
  duration = 300, 
  onComplete,
  color = '#000000',
}) {
  const opacity = useRef(new Animated.Value(direction === 'in' ? 1 : 0)).current;
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      const targetValue = direction === 'in' ? 0 : 1;
      
      Animated.timing(opacity, {
        toValue: targetValue,
        duration,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        if (direction === 'in') {
          setIsVisible(false);
        }
        onComplete?.();
      });
    }
  }, [visible, direction]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.fullScreen,
        { backgroundColor: color, opacity }
      ]}
      pointerEvents="none"
    />
  );
}

// ============================================================================
// WIPE TRANSITION
// ============================================================================

/**
 * Wipe transition (reveals from top or bottom)
 * @param {Object} props
 * @param {boolean} props.visible - Whether transition is active
 * @param {string} props.direction - 'down' or 'up'
 * @param {number} props.duration - Duration in ms
 * @param {function} props.onComplete - Called when transition completes
 * @param {string} props.color - Overlay color
 */
export function WipeTransition({ 
  visible, 
  direction = 'down', 
  duration = 500, 
  onComplete,
  color = '#020617',
}) {
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(direction === 'down' ? -height : height)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      translateY.setValue(direction === 'down' ? -height : height);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onComplete?.();
      });
    } else {
      Animated.timing(translateY, {
        toValue: direction === 'down' ? height : -height,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible, direction]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.fullScreen,
        { 
          backgroundColor: color, 
          transform: [{ translateY }] 
        }
      ]}
      pointerEvents="none"
    />
  );
}

// ============================================================================
// STAGE COMPLETE TRANSITION
// ============================================================================

/**
 * Stage complete celebration transition
 * @param {Object} props
 * @param {boolean} props.visible - Whether transition is active
 * @param {number} props.stage - Completed stage number
 * @param {function} props.onComplete - Called when transition completes
 */
export function StageCompleteTransition({ visible, stage, onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      opacity.setValue(0);
      scale.setValue(0.5);
      textOpacity.setValue(0);

      // Sequence: fade in bg, scale up text, hold, fade out
      Animated.sequence([
        // Fade in background
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        // Scale and fade in text
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Hold
        Animated.delay(1500),
        // Fade out
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setIsVisible(false);
        onComplete?.();
      });
    }
  }, [visible]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[styles.fullScreen, styles.centered, { opacity }]}
      pointerEvents="none"
    >
      <View style={styles.stageBg} />
      <Animated.View style={{ transform: [{ scale }], opacity: textOpacity }}>
        <Text style={styles.stageClearText}>STAGE CLEAR!</Text>
        <Text style={styles.stageNumber}>Stage {stage}</Text>
        <Text style={styles.stageSubtext}>Completed</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ============================================================================
// GAME OVER TRANSITION
// ============================================================================

/**
 * Game over dramatic transition
 * @param {Object} props
 * @param {boolean} props.visible - Whether transition is active
 * @param {function} props.onComplete - Called when transition completes
 */
export function GameOverTransition({ visible, onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(-50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      opacity.setValue(0);
      textY.setValue(-50);
      textOpacity.setValue(0);

      // Dramatic game over sequence
      Animated.sequence([
        // Quick fade to dark
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Slide down GAME OVER text
        Animated.parallel([
          Animated.spring(textY, {
            toValue: 0,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Hold for effect
        Animated.delay(500),
      ]).start(() => {
        onComplete?.();
      });
    } else {
      // Fade out when dismissed
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[styles.fullScreen, styles.centered]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.gameOverBg, { opacity }]} />
      <Animated.View 
        style={{ 
          transform: [{ translateY: textY }],
          opacity: textOpacity,
        }}
      >
        <Text style={styles.gameOverText}>GAME OVER</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ============================================================================
// LEVEL START TRANSITION
// ============================================================================

/**
 * Level/wave start announcement
 * @param {Object} props
 * @param {boolean} props.visible - Whether transition is active
 * @param {string} props.text - Text to display (e.g., "WAVE 5")
 * @param {function} props.onComplete - Called when transition completes
 */
export function LevelStartTransition({ visible, text, onComplete }) {
  const scale = useRef(new Animated.Value(2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      scale.setValue(2);
      opacity.setValue(0);

      // Zoom in and fade effect
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.delay(600),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        onComplete?.();
      });
    }
  }, [visible, text]);

  if (!isVisible) return null;

  return (
    <View style={[styles.fullScreen, styles.centered]} pointerEvents="none">
      <Animated.Text 
        style={[
          styles.levelText,
          {
            transform: [{ scale }],
            opacity,
          }
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// ============================================================================
// FLASH OVERLAY
// ============================================================================

/**
 * Screen flash overlay for explosions/impacts
 * @param {Object} props
 * @param {boolean} props.visible - Whether flash is active
 * @param {string} props.color - Flash color
 * @param {number} props.intensity - Flash intensity 0-1
 * @param {number} props.duration - Duration in ms
 * @param {function} props.onComplete - Called when flash completes
 */
export function FlashOverlay({ 
  visible, 
  color = '#ffffff', 
  intensity = 0.5,
  duration = 150,
  onComplete,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      opacity.setValue(intensity);

      // Quick flash then fade
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        onComplete?.();
      });
    }
  }, [visible]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.fullScreen,
        { backgroundColor: color, opacity }
      ]}
      pointerEvents="none"
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
  },
  stageClearText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#22c55e',
    textAlign: 'center',
    textShadowColor: 'rgba(34, 197, 94, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 4,
  },
  stageNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fbbf24',
    textAlign: 'center',
    marginTop: 8,
  },
  stageSubtext: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  gameOverBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
  },
  gameOverText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fef2f2',
    textAlign: 'center',
    textShadowColor: 'rgba(239, 68, 68, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    letterSpacing: 6,
  },
  levelText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#38bdf8',
    textAlign: 'center',
    textShadowColor: 'rgba(56, 189, 248, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 3,
  },
});

export default {
  FadeTransition,
  WipeTransition,
  StageCompleteTransition,
  GameOverTransition,
  LevelStartTransition,
  FlashOverlay,
  TransitionType,
};
