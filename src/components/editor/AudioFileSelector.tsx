import { Music, Upload, Video, X } from 'lucide-react';
import type React from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import { useAudioFile } from '@/hooks/useAudioFile';

interface AudioFileSelectorProps {
  audioFile: File | null;
  audioDuration: number;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/** Short format label from a MIME type, e.g. "audio/mpeg" -> "MPEG". */
function formatLabel(file: File): string {
  const subtype = file.type.split('/')[1] ?? '';
  return (subtype.replace(/^x-/, '') || 'unknown').toUpperCase();
}

export function AudioFileSelector({
  audioFile,
  audioDuration,
  onFileSelect,
  onClearFile,
  videoRef,
}: AudioFileSelectorProps) {
  const { handleDragOver, handleDragEnter, handleDragLeave, formatDuration } =
    useAudioFile();

  const isVideo = audioFile?.type.startsWith('video/') ?? false;

  // Handle file selection from input
  const handleInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (
      file &&
      (file.type.startsWith('audio/') || file.type.startsWith('video/'))
    ) {
      onFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        onFileSelect(file);
      }
    }
  };

  if (!audioFile) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: mouse-driven editor surface ported unchanged from the website; keyboard access is a follow-up
      <div
        className="group h-full min-h-32 min-w-0 flex flex-col items-center justify-center editor-dropzone-surface border border-dashed border-base-content/20 rounded-box p-8 text-center hover:border-base-content/40 transition-colors cursor-pointer motion-safe:animate-[dropzone-glow_2.4s_ease-out_infinite] hover:animate-none"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        onClick={() => document.getElementById('audio-file-input')?.click()}
      >
        <Upload className="h-12 w-12 text-base-content/40 mb-3" />
        <h2 className="text-sm font-medium text-base-content mb-3">
          Select your audio or video source
        </h2>
        <div className="flex items-center gap-3 mb-3 text-primary">
          <Music className="h-8 w-8" />
          <span className="text-2xl font-light text-base-content/30">/</span>
          <Video className="h-8 w-8" />
        </div>
        <div className="text-sm text-base-content/60 mb-1.5">
          Drop an{' '}
          <span className="text-primary underline underline-offset-2">
            audio
          </span>{' '}
          or{' '}
          <span className="text-primary underline underline-offset-2">
            video
          </span>{' '}
          file here, or click to select
        </div>
        <div className="text-xs text-base-content/40">
          Audio: MP3, WAV, OGG, M4A · Video: MP4, WebM
        </div>
        <div className="mt-1.5 text-xs text-base-content/40">
          Video is used for its audio track — the clip stays visible for
          reference
        </div>
        <input
          id="audio-file-input"
          type="file"
          className="hidden"
          accept="audio/*,video/*"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  const sizeMb = `${(audioFile.size / (1024 * 1024)).toFixed(1)} MB`;
  const meta = `${sizeMb} • ${formatDuration(audioDuration)}`;

  // Audio tracks will become a multi-file list; today it holds the one selected file.
  const audioTracks = isVideo ? [] : [audioFile];

  return (
    <div className="h-full min-w-0 flex flex-col gap-3">
      {isVideo ? (
        /* Video: the file itself titles the panel, clear button on the same row */
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="h-4 w-4 shrink-0 text-primary" />
              <h2
                className="text-xs font-medium text-base-content truncate"
                title={audioFile.name}
              >
                {audioFile.name}
              </h2>
              <span className="shrink-0 badge badge-xs badge-primary font-semibold tracking-wide">
                {formatLabel(audioFile)}
              </span>
            </div>
            {/* Indented to line up with the title, past the icon and its gap */}
            <div className="pl-6 text-[10px] text-base-content/60">{meta}</div>
          </div>
          <button
            type="button"
            className="shrink-0 btn btn-xs btn-ghost rounded-box text-error"
            onClick={onClearFile}
            title="Clear file"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      ) : (
        <h2 className="text-xs font-medium text-base-content shrink-0">
          Audio or video sources ({audioTracks.length})
        </h2>
      )}

      {isVideo ? (
        /* Video: preview takes the whole panel so portrait clips stay as large as possible */
        <div className="flex-1 min-h-0 rounded-box flex items-center justify-center overflow-hidden">
          {/* src is assigned by CombinedWaveform, which uses this element as its media source */}
          {/* biome-ignore lint/a11y/useMediaCaption: user-supplied video, no captions exist */}
          <video
            ref={videoRef}
            controls
            className="max-w-full max-h-full rounded-box object-contain"
          />
        </div>
      ) : (
        /* Audio: one row per track, each with its own palette colour and clear button */
        <ul className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
          {audioTracks.map((track, index) => {
            const color = getAudioTrackColor(index);
            return (
              <li
                key={`${track.name}-${index}`}
                className={`flex items-center gap-3 rounded-box border border-base-content/10 border-l-4 ${color.border} ${color.bg} p-2 pl-3`}
              >
                <Music className={`h-4 w-4 shrink-0 mr-1 ${color.text}`} />
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs font-medium text-base-content truncate"
                    title={track.name}
                  >
                    {track.name}
                  </div>
                  <div className="text-[10px] text-base-content/60">
                    {formatLabel(track)} • {meta}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 btn btn-xs btn-ghost btn-square rounded-box text-error"
                  onClick={onClearFile}
                  title={`Remove ${track.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
