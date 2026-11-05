import { describe, expect, it } from 'vitest';
import {
  BUNDLED_VOCABULARY,
  parseVocabulary,
  withoutFieldWords,
} from '@/lib/packVocabulary';

describe('parseVocabulary', () => {
  it('takes the lists the website sends', () => {
    const vocabulary = parseVocabulary({
      types: [{ value: 'keyboard', label: 'Keyboard' }],
      categories: [
        { value: 'realistic', label: 'Realistic', hint: 'Real keyboards' },
        { value: 'retro', label: 'Retro' },
      ],
      soundProfiles: [{ value: 'deep', label: 'Deep' }],
      maxSoundProfiles: 2,
      switchTypes: [{ value: 'linear', label: 'Linear' }],
      suggestedTags: ['voice', 'meme'],
      maxTags: 10,
      maxTagLength: 20,
    });

    expect(vocabulary).toEqual({
      categories: [
        { value: 'realistic', label: 'Realistic', hint: 'Real keyboards' },
        { value: 'retro', label: 'Retro', hint: '' },
      ],
      soundProfiles: [{ value: 'deep', label: 'Deep' }],
      maxSoundProfiles: 2,
      switchTypes: [{ value: 'linear', label: 'Linear' }],
      suggestedTags: ['voice', 'meme'],
      maxTags: 10,
      maxTagLength: 20,
    });
  });

  it('keeps the bundled list for anything missing or malformed', () => {
    expect(parseVocabulary(null)).toBe(BUNDLED_VOCABULARY);
    expect(
      parseVocabulary({
        categories: [{ value: '', label: 'Empty' }, 'game'],
        soundProfiles: 'thocky',
        maxSoundProfiles: -1,
        maxTags: 2.5,
      }),
    ).toEqual(BUNDLED_VOCABULARY);
  });
});

describe('withoutFieldWords', () => {
  it('drops categories, sound words and switch types, in any case', () => {
    expect(
      withoutFieldWords(
        ['Game', 'thocky', ' Linear ', 'cherry', 'lubed'],
        BUNDLED_VOCABULARY,
      ),
    ).toEqual(['cherry', 'lubed']);
  });
});
