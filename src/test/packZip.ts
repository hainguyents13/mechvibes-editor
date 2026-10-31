import JSZip from 'jszip';

type ZipContent = string | Uint8Array<ArrayBuffer> | Record<string, unknown>;

/** Stand-in audio bytes. The editor copies OGG and MP3 into the zip as they are. */
export function fakeAudio(tag: string) {
  return new TextEncoder().encode(`OggS ${tag}`);
}

/** A .zip File from path to content; objects are written as JSON. */
export async function makePackZip(files: Record<string, ZipContent>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(
      path,
      typeof content === 'string' || content instanceof Uint8Array
        ? content
        : JSON.stringify(content, null, 2),
    );
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'pack.zip', { type: 'application/zip' });
}

/** The files of a built pack, with config.json as text and parsed. */
export async function readPackZip(blob: Blob) {
  const zip = await JSZip.loadAsync(blob);
  const names = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => entry.name)
    .sort();
  const bytes = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw new Error(`${path} is not in the zip`);
    return entry.async('uint8array');
  };
  const text = async (path: string) =>
    new TextDecoder().decode(await bytes(path));
  const configText = await text('config.json');
  return {
    names,
    bytes,
    text,
    configText,
    config: JSON.parse(configText) as Record<string, unknown>,
  };
}
