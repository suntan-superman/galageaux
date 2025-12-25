import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

export default function GameOverOverlay({ score, onRetry, onExit }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }}>
        <Text style={styles.title}>GAME OVER</Text>
        <Text style={styles.score}>Final Score: {score.toLocaleString()}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={onRetry}>
            <Text style={styles.buttonPrimaryText}>RETRY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonSecondary} onPress={onExit}>
            <Text style={styles.buttonSecondaryText}>MENU</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },
  title: {
    color: '#f9fafb',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12
  },
  score: {
    color: '#e5e7eb',
    fontSize: 18,
    marginBottom: 24
  },
  row: {
    flexDirection: 'row'
  },
  buttonPrimary: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    marginRight: 8
  },
  buttonPrimaryText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  buttonSecondaryText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700'
  }
});
