import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MainMenu from './src/scenes/MainMenu';
import SplashScreen from './src/scenes/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import GameErrorFallback from './src/components/GameErrorFallback';
import { validateAllConfigs } from './src/utils/configValidator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [errorKey, setErrorKey] = useState(0);
  const [configErrors, setConfigErrors] = useState(null);
  const [configChecked, setConfigChecked] = useState(false);

  // Validate configs on app startup
  useEffect(() => {
    const result = validateAllConfigs();
    if (!result.valid) {
      setConfigErrors(result.errors);
    }
    setConfigChecked(true);
  }, []);

  const handleErrorRetry = () => {
    // Reset the app state and force re-render
    setShowSplash(true);
    setErrorKey(prev => prev + 1);
    setConfigErrors(null);
    const result = validateAllConfigs();
    if (!result.valid) {
      setConfigErrors(result.errors);
    }
  };

  // Show config error screen if validation failed
  if (configChecked && configErrors && configErrors.length > 0) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1e1e2e" />
        <Text style={styles.errorTitle}>⚠️ Configuration Error</Text>
        <Text style={styles.errorSubtitle}>
          The game configuration files have issues that need to be fixed:
        </Text>
        <View style={styles.errorList}>
          {configErrors.slice(0, 5).map((err, idx) => (
            <Text key={idx} style={styles.errorItem}>• {err.message}</Text>
          ))}
          {configErrors.length > 5 && (
            <Text style={styles.errorMore}>
              ...and {configErrors.length - 5} more errors
            </Text>
          )}
        </View>
        <Text style={styles.errorHint}>
          Please check the console for full error details.
        </Text>
      </View>
    );
  }

  // Show loading while checking configs
  if (!configChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <ErrorBoundary
      key={errorKey}
      FallbackComponent={(props) => (
        <GameErrorFallback 
          {...props} 
          onRetry={handleErrorRetry}
        />
      )}
      onError={(error, errorInfo) => {
        // Log error for debugging/analytics
        console.error('App Error:', error);
      }}
    >
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          translucent={Platform.OS === 'android'}
          backgroundColor="transparent"
        />
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <MainMenu />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f87171',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorList: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  errorItem: {
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorMore: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
