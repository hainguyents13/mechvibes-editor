import { useEffect, useSyncExternalStore } from 'react';
import { getPackVocabulary } from '@/lib/websiteApi';
import { isRecord } from '@/utils/soundPack';

// The words a pack is described with, shared with mechvibes.com so the editor
// offers the same lists as the website's pack form. The website serves them at
// /api/sound-packs/vocabulary; the copy here is used until that answers, and
// whenever it cannot be reached.

export type VocabularyEntry = { value: string; label: string };
export type CategoryEntry = VocabularyEntry & { hint: string };

export type PackVocabulary = {
  categories: CategoryEntry[];
  soundProfiles: VocabularyEntry[];
  maxSoundProfiles: number;
  /** Asked only of realistic packs. */
  switchTypes: VocabularyEntry[];
  suggestedTags: string[];
  maxTags: number;
  maxTagLength: number;
};

/** The only category whose packs have a switch type, and must say how they sound. */
export const REALISTIC = 'realistic';

export const BUNDLED_VOCABULARY: PackVocabulary = {
  categories: [
    {
      value: 'realistic',
      label: 'Realistic',
      hint: 'Real keyboards, mice and typewriters',
    },
    { value: 'game', label: 'Game', hint: 'Sounds from a game, show or film' },
    {
      value: 'fun',
      label: 'Fun',
      hint: 'Memes, voices, animals and everyday things',
    },
    {
      value: 'app',
      label: 'App sounds',
      hint: 'Sounds of an app or system, like a phone keyboard',
    },
  ],
  soundProfiles: [
    { value: 'thocky', label: 'Thocky' },
    { value: 'creamy', label: 'Creamy' },
    { value: 'clacky', label: 'Clacky' },
    { value: 'clicky', label: 'Clicky' },
    { value: 'marbly', label: 'Marbly' },
    { value: 'poppy', label: 'Poppy' },
    { value: 'muted', label: 'Muted' },
    { value: 'typewriter', label: 'Typewriter' },
  ],
  maxSoundProfiles: 3,
  switchTypes: [
    { value: 'linear', label: 'Linear' },
    { value: 'tactile', label: 'Tactile' },
    { value: 'clicky', label: 'Clicky' },
    { value: 'magnetic', label: 'Magnetic (Hall effect)' },
    { value: 'optical', label: 'Optical' },
    { value: 'topre', label: 'Topre' },
    { value: 'membrane', label: 'Membrane or laptop' },
  ],
  suggestedTags: [
    'voice',
    'animal',
    'meme',
    'asmr',
    'loud',
    'lubed',
    'modded',
    'stock',
  ],
  maxTags: 12,
  maxTagLength: 30,
};

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

function entries(value: unknown): VocabularyEntry[] | null {
  if (!Array.isArray(value)) return null;
  const list = value.filter(
    (entry): entry is VocabularyEntry =>
      isRecord(entry) && isText(entry.value) && isText(entry.label),
  );
  return list.length > 0
    ? list.map(({ value, label }) => ({ value, label }))
    : null;
}

const count = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;

/**
 * The website's answer as a vocabulary. A list or number that is missing or
 * not of the expected shape keeps the bundled one, so a change on the website
 * never leaves the form without a list.
 */
export function parseVocabulary(body: unknown): PackVocabulary {
  if (!isRecord(body)) return BUNDLED_VOCABULARY;
  const fallback = BUNDLED_VOCABULARY;
  const categories = entries(body.categories)?.map((entry) => {
    const sent = (body.categories as Record<string, unknown>[]).find(
      (category) => category.value === entry.value,
    );
    return { ...entry, hint: isText(sent?.hint) ? sent.hint : '' };
  });
  const suggestedTags = Array.isArray(body.suggestedTags)
    ? body.suggestedTags.filter(isText)
    : [];
  return {
    categories: categories ?? fallback.categories,
    soundProfiles: entries(body.soundProfiles) ?? fallback.soundProfiles,
    maxSoundProfiles: count(body.maxSoundProfiles) ?? fallback.maxSoundProfiles,
    switchTypes: entries(body.switchTypes) ?? fallback.switchTypes,
    suggestedTags:
      suggestedTags.length > 0 ? suggestedTags : fallback.suggestedTags,
    maxTags: count(body.maxTags) ?? fallback.maxTags,
    maxTagLength: count(body.maxTagLength) ?? fallback.maxTagLength,
  };
}

let latest = BUNDLED_VOCABULARY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** The website's lists once they arrived, the bundled ones until then. */
export function currentVocabulary() {
  return latest;
}

function loadVocabulary() {
  if (loading) return;
  loading = getPackVocabulary()
    .then((body) => {
      latest = parseVocabulary(body);
      for (const listener of listeners) listener();
    })
    .catch(() => {
      // Offline or the website is down: the bundled lists stay, and the
      // next form to open asks again.
      loading = null;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The vocabulary for a form, asking the website for it once per visit. */
export function usePackVocabulary() {
  useEffect(loadVocabulary, []);
  return useSyncExternalStore(subscribe, currentVocabulary);
}

const has = (list: VocabularyEntry[], value: unknown): value is string =>
  typeof value === 'string' && list.some((entry) => entry.value === value);

/** Words that have a field of their own: a tag of one would only repeat it. */
function fieldWords(vocabulary: PackVocabulary) {
  return new Set(
    [
      ...vocabulary.categories,
      ...vocabulary.soundProfiles,
      ...vocabulary.switchTypes,
    ].map((entry) => entry.value),
  );
}

/** Tags without the category, sound and switch type words, which the website drops. */
export function withoutFieldWords(tags: string[], vocabulary: PackVocabulary) {
  const words = fieldWords(vocabulary);
  return tags.filter((tag) => !words.has(tag.trim().toLowerCase()));
}

export type PackDetails = {
  category: string | null;
  soundProfiles: string[];
  switchType: string | null;
  tags: string[];
};

/**
 * A pack's category, sound words and switch type from its config.json, with
 * only values on the lists taken. A pack made before these fields had them,
 * if at all, as tags: such a tag fills its empty field and leaves the tags.
 * A switch tag marks a realistic pack, the only kind with a switch type.
 */
export function readPackDetails(
  config: Record<string, unknown>,
  tags: string[],
  vocabulary: PackVocabulary,
): PackDetails {
  const tagWords = tags.map((tag) => tag.trim().toLowerCase());
  const profilesSet = Array.isArray(config.sound_profiles)
    ? config.sound_profiles.filter((value) =>
        has(vocabulary.soundProfiles, value),
      )
    : [];
  const soundProfiles = [
    ...new Set(
      profilesSet.length > 0
        ? profilesSet
        : tagWords.filter((word) => has(vocabulary.soundProfiles, word)),
    ),
  ].slice(0, vocabulary.maxSoundProfiles);
  const switchTag = tagWords.find(
    (word) =>
      has(vocabulary.switchTypes, word) && !has(vocabulary.soundProfiles, word),
  );
  const category = has(vocabulary.categories, config.category)
    ? config.category
    : (tagWords.find((word) => has(vocabulary.categories, word)) ??
      (switchTag ? REALISTIC : null));
  const switchType =
    category !== REALISTIC
      ? null
      : has(vocabulary.switchTypes, config.switch_type)
        ? config.switch_type
        : (switchTag ?? null);
  return {
    category,
    soundProfiles,
    switchType,
    tags: withoutFieldWords(tags, vocabulary),
  };
}
