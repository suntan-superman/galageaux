jest.mock('expo-av', () => ({
  Audio: { setAudioModeAsync: jest.fn(), Sound: { createAsync: jest.fn() } },
}));

const makeSound = () => ({
  playAsync: jest.fn(async () => {}), pauseAsync: jest.fn(async () => {}),
  stopAsync: jest.fn(async () => {}), unloadAsync: jest.fn(async () => {}),
  setPositionAsync: jest.fn(async () => {}), setVolumeAsync: jest.fn(async () => {}),
});

describe('release audio initialization and screen handoffs', () => {
  let audio, nativeAudio, created;
  const musicCalls = () => nativeAudio.Sound.createAsync.mock.calls
    .filter(([, options]) => options.shouldPlay);

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    nativeAudio = require('expo-av').Audio;
    nativeAudio.setAudioModeAsync.mockResolvedValue();
    created = [];
    nativeAudio.Sound.createAsync.mockImplementation(async () => {
      const sound = makeSound(); created.push(sound); return { sound };
    });
    audio = require('../../engine/audio');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shares the exact in-flight cold initialization until critical sounds are ready', async () => {
    let finishMode;
    nativeAudio.setAudioModeAsync.mockImplementation(() => new Promise(resolve => { finishMode = resolve; }));
    let fromSubscriber;
    const unsubscribe = audio.subscribeToAudioState(status => {
      if (status.initializing) fromSubscriber = audio.initializeAudio();
    });
    const menu = audio.initializeAudio();
    const game = audio.initializeAudio();
    expect(game).toBe(menu);
    expect(fromSubscriber).toBe(menu);
    unsubscribe();
    expect(audio.getAudioStatus()).toMatchObject({ initialized: false, initializing: true });
    expect(nativeAudio.setAudioModeAsync).toHaveBeenCalledTimes(1);
    finishMode();
    const results = await Promise.all([menu, game]);
    expect(results).toEqual([expect.objectContaining({ success: true }), expect.objectContaining({ success: true })]);
    expect(audio.getAudioStatus()).toMatchObject({ initialized: true, initializing: false });
    expect(nativeAudio.Sound.createAsync).toHaveBeenCalledTimes(6);
  });

  it('starts gameplay music after immediate Play while the menu initialization is unfinished', async () => {
    let finishMode;
    nativeAudio.setAudioModeAsync.mockImplementation(() => new Promise(resolve => { finishMode = resolve; }));
    let menuVisible = true;
    const menuInit = audio.initializeAudio();
    const menuPlayback = menuInit.then(() => menuVisible && audio.playMusic('menu'));
    menuVisible = false;
    const gamePlayback = audio.initializeAudio().then(() => audio.playMusic('gameplay'));
    expect(musicCalls()).toHaveLength(0);
    finishMode();
    await Promise.all([menuPlayback, gamePlayback]);
    expect(musicCalls()).toHaveLength(1);
    expect(musicCalls()[0][1]).toMatchObject({ shouldPlay: true, volume: 0.5 });
  });

  it('waits for readiness when a terminal music event arrives before initialization finishes', async () => {
    let finishMode;
    nativeAudio.setAudioModeAsync.mockImplementation(() => new Promise(resolve => { finishMode = resolve; }));
    const gameOver = audio.playMusic('gameOver');
    for (let i = 0; i < 5 && !finishMode; i++) await Promise.resolve();
    expect(finishMode).toEqual(expect.any(Function));
    expect(musicCalls()).toHaveLength(0);
    finishMode();
    await gameOver;
    expect(musicCalls()).toHaveLength(1);
    expect(musicCalls()[0][1].volume).toBe(0.5);
  });

  it('keeps Show Me on the menu track, then switches to gameplay only on Play Now', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('menu');
    expect(musicCalls()).toHaveLength(1);
    const menuSound = created.at(-1);
    // Show Me is a presentation-only route and makes no music request.
    await audio.playMusic('gameplay');
    expect(menuSound.stopAsync).toHaveBeenCalledTimes(1);
    expect(menuSound.unloadAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.5);
  });

  it('remembers a cold Play request made while muted and starts it when music is enabled', async () => {
    await audio.setMusicEnabled(false);
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('gameplay');
    expect(musicCalls()).toHaveLength(0);
    await audio.setMusicEnabled(true);
    expect(musicCalls()).toHaveLength(1);
    expect(musicCalls()[0][1].volume).toBe(0.5);
    await audio.playMusic('menu');
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.125);
  });

  it('replays only the latest route and its loop setting after several muted transitions', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('boss');
    const boss = created.at(-1);
    await audio.setMusicEnabled(false);
    await audio.playMusic('gameplay');
    await audio.playMusic('menu', false);
    expect(musicCalls()).toHaveLength(1);
    await audio.setMusicEnabled(true);
    expect(boss.pauseAsync).toHaveBeenCalledTimes(1);
    expect(boss.stopAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1]).toMatchObject({ isLooping: false, volume: 0.125 });
  });

  it('updates the loop setting of an already loaded track after a muted request', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('menu');
    const firstMenu = created.at(-1);
    await audio.setMusicEnabled(false);
    await audio.playMusic('menu', false);
    await audio.setMusicEnabled(true);
    expect(firstMenu.stopAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].isLooping).toBe(false);
  });

  it('resumes the current track without loading it twice after a simple mute toggle', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('gameplay');
    const gameplay = created.at(-1);
    await audio.setMusicEnabled(false);
    await audio.setMusicEnabled(true);
    expect(gameplay.pauseAsync).toHaveBeenCalledTimes(1);
    expect(gameplay.playAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(1);
  });

  it('disposes a delayed stale load before playing the latest route after re-enable', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    const stale = makeSound();
    let finishBoss;
    nativeAudio.Sound.createAsync.mockImplementation((file, options) => {
      if (options.shouldPlay && !finishBoss) {
        return new Promise(resolve => { finishBoss = () => resolve({ sound: stale }); });
      }
      const sound = makeSound(); created.push(sound); return Promise.resolve({ sound });
    });
    const boss = audio.playMusic('boss');
    for (let i = 0; i < 5 && !finishBoss; i++) await Promise.resolve();
    expect(finishBoss).toEqual(expect.any(Function));
    await audio.setMusicEnabled(false);
    const menu = audio.playMusic('menu');
    const enable = audio.setMusicEnabled(true);
    finishBoss();
    await Promise.all([boss, menu, enable]);
    expect(stale.stopAsync).toHaveBeenCalledTimes(1);
    expect(stale.unloadAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.125);
  });

  it('clears a muted terminal request so re-enabling cannot revive game-over music', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.setMusicEnabled(false);
    await audio.playMusic('gameOver');
    await audio.stopMusic();
    await audio.setMusicEnabled(true);
    expect(musicCalls()).toHaveLength(0);
    await audio.playMusic('menu');
    expect(musicCalls()).toHaveLength(1);
    expect(musicCalls()[0][1].volume).toBe(0.125);
  });

  it('moves from boss to game over to retry gameplay to the quieter menu', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('boss');
    await audio.playMusic('gameOver');
    await audio.playMusic('gameplay');
    const gameplaySound = created.at(-1);
    await audio.pauseMusic();
    await audio.playMusic('menu');
    expect(gameplaySound.pauseAsync).toHaveBeenCalledTimes(1);
    expect(gameplaySound.stopAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(4);
    expect(musicCalls().map(([, options]) => options.volume)).toEqual([0.5, 0.5, 0.5, 0.125]);
  });

  it('disposes a stale native game-over load when Menu is requested during it', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    const stale = makeSound();
    let finishGameOver;
    nativeAudio.Sound.createAsync.mockImplementation((file, options) => {
      if (options.shouldPlay && !finishGameOver) {
        return new Promise(resolve => { finishGameOver = () => resolve({ sound: stale }); });
      }
      const sound = makeSound(); created.push(sound); return Promise.resolve({ sound });
    });
    const gameOver = audio.playMusic('gameOver');
    for (let i = 0; i < 5 && !finishGameOver; i++) await Promise.resolve();
    expect(finishGameOver).toEqual(expect.any(Function));
    const menu = audio.playMusic('menu');
    finishGameOver();
    await Promise.all([gameOver, menu]);
    expect(stale.stopAsync).toHaveBeenCalledTimes(1);
    expect(stale.unloadAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.125);
    await audio.playMusic('menu');
    expect(musicCalls()).toHaveLength(2);
  });

  it('allows a menu request to supersede a pending victory stop without leaving music silent', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('boss');
    const boss = created.at(-1);
    const victoryStop = audio.stopMusic();
    const menu = audio.playMusic('menu');
    await Promise.all([victoryStop, menu]);
    expect(boss.stopAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.125);
  });

  it('still clears terminal music if the next screen has music disabled', async () => {
    await audio.initializeAudio({ eagerLoadAll: true });
    await audio.playMusic('boss');
    const boss = created.at(-1);
    const victoryStop = audio.stopMusic();
    const menu = audio.playMusic('menu');
    await audio.setMusicEnabled(false);
    await Promise.all([victoryStop, menu]);
    expect(boss.stopAsync).toHaveBeenCalledTimes(1);
    expect(musicCalls()).toHaveLength(1);
    await audio.setMusicEnabled(true);
    expect(boss.playAsync).not.toHaveBeenCalled();
    expect(musicCalls()).toHaveLength(2);
    expect(musicCalls()[1][1].volume).toBe(0.125);
  });
});
