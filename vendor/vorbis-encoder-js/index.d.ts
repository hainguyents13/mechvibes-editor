export class encoder {
  constructor(
    sampleRate: number,
    numChannels: number,
    quality: number,
    tags?: Record<string, string>,
  );
  encodeFrom(audioBuffer: AudioBuffer): void;
  encode(buffers: Float32Array[]): void;
  finish(mimeType?: string): Blob;
  cancel(): void;
}
export const libvorbis: unknown;