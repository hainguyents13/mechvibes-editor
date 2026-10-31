import JSZip from 'jszip';
import { getAudioDuration, getDecodedDuration } from '@/utils/audioUtils';
import {
  type AudioSource,
  addSources,
  createAudioSource,
  getExtension,
  ICON_TYPES,
  isRecord,
  type KeySounds,
  LICENSE_FILE_NAMES,
  listKeys,
  MOUSE_CODE,
  type PackExtras,
  type PackInfo,
  type PackType,
  type Segment,
  WHOLE_FILE,
} from '@/utils/soundPack';

export type ImportedSoundPack = {
  /** config.id, when the pack has one. */
  id: string | null;
  info: PackInfo;
  /** Audio files in the zip, the most used first; files no key uses come last. */
  sources: AudioSource[];
  keySounds: KeySounds;
  extras: PackExtras;
  /** Problems to show after opening: keys left out, or kept but silent or unplayable here. */
  warnings: string[];
  /** What the editor changed or kept that needs no fix, to show after opening. */
  notes: string[];
};

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac']);

// Fields the editor reads into its own state and writes back itself. Every
// other field of config.json is kept as it was.
const EDITOR_FIELDS = new Set([
  'config_version',
  'config_version_num',
  'id',
  'name',
  'author',
  'm_author',
  'description',
  'tags',
  'definition_method',
  'audio_file',
  'icon',
  'soundpack_type',
  'definitions',
  'defs',
]);

function getAudioMimeType(fileName: string) {
  const ext = getExtension(fileName);
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.flac') return 'audio/flac';
  return 'audio/ogg';
}

/** The way the app resolves a path in config.json against the pack folder. */
function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** A [start, end] pair in ms that plays something: not negative, not reversed. */
function isTimingPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    value[0] >= 0 &&
    value[1] > value[0]
  );
}

/** An audio file, not a macOS resource fork (`__MACOSX/`, `._name.ogg`). */
function isAudioEntry(name: string) {
  const base = name.slice(name.lastIndexOf('/') + 1);
  return (
    AUDIO_EXTENSIONS.has(getExtension(name)) &&
    !name.startsWith('__MACOSX/') &&
    !base.startsWith('._')
  );
}

/** Keys with a segment past the end of their file; files of unknown length are skipped. */
export function findSegmentsPastEnd(
  keySounds: KeySounds,
  sources: AudioSource[],
) {
  const lengths = new Map(
    sources.map((source) => [source.id, source.duration * 1000]),
  );
  const silent: string[] = [];
  const cutShort: string[] = [];
  keySounds.forEach(({ source, press, release }, code) => {
    const fileMs = lengths.get(source) ?? 0;
    if (fileMs <= 0) return;
    const segments = release ? [press, release] : [press];
    // Same rounding as the editor's own check (TimeSegmentControls).
    if (segments.some(([start]) => start >= fileMs)) silent.push(code);
    else if (segments.some(([, end]) => end > Math.ceil(fileMs))) {
      cutShort.push(code);
    }
  });
  return { silent, cutShort };
}

/**
 * Codes earlier editor versions wrote for the numpad 0, numpad . and Pause
 * keys by reading the wrong legend. No key sends these, so each can only mean
 * the key it came from.
 */
export const LEGACY_KEY_CODES: ReadonlyMap<string, string> = new Map([
  ['Ins', 'Numpad0'],
  ['Del', 'NumpadDecimal'],
  ['Break', 'Pause'],
]);

/** The code a definition is kept under, or null when the pack already defines the key it stands for. */
export function migrateKeyCode(
  code: string,
  definedCodes: ReadonlySet<string>,
): string | null {
  const target = LEGACY_KEY_CODES.get(code);
  if (!target) return code;
  return definedCodes.has(target) ? null : target;
}

function readPackType(explicit: unknown, codes: string[]): PackType {
  const value = typeof explicit === 'string' ? explicit.toLowerCase() : '';
  if (value === 'mouse') return 'Mouse';
  if (value === 'keyboard') return 'Keyboard';
  // Same detection as the app when the type is not declared.
  return codes.length > 0 && codes.every((code) => MOUSE_CODE.test(code))
    ? 'Mouse'
    : 'Keyboard';
}

/**
 * Parse a .zip sound pack in memory into the editor's model. Reads the
 * Mechvibes V2 config.json format, single and multi packs alike.
 */
