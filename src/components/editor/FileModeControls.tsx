import type React from 'react';
import { applyAudioFileToKeys } from '@/utils/audioUtils';

interface FileModeControlsProps {
  selectedKeys: Set<string>;
  modifiedKeys: Map<string, [number, number]>;
  setModifiedKeys: React.Dispatch<
    React.SetStateAction<Map<string, [number, number]>>
  >;
  audioDuration: number;
}

export function FileModeControls({
  selectedKeys,
  modifiedKeys,
  setModifiedKeys,
  audioDuration,
}: FileModeControlsProps) {
  return (
    <fieldset className="fieldset">
      <span className="text-xs font-medium text-base-content">File mode</span>
      <div className="space-y-2">
        <p className="text-xs text-base-content/60">
          In file mode, each selected key will use this entire audio file.
        </p>
        <button
          type="button"
          className="btn btn-sm btn-primary rounded-box"
          onClick={() => {
            if (selectedKeys.size > 0) {
              const newModifiedKeys = applyAudioFileToKeys(
                selectedKeys,
                audioDuration,
                modifiedKeys,
              );
              setModifiedKeys(newModifiedKeys);
            }
          }}
          disabled={selectedKeys.size === 0}
          title={`Apply audio file to ${selectedKeys.size} selected key${selectedKeys.size !== 1 ? 's' : ''}`}
        >
          Apply to Keys
        </button>
      </div>
    </fieldset>
  );
}
