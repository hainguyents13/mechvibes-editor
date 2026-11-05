import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeAudio, readPackZip } from '@/test/packZip';
import { getAudioDuration } from '@/utils/audioUtils';
import {
  createAudioSource,
  type KeySound,
  type PackInfo,
  WHOLE_FILE,
} from '@/utils/soundPack';
import { buildSoundPackZip } from '@/utils/soundPackExport';
import { parseSoundPackZip } from '@/utils/soundPackImport';

vi.mock('@/utils/audioUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/audioUtils')>()),
  // Node has no media elements to read a length from.
  getAudioDuration: vi.fn(async () => 1),
}));

/** Set by a test to make the encoder throw, as when its chunk fails to load. */
const encoderFails = vi.hoisted(() => ({ now: false }));

// Writes what it was given in place of OGG data, so a test can read it back.
vi.mock('vorbis-encoder-js', () => ({
  encoder: class {
    sampleRate: number;
    channelCount: number;
    samples = 0;
    constructor(sampleRate: number, channelCount: number) {
      this.sampleRate = sampleRate;
      this.channelCount = channelCount;
    }
    encode(chunk: Float32Array[]) {
      if (encoderFails.now) throw new Error('encoder failed');
      this.samples += chunk[0]?.length ?? 0;
    }
    finish() {
      return new Blob(
        [
          `encoded ${this.samples} samples, ${this.channelCount} channel at ${this.sampleRate} Hz`,
        ],
        { type: 'audio/ogg' },
      );
    }
  },
}));

/** Decodes any file to one channel at 1000 Hz, so a sample is a millisecond. */
class FakeAudioContext {
  async resume() {}
  async close() {}
  async decodeAudioData() {
    const data = Float32Array.from({ length: 1000 }, (_, i) => i);
    return {
      numberOfChannels: 1,
      sampleRate: 1000,
      getChannelData: () => data,
    };
  }
}

class FailingAudioContext extends FakeAudioContext {
  async decodeAudioData(): Promise<never> {
    throw new Error('cannot decode');
  }
}

const info: PackInfo = {
  name: 'Test pack',
  author: 'Tester',
  description: '',
  tags: [],
  category: null,
  soundProfiles: [],
  switchType: null,
  sourceUrl: null,
  packType: 'Keyboard',
  recommendedVolume: 1,
  randomPitch: false,
  icon: null,
};

/** Export one file with the given key sounds. */
function exportFile(
  file: File,
  sounds: Record<string, Omit<KeySound, 'source'>>,
) {
  const source = createAudioSource(file, 1);
  return buildSoundPackZip({
    info,
    sources: [source],
    keySounds: new Map(
      Object.entries(sounds).map(([code, sound]) => [
        code,
        { source: source.id, ...sound },
      ]),
    ),
  });
}

