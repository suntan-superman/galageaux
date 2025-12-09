// Placeholder audio file loader
// This creates silent audio placeholders until real audio files are added

// Export empty module - the actual audio files will be loaded dynamically
// and gracefully handled if missing

export const PLACEHOLDER_AUDIO = {
  info: 'Place MP3 files in assets/sounds/ and assets/music/ directories',
  status: 'Audio files not yet added - game will run silently'
};
