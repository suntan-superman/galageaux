import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

/**
 * Fallback UI displayed when the game crashes.
 * Provides user-friendly error message and recovery options.
 */
export default function GameErrorFallback({ error, errorInfo, onRetry, onExit }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // Extract a user-friendly error message
  const getErrorMessage = () => {
    if (!error) return 'An unexpected error occurred';
    
    const message = error.message || error.toString();
    
    // Provide friendly messages for common errors
    if (message.includes('Cannot read property')) {
      return 'A game component failed to load properly';
    }
    if (message.includes('Network')) {
      return 'Connection issue - please check your internet';
    }
    if (message.includes('Audio') || message.includes('Sound')) {
      return 'Audio system encountered an issue';
    }
    
    return 'Something went wrong in the game';
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💥</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>SYSTEM MALFUNCTION</Text>
        
        {/* Error Message */}
        <Text style={styles.message}>{getErrorMessage()}</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Don't worry, your high scores are safe!
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
          
          {onExit && (
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={onExit}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>MAIN MENU</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Debug Info (only in development) */}
        {__DEV__ && error && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText} numberOfLines={5}>
              {error.toString()}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    shadowColor: '#f87171',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(248,113,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  icon: {
    fontSize: 40
  },
  title: {
    color: '#f87171',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center'
  },
  message: {
    color: '#e5e7eb',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1
  },
  debugContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    width: '100%'
  },
  debugTitle: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  debugText: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'monospace'
  }
});
