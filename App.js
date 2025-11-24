import React, { useState } from 'react';
import { StatusBar, Platform, View, StyleSheet } from 'react-native';
import MainMenu from './src/scenes/MainMenu';
import SplashScreen from './src/scenes/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
