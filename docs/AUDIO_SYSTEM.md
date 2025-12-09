# Galageaux Audio System

## Overview

The audio system provides comprehensive sound effects and adaptive background music for Galageaux. It's built using `expo-av` and includes volume controls, on/off toggles, and graceful fallbacks for missing audio files.

## Architecture

### Core Module
- **Location**: `src/engine/audio.js`
- **Purpose**: Central audio manager with sound effect and music playback
- **Features**:
  - Preloaded sound effects for instant playback
  - Background music with looping
  - Volume controls (separate for SFX and music)
  - Enable/disable toggles
  - Adaptive music tempo based on game difficulty
  - Graceful handling of missing audio files

### Audio Assets

#### Sound Effects Directory
- **Location**: `assets/sounds/`
- **Files Required** (all MP3 format):
  - `shoot.mp3` - Normal weapon fire
  - `shoot_rapid.mp3` - Rapid fire weapon
  - `shoot_spread.mp3` - Spread shot weapon
  - `enemy_hit.mp3` - Enemy takes damage
  - `explosion.mp3` - Enemy destroyed
  - `powerup.mp3` - Power-up collected
  - `player_hit.mp3` - Player takes damage
  - `player_death.mp3` - Player dies
  - `shield.mp3` - Shield activated
  - `boss_appear.mp3` - Boss enters screen
  - `boss_death.mp3` - Boss defeated
  - `ui_click.mp3` - Button click
  - `level_up.mp3` - Level completed
  - `combo.mp3` - Combo increase

#### Music Directory
- **Location**: `assets/music/`
- **Files Required** (all MP3 format, looping):
  - `menu_theme.mp3` - Main menu background
  - `gameplay_theme.mp3` - Normal gameplay
  - `boss_theme.mp3` - Boss battle
  - `gameover_theme.mp3` - Game over screen

### Audio Specifications

**Sound Effects:**
- Format: MP3
- Sample Rate: 44.1kHz
- Bit Rate: 128-192 kbps
- Length: 0.1-2 seconds
- Style: Retro arcade, 8-bit/synthwave

**Music:**
- Format: MP3
- Sample Rate: 44.1kHz
- Bit Rate: 192-256 kbps
- Length: 1-3 minutes (loops seamlessly)
- Style: Synthwave/retro arcade
- Tempo: 120-140 BPM for gameplay

## Integration Points

### GameScreen
All game events trigger appropriate sounds:

- **Player Actions:**
  - Weapon fire (varies by weapon type)
  - Powerup collection
  - Taking damage
  - Death

- **Enemy Events:**
  - Enemy destruction
  - Boss appearance
  - Boss destruction
  - Combo achievements

- **Level Events:**
  - Level up
  - Boss music transition
  - Adaptive tempo (increases with level)

### MainMenu
- Menu music plays on load
- UI click sounds on button press

### Settings (PauseOverlay)
- Toggle sound effects on/off
- Toggle music on/off
- Adjust sound volume (0-100%)
- Adjust music volume (0-100%)
- Settings persist via AsyncStorage

## API Reference

### Initialization
```javascript
import * as AudioManager from '../engine/audio';

await AudioManager.initializeAudio();
```

### Sound Effects
```javascript
// Play a sound effect
AudioManager.playSound('soundName', volumeMultiplier);

// Examples
AudioManager.playSound('playerShoot', 0.5);  // 50% of base volume
AudioManager.playSound('explosion', 1.0);     // 100% of base volume
```

### Music
```javascript
// Play background music
await AudioManager.playMusic('trackName', loop);

// Control playback
await AudioManager.pauseMusic();
await AudioManager.resumeMusic();
await AudioManager.stopMusic();

// Adaptive tempo (1.0 to 1.3x based on level)
await AudioManager.setMusicTempo(level);
```

### Volume Control
```javascript
// Set volumes (0.0 to 1.0)
AudioManager.setSoundVolume(0.7);
await AudioManager.setMusicVolume(0.5);
```

### Enable/Disable
```javascript
// Toggle audio categories
AudioManager.setSoundsEnabled(true);
await AudioManager.setMusicEnabled(false);

// Get current settings
const settings = AudioManager.getAudioSettings();
```