describe('buildSoundPackZip', () => {
  afterEach(() => {
    encoderFails.now = false;
    vi.restoreAllMocks();
    vi.mocked(getAudioDuration).mockReset();
  });

  it('cuts a video down to the segments keys use', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const blob = await exportFile(
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      {
        KeyA: { press: [500, 600], release: [600, 650] },
        KeyB: { press: [100, 200] },
        KeyC: { press: [500, 600] },
      },
    );
    const out = await readPackZip(blob);

    expect(out.names).toEqual(['audio.ogg', 'config.json']);
    // Overlapping segments are cut once, in the order they play.
    expect(await out.text('audio.ogg')).toBe(
      'encoded 250 samples, 1 channel at 1000 Hz',
    );
    expect(out.config.definitions).toEqual({
      KeyA: {
        timing: [
          [100, 200],
          [200, 250],
        ],
      },
      KeyB: { timing: [[0, 100]] },
      KeyC: { timing: [[100, 200]] },
    });

    const pack = await parseSoundPackZip(
      new File([blob], 'pack.zip', { type: 'application/zip' }),
    );
    const again = await readPackZip(
      await buildSoundPackZip({
        id: pack.id ?? undefined,
        info: pack.info,
        sources: pack.sources,
        keySounds: pack.keySounds,
        extras: pack.extras,
      }),
    );
    expect(again.configText).toBe(out.configText);
  });

  it('encodes a WAV source to OGG', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const out = await readPackZip(
      await exportFile(new File(['wave'], 'tap.wav', { type: 'audio/wav' }), {
        KeyA: { press: [0, 600] },
      }),
    );

    expect(out.names).toEqual(['audio.ogg', 'config.json']);
    expect(await out.text('audio.ogg')).toBe(
      'encoded 1000 samples, 1 channel at 1000 Hz',
    );
    expect(out.config.definitions).toEqual({ KeyA: { timing: [[0, 600]] } });
  });

  it('cuts a recording its keys play less than half of down to those parts', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const out = await readPackZip(
      await exportFile(new File(['mp3'], 'take.mp3', { type: 'audio/mpeg' }), {
        KeyA: { press: [200, 300], release: [700, 750] },
        KeyB: { press: [200, 300] },
      }),
    );

    expect(out.names).toEqual(['audio.ogg', 'config.json']);
    expect(await out.text('audio.ogg')).toBe(
      'encoded 150 samples, 1 channel at 1000 Hz',
    );
    expect(out.config.definitions).toEqual({
      KeyA: {
        timing: [
          [0, 100],
          [100, 150],
        ],
      },
      KeyB: { timing: [[0, 100]] },
    });
  });

  it('keeps an MP3 its keys play at least half of', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const out = await readPackZip(
      await exportFile(new File(['mp3'], 'take.mp3', { type: 'audio/mpeg' }), {
        KeyA: { press: [0, 500] },
      }),
    );

    expect(out.names).toEqual(['audio.mp3', 'config.json']);
    expect(await out.text('audio.mp3')).toBe('mp3');
    expect(out.config.definitions).toEqual({ KeyA: { timing: [[0, 500]] } });
  });

  it('keeps a mostly unused MP3 whole when it cannot be encoded', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    encoderFails.now = true;
    const out = await readPackZip(
      await exportFile(new File(['mp3'], 'take.mp3', { type: 'audio/mpeg' }), {
        KeyA: { press: [200, 300] },
      }),
    );

    expect(out.names).toEqual(['audio.mp3', 'config.json']);
    expect(out.config.definitions).toEqual({ KeyA: { timing: [[200, 300]] } });
  });

  it('keeps an MP3 whole when a part starts past its end', async () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const out = await readPackZip(
      await exportFile(new File(['mp3'], 'take.mp3', { type: 'audio/mpeg' }), {
        KeyA: { press: [1200, 1300], release: [100, 150] },
      }),
    );

    expect(out.names).toEqual(['audio.mp3', 'config.json']);
    expect(out.config.definitions).toEqual({
      KeyA: {
        timing: [
          [1200, 1300],
          [100, 150],
        ],
      },
    });
  });

  it('keeps a mostly unused MP3 whole when it cannot be decoded', async () => {
    vi.stubGlobal('window', { AudioContext: FailingAudioContext });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await readPackZip(
      await exportFile(new File(['mp3'], 'take.mp3', { type: 'audio/mpeg' }), {
        KeyA: { press: [200, 300] },
      }),
    );

    expect(out.names).toEqual(['audio.mp3', 'config.json']);
    expect(await out.text('audio.mp3')).toBe('mp3');
    expect(out.config.definitions).toEqual({ KeyA: { timing: [[200, 300]] } });
  });

  it('keeps a WAV source when it cannot be encoded', async () => {
    vi.stubGlobal('window', { AudioContext: FailingAudioContext });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await readPackZip(
      await exportFile(new File(['wave'], 'tap.wav', { type: 'audio/wav' }), {
        KeyA: { press: [0, 100] },
      }),
    );

    expect(out.names).toEqual(['audio.wav', 'config.json']);
    expect(await out.text('audio.wav')).toBe('wave');
    expect(out.config.audio_file).toBe('audio.wav');
  });

  it('refuses a file the app cannot play when it cannot be encoded', async () => {
    vi.stubGlobal('window', { AudioContext: FailingAudioContext });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      exportFile(new File(['aac'], 'clip.m4a', { type: 'audio/mp4' }), {
        KeyA: { press: [0, 100] },
      }),
    ).rejects.toThrow(
      'Could not convert clip.m4a to OGG. Use an MP3, OGG or WAV file instead.',
    );
  });

  it('refuses a video it cannot decode', async () => {
    vi.stubGlobal('window', { AudioContext: FailingAudioContext });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      exportFile(new File(['video'], 'clip.mp4', { type: 'video/mp4' }), {
        KeyA: { press: [0, 100] },
      }),
    ).rejects.toThrow('Could not extract audio from clip.mp4 for export.');
  });

  it('writes a key that plays its whole file without timing, in a multi pack', async () => {
    const out = await readPackZip(
      await exportFile(
        new File([fakeAudio('a')], 'click.ogg', { type: 'audio/ogg' }),
        { KeyA: { press: WHOLE_FILE }, KeyB: { press: [0, 50] } },
      ),
    );

    expect(out.names).toEqual(['click.ogg', 'config.json']);
    expect(await out.bytes('click.ogg')).toEqual(fakeAudio('a'));
    expect(out.config.definition_method).toBe('multi');
    expect(out.config.audio_file).toBe('click.ogg');
    expect(out.config.definitions).toEqual({
      KeyA: { audio_file: 'click.ogg' },
      KeyB: { audio_file: 'click.ogg', timing: [[0, 50]] },
    });
  });

  it('leaves out a file no key uses, and opens a whole-file key the same again', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(0);
    const used = createAudioSource(
      new File([fakeAudio('a')], 'a.ogg', { type: 'audio/ogg' }),
      0,
    );
    const unused = createAudioSource(
      new File([fakeAudio('b')], 'b.ogg', { type: 'audio/ogg' }),
      1,
    );
    const blob = await buildSoundPackZip({
      info,
      sources: [used, unused],
      keySounds: new Map([['KeyA', { source: used.id, press: WHOLE_FILE }]]),
    });
    const out = await readPackZip(blob);

    expect(out.names).toEqual(['a.ogg', 'config.json']);
    expect(out.config.definitions).toEqual({ KeyA: { audio_file: 'a.ogg' } });

    const pack = await parseSoundPackZip(
      new File([blob], 'pack.zip', { type: 'application/zip' }),
    );
    expect(pack.keySounds.get('KeyA')?.press).toEqual(WHOLE_FILE);
    const again = await readPackZip(
      await buildSoundPackZip({
        info: pack.info,
        sources: pack.sources,
        keySounds: pack.keySounds,
        extras: pack.extras,
      }),
    );
    expect(again.configText).toBe(out.configText);
  });
});

describe('the source link in config.json', () => {
  const sound = createAudioSource(
    new File([fakeAudio('main')], 'sound.ogg', { type: 'audio/ogg' }),
    1,
  );
  const exportWith = async (sourceUrl: string | null) =>
    readPackZip(
      await buildSoundPackZip({
        info: { ...info, sourceUrl },
        sources: [sound],
        keySounds: new Map([
          ['KeyA', { source: sound.id, press: [0, 100] as [number, number] }],
        ]),
      }),
    );

  it('is written as source_url when set', async () => {
    const out = await exportWith('https://www.youtube.com/watch?v=abc123');
    expect(out.config.source_url).toBe(
      'https://www.youtube.com/watch?v=abc123',
    );
  });

  it('is left out when there is none', async () => {
    const out = await exportWith(null);
    expect(out.config).not.toHaveProperty('source_url');
  });
});
