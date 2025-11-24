import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const TITLE = 'GALAGEAUX';
const TAGLINE = 'Arcade chaos, pocket sized.';
const PROGRESS_PHASES = [
  { label: 'Calibrating thrusters', duration: 900 },
  { label: 'Spawning enemy waves', duration: 1100 },
  { label: 'Arming plasma cannons', duration: 900 },
  { label: 'Linking star map', duration: 800 },
];

const SPARK_COLORS = ['#f97316', '#f472b6', '#38bdf8', '#fde047'];

const createSparks = (count = 24) =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `spark-${idx}`,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 4 + 2,
    color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    delay: Math.random() * 2000,
  }));

export default function SplashScreen({ onFinish }) {
  const letters = useMemo(() => TITLE.split(''), []);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [sparks] = useState(() => createSparks());
  const [isDone, setIsDone] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    letters.forEach((_, idx) => {
      Animated.timing(letterAnims[idx], {
        toValue: 1,
        duration: 600,
        delay: 150 * idx,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim, letterAnims, letters, logoScale]);

  useEffect(() => {
    let cancelled = false;
    const runPhases = async () => {
      for (let i = 0; i < PROGRESS_PHASES.length; i++) {
        if (cancelled) return;
        setPhaseIndex(i);

        Animated.timing(progressAnim, {
          toValue: (i + 1) / PROGRESS_PHASES.length,
          duration: PROGRESS_PHASES[i].duration,
          useNativeDriver: false,
        }).start();

        await new Promise(resolve => setTimeout(resolve, PROGRESS_PHASES[i].duration));
      }

      finishSequence();
    };

    runPhases();
    return () => {
      cancelled = true;
    };
  }, [progressAnim]);

  const finishSequence = useCallback(() => {
    if (isDone) return;
    setIsDone(true);
    setTimeout(() => {
      onFinish?.();
    }, 400);
  }, [isDone, onFinish]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.1],
  });

  return (
    <View style={styles.root} testID="splash-screen">
      <LinearGradient
        colors={['#050517', '#0b1432', '#0d0e25']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.glow,
          {
            transform: [{ scale: glowScale }],
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.15, 0.35],
            }),
          },
        ]}
      />

      {sparks.map(spark => (
        <Animated.View
          key={spark.id}
          style={[
            styles.spark,
            {
              left: `${spark.left}%`,
              top: `${spark.top}%`,
              width: spark.size,
              height: spark.size,
              backgroundColor: spark.color,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
            },
          ]}
        />
      ))}

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              accessibilityLabel="Galageaux logo"
            />
          </View>
        </Animated.View>

        <View style={styles.titleRow} accessibilityRole="text">
          {letters.map((letter, idx) => {
            const anim = letterAnims[idx];
            return (
              <Animated.Text
                key={`${letter}-${idx}`}
                style={[
                  styles.titleLetter,
                  {
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                    color: idx % 2 === 0 ? '#f472b6' : '#fb923c',
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>

        <Text style={styles.tagline}>{TAGLINE}</Text>

        <View style={styles.progressSection}>
          <Text style={styles.phaseLabel}>{PROGRESS_PHASES[phaseIndex]?.label}</Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        <Pressable style={styles.skipButton} onPress={finishSequence}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 18,
  },
  logoWrapper: {
    padding: 18,
    borderRadius: 120,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 8,
  },
  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  titleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  titleLetter: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: '#e0f2fe',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginTop: 12,
  },
  phaseLabel: {
    color: '#bae6fd',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#f472b6',
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.4)',
  },
  skipText: {
    color: '#f8fafc',
    fontWeight: '600',
    letterSpacing: 1,
  },
  spark: {
    position: 'absolute',
    borderRadius: 999,
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#38bdf8',
  },
});

