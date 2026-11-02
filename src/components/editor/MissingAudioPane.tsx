import { FileAudio } from 'lucide-react';
import React from 'react';
import { plural } from '@/lib/utils';
import { isMediaFile } from '@/utils/audioUtils';

/**
 * The open file when its audio is missing: nothing to draw or play, only the
 * keys that wait for it and the way to give it audio again.
 */
export function MissingAudioPane({
  name,
  count,
  noun,
  isReading,
  onReplace,
}: {
  name: string;
  /** How many keys play the file. */
  count: number;
  /** What the pack's keys are called: 'key' or 'button'. */
  noun: string;
  /** Files are being read: Replace file… waits, so one replace runs at a time. */
  isReading: boolean;
  onReplace: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-start gap-3 rounded-box border border-error/30 bg-error/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-base-content">
        <FileAudio className="h-4 w-4 shrink-0 text-error" />
        <span className="min-w-0 break-all">{name} has no audio</span>
      </p>
      <p className="text-base-content/80">
        {count === 0
          ? `No ${noun} uses it.`
          : `${plural(count, noun)} ${count === 1 ? 'keeps its' : 'keep their'} times and ${count === 1 ? 'plays' : 'play'} nothing until you give the file audio. Any audio or video file works, in any format.`}
      </p>
      <button
        type="button"
        className="btn btn-sm btn-primary rounded-box"
        disabled={isReading}
        onClick={() => inputRef.current?.click()}
      >
        Replace file…
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        aria-label={`Replace ${name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file && isMediaFile(file)) onReplace(file);
        }}
      />
    </div>
  );
}
