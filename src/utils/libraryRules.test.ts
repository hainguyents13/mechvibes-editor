import { describe, expect, it } from 'vitest';
import { libraryKeyProblems } from '@/utils/libraryRules';
import type { KeySounds } from '@/utils/soundPack';

const sound = { source: 's', press: [0, 100] as [number, number] };
const keys = (codes: string[]): KeySounds =>
  new Map(codes.map((code) => [code, sound]));
const LETTERS = Array.from(
  { length: 26 },
  (_, i) => `Key${String.fromCharCode(65 + i)}`,
);
const OTHERS = Array.from({ length: 40 }, (_, i) => `F${i + 1}`);

describe('libraryKeyProblems', () => {
  it('passes a keyboard pack with 60 keys and every letter', () => {
    expect(
      libraryKeyProblems(
        'Keyboard',
        keys([...LETTERS, ...OTHERS.slice(0, 34)]),
      ),
    ).toEqual([]);
  });

  it('asks for at least 60 keys, not counting mouse buttons', () => {
    expect(
      libraryKeyProblems(
        'Keyboard',
        keys([...LETTERS, ...OTHERS.slice(0, 33), 'MouseLeft']),
      ),
    ).toEqual(['Only 59 keys have a sound. The library needs at least 60.']);
  });

  it('lists the letter keys that play nothing when more than 5 do', () => {
    expect(
      libraryKeyProblems('Keyboard', keys([...LETTERS.slice(6), ...OTHERS])),
    ).toEqual([
      '6 letter keys play nothing (A B C D E F). The library allows at most 5.',
    ]);
    expect(
      libraryKeyProblems('Keyboard', keys([...LETTERS.slice(5), ...OTHERS])),
    ).toEqual([]);
  });

  it('gives both reasons, with one key in the singular', () => {
    expect(libraryKeyProblems('Keyboard', keys(['KeyA']))).toEqual([
      'Only 1 key has a sound. The library needs at least 60.',
      '25 letter keys play nothing (B C D E F G H I J K L M N O P Q R S T U V W X Y Z). The library allows at most 5.',
    ]);
  });

  it('has no key rules for a mouse pack', () => {
    expect(libraryKeyProblems('Mouse', keys(['MouseLeft']))).toEqual([]);
  });
});
