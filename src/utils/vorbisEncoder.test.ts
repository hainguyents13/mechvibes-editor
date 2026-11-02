import { describe, expect, it, vi } from 'vitest';

describe('vorbis-encoder-js', () => {
  // The site's Content-Security-Policy has no 'unsafe-eval', so the encoder
  // must work with eval blocked or every export falls back to the source files.
  it('encodes OGG without calling eval', async () => {
    const blockedEval = vi.fn(() => {
      throw new EvalError("Refused to evaluate a string: no 'unsafe-eval'");
    });
    vi.stubGlobal('eval', blockedEval);

    const { encoder: VorbisEncoder } = await import('vorbis-encoder-js');
    const sampleRate = 44100;
    const tone = new Float32Array(sampleRate / 10).map((_, i) =>
      Math.sin((2 * Math.PI * 440 * i) / sampleRate),
    );
    const encoder = new VorbisEncoder(sampleRate, 1, 0.4);
    encoder.encode([tone]);
    const ogg = await encoder.finish().arrayBuffer();

    expect(blockedEval).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(new Uint8Array(ogg, 0, 4))).toBe('OggS');
  });
});
