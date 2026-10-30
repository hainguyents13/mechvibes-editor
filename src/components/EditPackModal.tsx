import { X } from 'lucide-react';
import { useState } from 'react';

interface PackInfo {
  name: string;
  author: string;
  description: string;
  tags: string;
  mode: 'time' | 'file';
}

interface EditPackModalProps {
  /** Library id the editor was opened for; shown read-only. */
  libraryPackId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  packInfo: PackInfo;
  onSave: (info: PackInfo) => void;
}

export function EditPackModal({
  libraryPackId,
  isOpen,
  onClose,
  packInfo,
  onSave,
}: EditPackModalProps) {
  const [formData, setFormData] = useState(packInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange =
    (field: keyof PackInfo) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">Edit Pack Information</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Mode</legend>
            <select
              className="select select-sm w-full"
              value={formData.mode}
              onChange={handleChange('mode')}
            >
              <option value="time">Time segments</option>
              <option value="file" disabled>
                Sound file per key (coming soon)
              </option>
            </select>
            <p className="label text-xs mt-1">
              {formData.mode === 'time'
                ? 'Use one audio file and select different time segments for each key'
                : 'Upload individual audio files for each key'}
            </p>
          </fieldset>

          {libraryPackId && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Library ID</legend>
              <input
                type="text"
                className="input input-sm w-full font-mono"
                value={libraryPackId}
                readOnly
              />
              <p className="label text-xs mt-1">
                Issued by the library and written into the exported pack
              </p>
            </fieldset>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name</legend>
            <input
              type="text"
              className="input input-sm w-full"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="My Sound Pack..."
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Author</legend>
            <input
              type="text"
              className="input input-sm w-full"
              value={formData.author}
              onChange={handleChange('author')}
              placeholder="Your name..."
            />
            <p className="label text-xs mt-1">
              Shown as the pack author when someone installs it
            </p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description</legend>
            <textarea
              className="textarea textarea-sm h-24 w-full"
              value={formData.description}
              onChange={handleChange('description')}
              placeholder='Make it short and sweet. For example: "My custom sound pack."'
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Tags</legend>
            <input
              type="text"
              className="input input-sm w-full"
              value={formData.tags}
              onChange={handleChange('tags')}
              placeholder="Tags..."
            />
          </fieldset>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost rounded-box"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm btn-primary rounded-box"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
