/**
 * PlayerShip - Skia Canvas component for player ship rendering
 * Renders the sleek interceptor with thrusters, shields, and effects
 */

import React from 'react';
import { Group, Circle, Path, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

/**
 * @typedef {Object} PlayerShipProps
 * @property {Object} player - Player state object
 * @property {number} player.x - X position
 * @property {number} player.y - Y position
 * @property {number} player.width - Ship width
 * @property {number} player.height - Ship height
 * @property {boolean} player.shield - Has shield active
 * @property {number} ox - Screen offset X
 * @property {number} oy - Screen offset Y
 * @property {number} flameLength - Thruster flame length (animated)
 * @property {number} flameWidth - Thruster flame width (animated)
 * @property {boolean} inBonusRound - Is in bonus round (invulnerability effect)
 * @property {number} hitFlash - Hit flash intensity (0-1)
 */

export default function PlayerShip({ 
  player, 
  ox, 
  oy, 
  flameLength, 
  flameWidth, 
  inBonusRound = false,
  hitFlash = 0 
}) {
  const centerX = player.x + player.width / 2 + ox;
  const centerY = player.y + player.height / 2 + oy;
  const shipX = player.x + ox;
  const shipY = player.y + oy;
  const shipW = player.width;
  const shipH = player.height;
  
  // Enhanced ship design - sleek interceptor with multiple components
  const noseTip = { x: centerX, y: shipY };
  const noseWidth = shipW * 0.15;
  const wingWidth = shipW * 0.45;
  const bodyWidth = shipW * 0.25;
  
  // Main body path - diamond-shaped interceptor
  const mainBodyPath = `M ${noseTip.x} ${noseTip.y} 
    L ${noseTip.x - noseWidth} ${shipY + shipH * 0.25} 
    L ${noseTip.x - wingWidth} ${shipY + shipH * 0.6} 
    L ${noseTip.x - bodyWidth} ${shipY + shipH * 0.85} 
    L ${noseTip.x - bodyWidth * 0.6} ${shipY + shipH} 
    L ${noseTip.x + bodyWidth * 0.6} ${shipY + shipH} 
    L ${noseTip.x + bodyWidth} ${shipY + shipH * 0.85} 
    L ${noseTip.x + wingWidth} ${shipY + shipH * 0.6} 
    L ${noseTip.x + noseWidth} ${shipY + shipH * 0.25} Z`;
  
  // Wing extensions
  const leftWingPath = `M ${noseTip.x - wingWidth} ${shipY + shipH * 0.6} 
    L ${noseTip.x - shipW * 0.5} ${shipY + shipH * 0.55} 
    L ${noseTip.x - wingWidth * 0.9} ${shipY + shipH * 0.7} Z`;
  
  const rightWingPath = `M ${noseTip.x + wingWidth} ${shipY + shipH * 0.6} 
    L ${noseTip.x + shipW * 0.5} ${shipY + shipH * 0.55} 
    L ${noseTip.x + wingWidth * 0.9} ${shipY + shipH * 0.7} Z`;
  
  // Weapon pods on wings
  const leftPodX = noseTip.x - shipW * 0.5;
  const rightPodX = noseTip.x + shipW * 0.5;
  const podY = shipY + shipH * 0.55;

  return (
    <Group>
      {/* Outer energy glow */}
      <Circle cx={centerX} cy={centerY} r={26} color="rgba(34,197,94,0.12)" />
      <Circle cx={centerX} cy={centerY} r={22} color="rgba(56,189,248,0.08)" />
      
      {/* Wing extensions (back layer) */}
      <Path path={leftWingPath} color="rgba(16,185,129,0.4)">
        <LinearGradient
          start={vec(noseTip.x - wingWidth, shipY + shipH * 0.6)}
          end={vec(noseTip.x - shipW * 0.5, shipY + shipH * 0.55)}
          colors={['rgba(16,185,129,0.5)', 'rgba(34,197,94,0.3)']}
        />
      </Path>
      <Path path={rightWingPath} color="rgba(16,185,129,0.4)">
        <LinearGradient
          start={vec(noseTip.x + wingWidth, shipY + shipH * 0.6)}
          end={vec(noseTip.x + shipW * 0.5, shipY + shipH * 0.55)}
          colors={['rgba(16,185,129,0.5)', 'rgba(34,197,94,0.3)']}
        />
      </Path>
      
      {/* Main ship body with multi-layer gradient */}
      <Path path={mainBodyPath}>
        <LinearGradient
          start={vec(centerX, shipY)}
          end={vec(centerX, shipY + shipH)}
          colors={['#10b981', '#22c55e', '#16a34a', '#15803d', '#166534']}
        />
      </Path>
      
      {/* Body detail lines */}
      <Path 
        path={`M ${centerX - bodyWidth * 0.5} ${shipY + shipH * 0.4} L ${centerX - bodyWidth * 0.5} ${shipY + shipH * 0.9}`} 
        color="rgba(248,250,252,0.4)" 
        style="stroke"
        strokeWidth={1}
      />
      <Path 
        path={`M ${centerX + bodyWidth * 0.5} ${shipY + shipH * 0.4} L ${centerX + bodyWidth * 0.5} ${shipY + shipH * 0.9}`} 
        color="rgba(248,250,252,0.4)" 
        style="stroke"
        strokeWidth={1}
      />
      
      {/* Wing highlights */}
      <Path 
        path={`M ${noseTip.x - wingWidth * 0.8} ${shipY + shipH * 0.5} L ${noseTip.x - shipW * 0.48} ${shipY + shipH * 0.52} L ${noseTip.x - wingWidth * 0.75} ${shipY + shipH * 0.65} Z`} 
        color="rgba(248,250,252,0.45)" 
      />
      <Path 
        path={`M ${noseTip.x + wingWidth * 0.8} ${shipY + shipH * 0.5} L ${noseTip.x + shipW * 0.48} ${shipY + shipH * 0.52} L ${noseTip.x + wingWidth * 0.75} ${shipY + shipH * 0.65} Z`} 
        color="rgba(248,250,252,0.45)" 
      />
      
      {/* Weapon pods on wings */}
      <Circle cx={leftPodX} cy={podY} r={3.5} color="rgba(56,189,248,0.6)" />
      <Circle cx={leftPodX} cy={podY} r={2} color="rgba(139,92,246,0.8)" />
      <Circle cx={rightPodX} cy={podY} r={3.5} color="rgba(56,189,248,0.6)" />
      <Circle cx={rightPodX} cy={podY} r={2} color="rgba(139,92,246,0.8)" />
      
      {/* Enhanced cockpit/canopy */}
      <Circle cx={centerX} cy={shipY + shipH * 0.3} r={5} color="rgba(14,165,233,0.5)" />
      <Circle cx={centerX} cy={shipY + shipH * 0.3} r={3.5} color="rgba(56,189,248,0.7)" />
      <Circle cx={centerX} cy={shipY + shipH * 0.3} r={2} color="rgba(139,92,246,0.9)" />
      {/* Cockpit reflection */}
      <Circle cx={centerX - 1} cy={shipY + shipH * 0.28} r={1.2} color="rgba(248,250,252,0.6)" />
      
      {/* Nose detail */}
      <Circle cx={centerX} cy={shipY + 2} r={2} color="rgba(56,189,248,0.8)" />
      
      {/* Engine exhaust ports */}
      <Rect 
        x={centerX - shipW * 0.18} 
        y={shipY + shipH * 0.92} 
        width={shipW * 0.08} 
        height={shipH * 0.08} 
        color="rgba(15,23,42,0.8)" 
      />
      <Rect 
        x={centerX + shipW * 0.1} 
        y={shipY + shipH * 0.92} 
        width={shipW * 0.08} 
        height={shipH * 0.08} 
        color="rgba(15,23,42,0.8)" 
      />
      
      {/* Main thruster - enhanced with multiple layers */}
      <Rect
        x={centerX - flameWidth / 2 + ox}
        y={shipY + shipH + oy}
        width={flameWidth}
        height={flameLength}
        color="rgba(14,165,233,0.8)"
      >
        <LinearGradient
          start={vec(centerX, shipY + shipH)}
          end={vec(centerX, shipY + shipH + flameLength)}
          colors={['rgba(14,165,233,0.9)', 'rgba(56,189,248,0.7)', 'rgba(139,92,246,0.4)', 'rgba(248,250,252,0.2)']}
        />
      </Rect>
      
      {/* Thruster core with pulsing effect */}
      <Circle 
        cx={centerX} 
        cy={shipY + shipH + flameLength * 0.5 + oy} 
        r={flameWidth * 0.45} 
        color="rgba(248,250,252,0.7)" 
      />
      <Circle 
        cx={centerX} 
        cy={shipY + shipH + flameLength * 0.5 + oy} 
        r={flameWidth * 0.25} 
        color="rgba(139,92,246,0.9)" 
      />
      
      {/* Side maneuvering thrusters - enhanced */}
      <Rect
        x={centerX - shipW * 0.32 - 2.5 + ox}
        y={shipY + shipH * 0.72 + oy}
        width={5}
        height={flameLength * 0.5}
        color="rgba(14,165,233,0.5)"
      >
        <LinearGradient
          start={vec(centerX - shipW * 0.32, shipY + shipH * 0.72)}
          end={vec(centerX - shipW * 0.32, shipY + shipH * 0.72 + flameLength * 0.5)}
          colors={['rgba(14,165,233,0.6)', 'rgba(56,189,248,0.4)', 'rgba(139,92,246,0.2)']}
        />
      </Rect>
      <Rect
        x={centerX + shipW * 0.27 - 2.5 + ox}
        y={shipY + shipH * 0.72 + oy}
        width={5}
        height={flameLength * 0.5}
        color="rgba(14,165,233,0.5)"
      >
        <LinearGradient
          start={vec(centerX + shipW * 0.27, shipY + shipH * 0.72)}
          end={vec(centerX + shipW * 0.27, shipY + shipH * 0.72 + flameLength * 0.5)}
          colors={['rgba(14,165,233,0.6)', 'rgba(56,189,248,0.4)', 'rgba(139,92,246,0.2)']}
        />
      </Rect>
      
      {/* Shield effect - enhanced */}
      {player.shield && (
        <>
          <Circle cx={centerX} cy={centerY} r={32} color="rgba(56,189,248,0.15)" />
          <Circle cx={centerX} cy={centerY} r={28} color="rgba(139,92,246,0.2)" />
          <Circle cx={centerX} cy={centerY} r={24} color="rgba(56,189,248,0.25)" />
        </>
      )}
      
      {/* Bonus round invulnerability effect */}
      {inBonusRound && (
        <>
          <Circle cx={centerX} cy={centerY} r={34} color="rgba(251,191,36,0.2)" />
          <Circle cx={centerX} cy={centerY} r={30} color="rgba(251,191,36,0.3)" />
          <Circle cx={centerX} cy={centerY} r={26} color="rgba(251,191,36,0.25)" />
        </>
      )}
      
      {/* Hit flash */}
      {hitFlash > 0 && (
        <>
          <Circle cx={centerX} cy={centerY} r={30} color={`rgba(248,113,113,${hitFlash * 0.4})`} />
          <Circle cx={centerX} cy={centerY} r={24} color={`rgba(248,113,113,${hitFlash * 0.6})`} />
        </>
      )}
    </Group>
  );
}
