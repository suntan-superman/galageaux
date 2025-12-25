/**
 * LevelBanner - Animated level announcement overlay
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

/**
 * @typedef {Object} LevelBannerProps
 * @property {string|null} text - Banner text to display (null to hide)
 * @property {boolean} visible - Whether banner should be visible
 */

export default function LevelBanner({ text, visible }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (text && visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();

      // Animate out after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [text, visible]);

  if (!text || !visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }]
        }
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8
  }
});