export async function parseSoundPackZip(
  file: File,
): Promise<ImportedSoundPack> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const findEntry = (path: string) => {
    const name = normalizePath(path);
    return (
      entries.find((entry) => entry.name === name) ??
      entries.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    );
  };

  const configEntry = entries.find((entry) => entry.name === 'config.json');
  if (!configEntry) {
    throw new Error('Sound pack must include config.json.');
  }

  let config: unknown;
  try {
    config = JSON.parse(await configEntry.async('text'));
  } catch {
    throw new Error('config.json is not valid JSON.');
  }
  if (!isRecord(config)) {
    throw new Error('config.json must hold an object.');
  }

  if ('defines' in config && !('definitions' in config || 'defs' in config)) {
    throw new Error(
      'This is a classic Mechvibes (V1) pack. The editor opens V2 packs only.',
    );
  }
  if (Number(config.config_version) > 2) {
    throw new Error(
      `This pack uses config version ${config.config_version}, which is newer than the editor knows.`,
    );
  }

  // The app reads `definitions` whenever the key exists, and only then `defs`.
  const definitions =
    'definitions' in config ? config.definitions : config.defs;
  if (!isRecord(definitions)) {
    throw new Error('config.json has no key definitions.');
  }

  const isMulti = config.definition_method === 'multi';
  const mainAudioPath =
    typeof config.audio_file === 'string' && config.audio_file.trim()
      ? config.audio_file
      : undefined;

  // One source per audio file, loaded the first time a key points to it.
  const sourcesByEntry = new Map<string, AudioSource | null>();
  const loadSource = async (path: string | undefined) => {
    const entry = path ? findEntry(path) : undefined;
    if (!entry || !isAudioEntry(entry.name)) return null;
    if (!sourcesByEntry.has(entry.name)) {
      const blob = await entry.async('blob');
      const audioFile = new File([blob], entry.name, {
        type: getAudioMimeType(entry.name),
      });
      const duration =
        (await getAudioDuration(audioFile)) ||
        (await getDecodedDuration(audioFile));
      // The colour slot is set below, once the sources are in usage order.
      sourcesByEntry.set(entry.name, createAudioSource(audioFile, duration));
    }
    return sourcesByEntry.get(entry.name) ?? null;
  };

  // A single pack plays every key from its main file. Older exports may only
  // name the file per key, so fall back to that and then to any audio file.
  let singleSource: AudioSource | null = null;
  if (!isMulti) {
    const firstDefinition = Object.values(definitions)[0];
    const firstKeyPath =
      isRecord(firstDefinition) &&
      typeof firstDefinition.audio_file === 'string'
        ? firstDefinition.audio_file
        : undefined;
    const anyAudio = entries.find((entry) => isAudioEntry(entry.name));
    singleSource =
      (await loadSource(mainAudioPath)) ??
      (await loadSource(firstKeyPath)) ??
      (await loadSource(anyAudio?.name));
    if (!singleSource) {
      throw new Error('Sound pack must include at least one audio file.');
    }
  }

  const keySounds: KeySounds = new Map();
  const missingAudio: string[] = [];
  const invalidTiming: string[] = [];
  const tooManySegments: string[] = [];
  const definedCodes = new Set(Object.keys(definitions));
  const renamed: string[] = [];
  const shadowedLegacy: string[] = [];
  const unreadableWholeFile: string[] = [];

  for (const [rawCode, definition] of Object.entries(definitions)) {
    const code = migrateKeyCode(rawCode, definedCodes);
    if (code === null) {
      shadowedLegacy.push(rawCode);
      continue;
    }
    let source = singleSource;
    if (isMulti) {
      const ownPath =
        isRecord(definition) &&
        typeof definition.audio_file === 'string' &&
        definition.audio_file.trim()
          ? definition.audio_file
          : undefined;
      source = await loadSource(ownPath ?? mainAudioPath);
    }
    if (!source) {
      missingAudio.push(code);
      continue;
    }

    const timing =
      isRecord(definition) && 'timing' in definition
        ? definition.timing
        : definition;
    let segments: Segment[];
    if (isMulti && isRecord(definition) && !('timing' in definition)) {
      // In a multi pack a key without timing plays its whole file. When its
      // length is unknown, the key keeps no timing and is exported that way.
      segments =
        source.duration > 0 ? [[0, source.duration * 1000]] : [WHOLE_FILE];
      if (source.duration === 0) unreadableWholeFile.push(code);
    } else if (Array.isArray(timing) && timing.every(isTimingPair)) {
      segments = timing.map(([start, end]) => [start, end]);
    } else {
      invalidTiming.push(code);
      continue;
    }
    if (segments.length === 0 || segments.length > 2) {
      tooManySegments.push(code);
      continue;
    }
    keySounds.set(code, {
      source: source.id,
      press: segments[0],
      ...(segments[1] ? { release: segments[1] } : {}),
    });
    if (code !== rawCode) renamed.push(`${rawCode} is now ${code}`);
  }

  // Files no key plays stay in the editor, so sounds can still be cut from them.
  for (const entry of entries) {
    if (isAudioEntry(entry.name)) await loadSource(entry.name);
  }

  // Most used source first: it opens in the waveform and stays the main file.
  const usage = new Map<string, number>();
  keySounds.forEach(({ source }) => {
    usage.set(source, (usage.get(source) ?? 0) + 1);
  });
  const ordered = [...sourcesByEntry.values()]
    .filter((source): source is AudioSource => source !== null)
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  // Colours follow the list order, so the main file takes the first colour.
  const sources = addSources([], ordered);
  const { silent, cutShort } = findSegmentsPastEnd(keySounds, sources);

  const warnings: string[] = [];
  if (missingAudio.length > 0) {
    warnings.push(
      `Left out because their audio is not in the zip: ${listKeys(missingAudio)}.`,
    );
  }
  if (invalidTiming.length > 0) {
    warnings.push(
      `Left out because the app cannot read their timing: ${listKeys(invalidTiming)}.`,
    );
  }
  if (tooManySegments.length > 0) {
    warnings.push(
      `Left out because they have no sound or more than two, which the app plays as silence: ${listKeys(tooManySegments)}.`,
    );
  }
  if (shadowedLegacy.length > 0) {
    warnings.push(
      `Left out because the pack already defines the key they stand for: ${listKeys(shadowedLegacy)}.`,
    );
  }
  if (unreadableWholeFile.length > 0) {
    warnings.push(
      `This browser cannot read the audio of these keys, so you cannot hear or edit them here. They still play their whole file in the app and are exported unchanged: ${listKeys(unreadableWholeFile)}.`,
    );
  }
  if (silent.length > 0) {
    warnings.push(
      `Part of the sound of these keys starts after their audio file ends, so the app plays nothing there: ${listKeys(silent)}.`,
    );
  }
  const notes: string[] = [];
  if (renamed.length > 0) {
    notes.push(
      `Renamed key names the app does not know: ${renamed.join(', ')}.`,
    );
  }
  if (cutShort.length > 0) {
    notes.push(
      `These keys run past the end of their audio file. The app stops them where the file ends: ${listKeys(cutShort)}.`,
    );
  }
  const unusedNames = sources
    .filter((source) => !usage.has(source.id))
    .map((source) => source.file.name)
    .sort();
  if (unusedNames.length > 0) {
    const one = unusedNames.length === 1;
    notes.push(
      `Kept ${one ? 'an audio file' : `${unusedNames.length} audio files`} that no key uses: ${listKeys(unusedNames)}. You can cut sounds from ${one ? 'it' : 'them'} here, but Export leaves out files that no key uses.`,
    );
  }

  const iconEntry =
    (typeof config.icon === 'string' ? findEntry(config.icon) : undefined) ??
    entries.find((entry) => ICON_TYPES[getExtension(entry.name)]);
  const iconType = iconEntry ? ICON_TYPES[getExtension(iconEntry.name)] : '';
  const icon =
    iconEntry && iconType
      ? new File([await iconEntry.async('blob')], iconEntry.name, {
          type: iconType,
        })
      : null;

  const options = isRecord(config.options) ? config.options : {};
  const volume = Number(options.recommended_volume);
  const author =
    typeof config.author === 'string'
      ? config.author
      : typeof config.m_author === 'string'
        ? config.m_author
        : '';

  const extraConfig = Object.fromEntries(
    Object.entries(config).filter(([field]) => !EDITOR_FIELDS.has(field)),
  );
  const licenseFiles = await Promise.all(
    entries
      .filter((entry) => LICENSE_FILE_NAMES.has(entry.name.toLowerCase()))
      .map(
        async (entry) =>
          new File([await entry.async('blob')], entry.name, {
            type: 'text/plain',
          }),
      ),
  );

  return {
    id: typeof config.id === 'string' && config.id.trim() ? config.id : null,
    info: {
      name:
        typeof config.name === 'string'
          ? config.name
          : file.name.replace(/\.[^.]+$/, ''),
      author,
      description:
        typeof config.description === 'string' ? config.description : '',
      tags: Array.isArray(config.tags)
        ? config.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      packType: readPackType(config.soundpack_type, Object.keys(definitions)),
      recommendedVolume:
        Number.isFinite(volume) && volume >= 0 && volume <= 2 ? volume : 1,
      randomPitch: options.random_pitch === true,
      icon,
    },
    sources,
    keySounds,
    extras: { config: extraConfig, files: licenseFiles },
    warnings,
    notes,
  };
}
