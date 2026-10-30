import JSZip from 'jszip';

export type ImportedSoundPack = {
  name: string;
  author: string;
  description: string;
  mode: 'time' | 'file';
  audioFile: File;
  modifiedKeys: Map<string, [number, number]>;
};

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac']);

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function getAudioMimeType(fileName: string) {
  const ext = getExtension(fileName);
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.flac') return 'audio/flac';
  return 'audio/ogg';
}

/**
 * Parse a .zip sound pack in memory and map its contents to editor settings.
 * Supports the Mechvibes V2 config.json format.
 */
export async function parseSoundPackZip(
  file: File,
): Promise<ImportedSoundPack> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  const configEntry = entries.find((entry) => entry.name === 'config.json');
  if (!configEntry) {
    throw new Error('Sound pack must include config.json.');
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(await configEntry.async('text'));
  } catch {
    throw new Error('config.json is not valid JSON.');
  }

  const definitions = (config.definitions ?? config.defs ?? {}) as Record<
    string,
    unknown
  >;
  const audioEntries = entries.filter((entry) =>
    AUDIO_EXTENSIONS.has(getExtension(entry.name)),
  );

  // Resolve the main audio file: config.audio_file -> per-key file (multi) -> first audio entry
  let audioFileName =
    typeof config.audio_file === 'string' ? config.audio_file : undefined;
  if (!audioFileName) {
    const firstDef = Object.values(definitions)[0] as
      | Record<string, unknown>
      | undefined;
    if (firstDef && typeof firstDef.audio_file === 'string') {
      audioFileName = firstDef.audio_file;
    }
  }

  let audioEntry = audioEntries.find((entry) => entry.name === audioFileName);
  if (!audioEntry) {
    audioEntry = audioEntries[0];
  }
  if (!audioEntry) {
    throw new Error('Sound pack must include at least one audio file.');
  }

  const blob = await audioEntry.async('blob');
  const audioFile = new File([blob], audioEntry.name, {
    type: getAudioMimeType(audioEntry.name),
  });

  // Build the modified-keys map from definitions. Each entry maps a key code
  // (e.g. "KeyA") to { timing: [[start, end], ...] } — keep the first segment.
  const modifiedKeys = new Map<string, [number, number]>();
  for (const [keyCode, def] of Object.entries(definitions)) {
    const timing = (def as { timing?: unknown })?.timing;
    if (
      Array.isArray(timing) &&
      timing.length > 0 &&
      Array.isArray(timing[0]) &&
      timing[0].length >= 2
    ) {
      modifiedKeys.set(keyCode, [Number(timing[0][0]), Number(timing[0][1])]);
    }
  }

  return {
    name:
      typeof config.name === 'string'
        ? config.name
        : file.name.replace(/\.[^.]+$/, ''),
    author: typeof config.author === 'string' ? config.author : '',
    description:
      typeof config.description === 'string' ? config.description : '',
    mode: config.definition_method === 'multi' ? 'file' : 'time',
    audioFile,
    modifiedKeys,
  };
}
