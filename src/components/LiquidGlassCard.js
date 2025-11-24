
import React from 'react';
import { View, Platform } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassCard({ width=300, height=160, children }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 20 : 45;

  return (
    <View style={{ width, height, borderRadius:20, overflow:'hidden' }}>
      <Canvas style={{ flex:1 }}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0,0)}
            end={vec(width, height)}
            colors={[
              "rgba(255,255,255,0.18)",
              "rgba(255,255,255,0.06)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      <View style={{
        position:'absolute',
        inset:0,
        padding:16
      }}>
        {children}
      </View>
    </View>
  );
}
