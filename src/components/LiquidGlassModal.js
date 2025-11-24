
import React from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import { Canvas, Blur, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export default function LiquidGlassModal({ visible, title, children, onClose }) {
  const isAndroid = Platform.OS === 'android';
  const blur = isAndroid ? 25 : 55;

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' }}>

        <View style={{ width:'85%', height:'60%', borderRadius:30, overflow:'hidden' }}>
          <Canvas style={{ position:'absolute', width:'100%', height:'100%' }}>
            <Rect x={0} y={0} width={800} height={1200}>
              <LinearGradient
                start={vec(0,0)}
                end={vec(800,1200)}
                colors={[
                  "rgba(255,255,255,0.26)",
                  "rgba(255,255,255,0.10)"
                ]}
              />
            </Rect>
            <Blur blur={blur} />
          </Canvas>

          <View style={{ padding:24, flex:1 }}>
            <Text style={{ color:'white', fontSize:22, fontWeight:'700', marginBottom:14 }}>
              {title}
            </Text>

            <View style={{ flex:1 }}>
              {children}
            </View>

            <TouchableOpacity onPress={onClose} style={{ marginTop:20, alignSelf:'center' }}>
              <Text style={{ color:'#fff', fontSize:18 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </Modal>
  );
}
