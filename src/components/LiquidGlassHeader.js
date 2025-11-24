
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassHeader({ title = "Header" }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 18 : 35;

  return (
    <View style={{ height: 90, width: '100%', overflow:'hidden', justifyContent:'flex-end' }}>
      <Canvas style={{ position:'absolute', width:'100%', height:'100%' }}>
        <Rect x={0} y={0} width={500} height={200}>
          <LinearGradient
            start={vec(0,0)}
            end={vec(500,200)}
            colors={[
              "rgba(255,255,255,0.25)",
              "rgba(255,255,255,0.10)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      <Text style={{
        paddingBottom: 14,
        paddingLeft: 20,
        fontSize: 24,
        fontWeight: '600',
        color: 'white'
      }}>
        {title}
      </Text>
    </View>
  );
}
