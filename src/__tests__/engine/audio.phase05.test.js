jest.mock('expo-av', () => ({
  Audio: { setAudioModeAsync: jest.fn(async () => {}), Sound: { createAsync: jest.fn() } },
}));

const makeSound = () => ({
  playAsync: jest.fn(async () => {}), pauseAsync: jest.fn(async () => {}),
  stopAsync: jest.fn(async () => {}), unloadAsync: jest.fn(async () => {}),
  setPositionAsync: jest.fn(async () => {}), setVolumeAsync: jest.fn(async () => {}),
});

describe('production menu music gain', () => {
  let audio, nativeAudio, created;
  beforeEach(async () => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    nativeAudio = require('expo-av').Audio;
    created = [];
    nativeAudio.Sound.createAsync.mockImplementation(async () => {
      const sound = makeSound(); created.push(sound); return { sound };
    });
    audio = require('../../engine/audio');
    await audio.initializeAudio({ eagerLoadAll: true });
    nativeAudio.Sound.createAsync.mockClear(); created.length = 0;
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([['menu', 0.125], ['gameplay', 0.5], ['boss', 0.5]])(
    'loads %s at its track gain without changing the preference', async (track, volume) => {
      await audio.playMusic(track);
      expect(nativeAudio.Sound.createAsync.mock.calls[0][1].volume).toBe(volume);
      expect(audio.getAudioSettings().musicVolume).toBe(0.5);
    },
  );

  it('multiplies a restored volume by exactly one quarter for the menu', async () => {
    await audio.setMusicVolume(0.8);
    await audio.playMusic('menu');
    expect(nativeAudio.Sound.createAsync.mock.calls[0][1].volume).toBeCloseTo(0.2);
    expect(audio.getAudioSettings().musicVolume).toBe(0.8);
    expect(audio.MENU_MUSIC_MULTIPLIER).toBe(0.25);
  });

  it('keeps the gain on live volume changes but restores full preference on gameplay', async () => {
    await audio.playMusic('menu');
    await audio.setMusicVolume(0.6);
    expect(created[0].setVolumeAsync).toHaveBeenLastCalledWith(0.15);
    await audio.playMusic('gameplay');
    expect(nativeAudio.Sound.createAsync.mock.calls[1][1].volume).toBe(0.6);
    expect(audio.getAudioSettings().musicVolume).toBe(0.6);
  });

  it('reapplies menu gain before a same-track resume without reloading or compounding', async () => {
    await audio.playMusic('menu');
    const menu = created[0];
    await audio.pauseMusic(); menu.setVolumeAsync.mockClear();
    await audio.playMusic('menu');
    expect(menu.setVolumeAsync).toHaveBeenLastCalledWith(0.125);
    expect(menu.setVolumeAsync.mock.invocationCallOrder[0]).toBeLessThan(menu.playAsync.mock.invocationCallOrder[0]);
    await audio.playMusic('menu');
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(1);
    expect(audio.getAudioSettings().musicVolume).toBe(0.5);
  });

  it('respects disabled music and retains menu gain when enabled again', async () => {
    await audio.playMusic('menu');
    await audio.setMusicEnabled(false);
    await audio.setMusicVolume(0.72);
    await audio.playMusic('menu');
    expect(created[0].playAsync).not.toHaveBeenCalled();
    await audio.setMusicEnabled(true);
    expect(created[0].setVolumeAsync).toHaveBeenLastCalledWith(0.18);
    expect(created[0].playAsync).toHaveBeenCalledTimes(1);
    expect(audio.getAudioSettings()).toMatchObject({ musicEnabled: true, musicVolume: 0.72 });
  });

  it('does not create music when disabled before the first menu request', async () => {
    await audio.setMusicEnabled(false);
    await audio.playMusic('menu');
    expect(nativeAudio.Sound.createAsync).not.toHaveBeenCalled();
  });
});
