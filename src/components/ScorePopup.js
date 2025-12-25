/**
 * ScorePopup - Floating score text that animates and fades out
 * Used for displaying points earned, combo multipliers, and boss kills
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * @typedef {Object} ScoreTextItem
 * @property {number} id - Unique identifier
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {string} text - Text to display
 * @property {string} [color] - Text color
 * @property {number} life - Remaining life (0-1)
 * @property {boolean} [isBoss] - Whether this is a boss kill score
 * @property {boolean} [isCombo] - Whether this is a combo text
 */

/**
 * @typedef {Object} ScorePopupProps
 * @property {ScoreTextItem[]} items - Array of score text items
 * @property {number} offsetX - Screen shake offset X
 * @property {number} offsetY - Screen shake offset Y
 */

/**
 * ScorePopup Component - renders all floating score texts
 * @param {ScorePopupProps} props
 */
export default function ScorePopup({ items, offsetX = 0, offsetY = 0 }) {
  return (
    <>
      {items.map((st) => {
        const alpha = Math.max(0, Math.min(1, st.life));
        let fontSize = st.isBoss ? 28 : st.isCombo ? 32 : 20;
        if (st.isCombo) {
          fontSize = 28 + Math.min(st.life * 8, 12);
        }
        
        return (
          <View
            key={`score-${st.id}`}
            style={[
              styles.container,
              {
                left: st.x + offsetX - (st.isCombo ? 60 : 30),
                top: st.y + offsetY - 20,
                opacity: alpha,
                transform: [{ scale: st.isCombo ? 1 + (1 - st.life) * 0.3 : 1 }]
              }
            ]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.text,
                {
                  fontSize,
                  color: st.color || (st.isBoss ? '#fbbf24' : '#22c55e'),
                  fontWeight: st.isCombo ? '900' : '800',
                  textShadowColor: st.isCombo ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.75)',
                  textShadowOffset: st.isCombo ? { width: 2, height: 2 } : { width: 1, height: 1 },
                  textShadowRadius: st.isCombo ? 5 : 3,
                  letterSpacing: st.isCombo ? 2 : 0
                }
              ]}
            >
              {st.text}
            </Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  text: {
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3
  }
});
