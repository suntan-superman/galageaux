
import React from 'react';
import { StatusBar } from 'react-native';
import MainMenu from './src/scenes/MainMenu';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <MainMenu />
    </>
  );
}
