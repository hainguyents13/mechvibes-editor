import { describe, expect, it } from 'vitest';
import {
  inferKindsFromPack,
  inferNewFileKind,
  kindFromLength,
} from '@/lib/fileKinds';
import {
  type AudioSource,
  type KeySound,
  type KeySounds,
  WHOLE_FILE,
} from '@/utils/soundPack';

const file = (name: string, type = '') => ({ name, type });

describe('inferNewFileKind', () => {
  it('lets the tile the person chose win over the file', () => {
    const short = file('a.wav', 'audio/wav');
    const long = file('typing.m4a', 'audio/mp4');
    const video = file('clip.mp4', 'video/mp4');
    expect(inferNewFileKind(short, 0.3, 'recording')).toBe('many');
    expect(inferNewFileKind(short, 0.3, 'video')).toBe('many');
    expect(inferNewFileKind(long, 252, 'per-key')).toBe('one');
    expect(inferNewFileKind(video, 0.2, 'per-key')).toBe('one');
  });

  it('takes a video for a recording, however short', () => {
    expect(inferNewFileKind(file('1.mp4', 'video/mp4'), 0.2)).toBe('many');
    // The type can be missing; the extension tells.
    expect(inferNewFileKind(file('clip.mov'), 0.5)).toBe('many');
  });

  it('takes a file up to 1.0 s for one sound and a longer one for many', () => {
    expect(inferNewFileKind(file('a.wav'), 0.07)).toBe('one');
    expect(inferNewFileKind(file('a.ogg'), 1.0)).toBe('one');
    expect(inferNewFileKind(file('extra.wav'), 1.01)).toBe('many');
    // ping.mp3, the shortest recording of clicks the app ships.
    expect(inferNewFileKind(file('ping.mp3'), 1.1)).toBe('many');
  });

  it('keeps the waveform for a file whose length is unknown', () => {
    expect(kindFromLength(0)).toBe('many');
    expect(inferNewFileKind(file('a.wav'), 0)).toBe('many');
  });
});

const source = (id: string, duration: number): AudioSource => ({
  id,
  file: new File([], `${id}.ogg`, { type: 'audio/ogg' }),
  duration,
  colorIndex: 0,
});

const sounds = (entries: [string, KeySound][]): KeySounds => new Map(entries);

describe('inferKindsFromPack', () => {
  it('makes a file with a release on any key a recording', () => {
    // Shaped like mouse/chat, which the app ships: 1.41 s, press and release.
    const chat = source('chat', 1.41);
    const keySounds = sounds([
      ['MouseLeft', { source: 'chat', press: [26, 156], release: [176, 545] }],
      ['MouseRight', { source: 'chat', press: [26, 156], release: [176, 545] }],
    ]);
    expect(inferKindsFromPack([chat], keySounds).get('chat')).toBe('many');
  });

  it('makes a file with different parts on its keys a recording', () => {
    // Shaped like keyboard/eg-oreo: one file, a part for each key.
    const oreo = source('oreo', 25.6);
    const keySounds = sounds([
      ['AltLeft', { source: 'oreo', press: [21399, 21458.5] }],
      ['ArrowDown', { source: 'oreo', press: [24087, 24146.5] }],
    ]);
    expect(inferKindsFromPack([oreo], keySounds).get('oreo')).toBe('many');
  });

  it('makes a file whose keys all play it whole one sound', () => {
    const a = source('a', 0.3);
    const long = source('long', 252);
    const unread = source('unread', 0);
    const keySounds = sounds([
      ['KeyA', { source: 'a', press: [0, 300] }],
      ['KeyS', { source: 'a', press: [0, 300] }],
      ['Space', { source: 'long', press: [0, 252000] }],
      ['Enter', { source: 'unread', press: WHOLE_FILE }],
    ]);
    expect(
      Object.fromEntries(inferKindsFromPack([a, long, unread], keySounds)),
    ).toEqual({ a: 'one', long: 'one', unread: 'one' });
  });

  it('makes one shared part of a short file one sound', () => {
    const a = source('a', 0.8);
    const keySounds = sounds([
      ['KeyA', { source: 'a', press: [20, 300] }],
      ['KeyB', { source: 'a', press: [20, 300] }],
    ]);
    expect(inferKindsFromPack([a], keySounds).get('a')).toBe('one');
  });

  it('keeps a long recording whose keys share one part of it a recording', () => {
    // Every key given the same cut of a 4 minute take, then downloaded and
    // opened again: its waveform stays.
    const take = source('take', 252);
    const keySounds = sounds([
      ['KeyA', { source: 'take', press: [1000, 1200] }],
      ['KeyB', { source: 'take', press: [1000, 1200] }],
    ]);
    expect(inferKindsFromPack([take], keySounds).get('take')).toBe('many');
  });

  it('reads a file no key plays by its length', () => {
    const keySounds = sounds([]);
    const kinds = inferKindsFromPack(
      [source('short', 0.4), source('long', 3), source('unread', 0)],
      keySounds,
    );
    expect(Object.fromEntries(kinds)).toEqual({
      short: 'one',
      long: 'many',
      unread: 'many',
    });
  });
});
