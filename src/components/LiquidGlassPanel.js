
import React from 'react';
import { View, Platform } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassPanel({ children }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 25 : 55;

  return (
    <View style={{
      flex:1,
      borderRadius:0,
      overflow:'hidden'
    }}>
      <Canvas style={{ flex:1 }}>
        <Rect x={0} y={0} width={1000} height={2000}>
          <LinearGradient
            start={vec(0,0)}
            end={vec(1000,2000)}
            colors={[
              "rgba(255,255,255,0.22)",
              "rgba(255,255,255,0.08)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      <View style={{
        position:'absolute',
        inset:0,
        padding:24
      }}>
        {children}
      </View>
    </View>
  );
}