### Cleanup
```javascript
// Clean up resources on exit
await AudioManager.cleanupAudio();
```

## Sound Mapping

| Event | Sound Effect | Volume |
|-------|--------------|--------|
| Normal shot | `playerShoot` | 0.3 |
| Rapid fire | `playerShootRapid` | 0.3 |
| Spread shot | `playerShootSpread` | 0.3 |
| Enemy destroyed | `enemyDestroy` | 0.5 |
| Boss hit | `enemyHit` | 0.4 |
| Boss death | `bossDeath` | 0.8 |
| Boss appear | `bossAppear` | 0.9 |
| Power-up collect | `powerupCollect` | 0.7 |
| Shield activate | `shieldActivate` | 0.7 |
| Player hit | `playerHit` | 0.8 |
| Player death | `playerDeath` | 0.9 |
| Level up | `levelUp` | 0.8 |
| Combo | `comboIncrease` | 0.6 |
| UI click | `uiClick` | 0.6 |

## Music Transitions

| Screen/Event | Music Track | Behavior |
|--------------|-------------|----------|
| Main Menu | `menu` | Loops |
| Gameplay Start | `gameplay` | Loops, tempo increases with level |
| Boss Spawn | `boss` | Switches from gameplay, loops |
| Boss Defeat | `gameplay` | Returns to gameplay music |
| Game Over | `gameover` | Plays once |

## Adaptive Music System

The gameplay music tempo automatically adjusts based on player level:
- **Level 1**: 1.0x speed (base tempo)
- **Level 5**: 1.12x speed
- **Level 10+**: 1.3x speed (maximum)

This creates increasing tension as the game progresses.

## Adding New Audio

### 1. Add Audio Files
Place MP3 files in the appropriate directory:
- Sound effects → `assets/sounds/`
- Music → `assets/music/`

### 2. Update Audio Manager
Edit `src/engine/audio.js`:

```javascript
const SOUND_EFFECTS = {
  // ... existing sounds
  newSound: 'new_sound.mp3'
};
```

### 3. Use in Game
```javascript
AudioManager.playSound('newSound', 0.5);
```

## Current Status

✅ **Implemented:**
- Complete audio manager system
- Sound effect integration for all game events
- Music system with track switching
- Volume controls
- Settings persistence
- Adaptive tempo system
- Graceful fallback for missing files

⏳ **Pending:**
- Actual audio files need to be added to `assets/sounds/` and `assets/music/`
- Currently using placeholder system (game runs silently)

## Finding Audio Assets

### Free Sound Effect Resources
- [Freesound.org](https://freesound.org/) - Community sound library
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects
- [Zapsplat](https://www.zapsplat.com/) - Large library
- [Soundbible](https://soundbible.com/) - Public domain sounds

### Music Resources
- [Incompetech](https://incompetech.com/) - Royalty-free music
- [Bensound](https://www.bensound.com/) - Free music tracks
- [Free Music Archive](https://freemusicarchive.org/) - Open music
- [Soundimage.org](https://soundimage.org/) - Game music

### Tips for Audio
1. **Sound Effects**: Keep short (< 1 second for most)
2. **Music**: Ensure smooth loops (no clicks at loop point)
3. **Format**: MP3 for best compatibility
4. **Style**: Retro arcade/synthwave fits the game aesthetic
5. **Licensing**: Ensure you have rights to use the audio

## Testing

To test the audio system:

1. Add at least one sound and one music file
2. Run the game: `npm start`
3. Play the game and listen for sounds
4. Open pause menu to adjust volume
5. Toggle sound/music on and off

Even without audio files, the game will run normally with the placeholder system.

## Performance

- Sound effects are preloaded at startup
- Music streams during playback
- Minimal memory footprint
- No impact on game performance
- Handles 10+ simultaneous sound effects

## Future Enhancements

Potential improvements:
- [ ] Haptic feedback coordination
- [ ] Dynamic music layering
- [ ] Spatial audio (pan based on position)
- [ ] Voice-over announcements
- [ ] Sound effect variations (randomize pitch)
- [ ] Achievement sound
- [ ] Countdown timer sound
