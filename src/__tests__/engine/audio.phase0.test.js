jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Sound: { createAsync: jest.fn() }
  }
}));

const makeSound = () => ({
  playAsync: jest.fn(() => Promise.resolve()),
  pauseAsync: jest.fn(() => Promise.resolve()),
  stopAsync: jest.fn(() => Promise.resolve()),
  unloadAsync: jest.fn(() => Promise.resolve()),
  setPositionAsync: jest.fn(() => Promise.resolve()),
  setVolumeAsync: jest.fn(() => Promise.resolve())
});

describe('production audio music request contracts', () => {
  let audio;
  let nativeAudio;
  let created;

  beforeEach(async () => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    nativeAudio = require('expo-av').Audio;
    created = [];
    nativeAudio.Sound.createAsync.mockImplementation(async () => {
      const sound = makeSound();
      created.push(sound);
      return { sound };
    });
    // Only the native boundary is mocked; initialize and playback use audio.js.
    audio = require('../../engine/audio');
    await audio.initializeAudio({ eagerLoadAll: true });
    nativeAudio.Sound.createAsync.mockClear();
    created.length = 0;
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects an invalid key before stopping or unloading the current music', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await audio.playMusic('gameplay');
    const current = created[0];
    await audio.playMusic('background');
    expect(warning).toHaveBeenCalledWith('Music track not found: background');
    expect(current.stopAsync).not.toHaveBeenCalled();
    expect(current.unloadAsync).not.toHaveBeenCalled();
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });

  it('resumes a paused same-track request without reloading or restarting it', async () => {
    await audio.playMusic('gameplay');
    const current = created[0];
    await audio.pauseMusic();
    await audio.playMusic('gameplay');
    expect(current.pauseAsync).toHaveBeenCalledTimes(1);
    expect(current.playAsync).toHaveBeenCalledTimes(1);
    expect(current.setPositionAsync).not.toHaveBeenCalled();
    expect(current.stopAsync).not.toHaveBeenCalled();
    expect(current.unloadAsync).not.toHaveBeenCalled();
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
    await audio.playMusic('gameplay');
    expect(current.playAsync).toHaveBeenCalledTimes(1);
  });

  it('waits for an in-flight native pause before an immediate same-track reentry', async () => {
    await audio.playMusic('gameplay');
    const current = created[0];
    const nativeOrder = [];
    let finishPause;
    current.pauseAsync.mockImplementation(() => new Promise(resolve => {
      finishPause = () => { nativeOrder.push('paused'); resolve(); };
    }));
    current.playAsync.mockImplementation(async () => { nativeOrder.push('resumed'); });

    const pausing = audio.pauseMusic();
    const replaying = audio.playMusic('gameplay');
    await Promise.resolve();
    expect(current.playAsync).not.toHaveBeenCalled();
    finishPause();
    await Promise.all([pausing, replaying]);

    expect(nativeOrder).toEqual(['paused', 'resumed']);
    expect(current.playAsync).toHaveBeenCalledTimes(1);
    expect(current.stopAsync).not.toHaveBeenCalled();
    expect(current.unloadAsync).not.toHaveBeenCalled();
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
    await audio.playMusic('gameplay');
    expect(current.playAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps an already-playing same track unchanged', async () => {
    await audio.playMusic('gameplay');
    await audio.playMusic('gameplay');
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
    expect(created[0].playAsync).not.toHaveBeenCalled();
    expect(created[0].stopAsync).not.toHaveBeenCalled();
  });

  it('still replaces a paused track when a different valid track is requested', async () => {
    await audio.playMusic('boss');
    const oldTrack = created[0];
    await audio.pauseMusic();
    await audio.playMusic('gameplay');
    expect(oldTrack.stopAsync).toHaveBeenCalledTimes(1);
    expect(oldTrack.unloadAsync).toHaveBeenCalledTimes(1);
    expect(oldTrack.playAsync).not.toHaveBeenCalled();
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(2);
    expect(nativeAudio.Sound.createAsync.mock.calls[1][1]).toEqual({ shouldPlay: true, isLooping: true, volume: 0.5 });
  });

  it('does not resume a requested track while music is disabled', async () => {
    await audio.playMusic('gameplay');
    const current = created[0];
    await audio.setMusicEnabled(false);
    await audio.playMusic('gameplay');
    expect(current.playAsync).not.toHaveBeenCalled();
    await audio.setMusicEnabled(true);
    expect(current.playAsync).toHaveBeenCalledTimes(1);
    await audio.playMusic('gameplay');
    expect(current.playAsync).toHaveBeenCalledTimes(1);
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });
});
