/**
 * AudioStatusBadge - Shows audio system health status
 * Displays warning if audio is unavailable or partially working
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { getAudioStatus, subscribeToAudioState, retryAudioInit } from '../engine/audio';

export default function AudioStatusBadge({ style }) {
  const [status, setStatus] = useState(getAudioStatus());
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Subscribe to audio state changes
    const unsubscribe = subscribeToAudioState(setStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Pulse animation for warning state
    if (!status.isHealthy && status.initialized) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status.isHealthy, status.initialized]);

  const handleRetry = async () => {
    setRetrying(true);
    await retryAudioInit();
    setRetrying(false);
  };

  // Don't show anything if audio is fully healthy
  if (status.isHealthy && !expanded) {
    return null;
  }

  // Show loading indicator during initialization
  if (status.initializing) {
    return (
      <View style={[styles.badge, styles.badgeLoading, style]}>
        <Text style={styles.icon}>🔊</Text>
        <Text style={styles.loadingText}>
          Loading audio... {status.loadedSounds}/{status.totalSounds}
        </Text>
      </View>
    );
  }

  // Show error state
  if (status.error && !status.initialized) {
    return (
      <TouchableOpacity 
        style={[styles.badge, styles.badgeError, style]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.icon}>🔇</Text>
          <Text style={styles.errorText}>Audio unavailable</Text>
        </Animated.View>
        
        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.errorDetail}>{status.error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              disabled={retrying}
            >
              <Text style={styles.retryText}>
                {retrying ? 'Retrying...' : 'Tap to retry'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Show partial working state
  if (status.isPartiallyWorking) {
    return (
      <TouchableOpacity 
        style={[styles.badge, styles.badgeWarning, style]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.warningText}>
            Audio partial ({status.loadedSounds}/{status.totalSounds})
          </Text>
        </Animated.View>
        
        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.warningDetail}>
              Failed to load: {status.failedSounds.join(', ')}
            </Text>
            <Text style={styles.warningHint}>
              Game will continue without these sounds
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 200,
  },
  badgeLoading: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  loadingText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  errorDetail: {
    color: '#f87171',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningDetail: {
    color: '#fbbf24',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  warningHint: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
});
