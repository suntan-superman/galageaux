/**
 * Background - Skia Canvas component for space background
 * Renders the dark space background with animated nebula effects
 */

import React from 'react';
import { Rect, Circle } from '@shopify/react-native-skia';

/**
 * @param {Object} props
 * @param {number} props.width - Screen width
 * @param {number} props.height - Screen height
 * @param {number} props.ox - Screen offset X
 * @param {number} props.oy - Screen offset Y
 * @param {number} props.nebulaPulse - First nebula alpha pulse value
 * @param {number} props.nebulaPulseAlt - Second nebula alpha pulse value
 */
export default function Background({ width, height, ox, oy, nebulaPulse, nebulaPulseAlt }) {
  return (
    <>
      {/* Dark space background */}
      <Rect x={ox} y={oy} width={width} height={height} color="#010314" />
      
      {/* Gradient overlay */}
      <Rect x={ox} y={oy} width={width} height={height * 0.65} color="rgba(15,23,42,0.75)" />
      
      {/* Animated nebula clouds */}
      <Circle 
        cx={width * 0.3 + ox} 
        cy={height * 0.25 + oy} 
        r={220} 
        color={`rgba(14,165,233,${nebulaPulse})`} 
      />
      <Circle 
        cx={width * 0.72 + ox} 
        cy={height * 0.18 + oy} 
        r={190} 
        color={`rgba(244,114,182,${nebulaPulseAlt})`} 
      />
    </>
  );
}
