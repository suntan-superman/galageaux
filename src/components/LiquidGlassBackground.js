
import React from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec, Circle } from '@shopify/react-native-skia';

export default function LiquidGlassBackground({ children }) {
  const { width, height } = useWindowDimensions();
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 30 : 60;

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Canvas style={{ position: 'absolute', width: '100%', height: '100%' }}>
        {/* Dark base background */}
        <Rect x={0} y={0} width={width} height={height} color="#020617" />
        
        {/* Subtle stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <Circle
            key={i}
            cx={(i * 37) % width}
            cy={(i * 59) % height}
            r={Math.random() * 2 + 1}
            color="rgba(148,163,184,0.4)"
          />
        ))}
        
        {/* Liquid glass overlay */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={[
              "rgba(255,255,255,0.08)",
              "rgba(255,255,255,0.02)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
