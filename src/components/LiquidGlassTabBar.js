
import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassTabBar({ tabs = [], activeIndex = 0, onPress }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 18 : 32;

  return (
    <View style={{ height: 70, flexDirection:'row', width:'100%', overflow:'hidden' }}>
      <Canvas style={{ position:'absolute', width:'100%', height:'100%' }}>
        <Rect x={0} y={0} width={500} height={200}>
          <LinearGradient
            start={vec(0,0)}
            end={vec(500,200)}
            colors={[
              "rgba(255,255,255,0.22)",
              "rgba(255,255,255,0.08)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      {tabs.map((t, i) => (
        <TouchableOpacity
          key={i}
          style={{ flex:1, alignItems:'center', justifyContent:'center' }}
          onPress={() => onPress(i)}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: i === activeIndex ? '700' : '500',
            color: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.6)'
          }}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
