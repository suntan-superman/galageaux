
import React from 'react';
import { TouchableOpacity, Text, View, Platform } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassButton({ title="Press", width=200, height=60, onPress, disabled=false }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 15 : 30;

  return (
    <TouchableOpacity 
      onPress={disabled ? undefined : onPress} 
      disabled={disabled}
      style={{ width, height, borderRadius:18, overflow:'hidden', opacity: disabled ? 0.6 : 1 }}
    >
      <Canvas style={{ position:'absolute', width:'100%', height:'100%' }}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0,0)}
            end={vec(width, height)}
            colors={[
              "rgba(255,255,255,0.28)",
              "rgba(255,255,255,0.12)"
            ]}
          />
        </Rect>
        <Blur blur={blur} />
      </Canvas>

      <View style={{
        position:'absolute',
        width:'100%',
        height:'100%',
        justifyContent:'center',
        alignItems:'center'
      }}>
        <Text style={{
          textAlign:'center',
          color:'#fff',
          fontWeight:'600',
          fontSize:18
        }}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
