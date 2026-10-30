import { ImagePlus, X } from 'lucide-react';
import React, { useState } from 'react';
import { ICON_TYPES, MAX_ICON_BYTES, type PackInfo } from '@/utils/soundPack';

interface EditPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  packInfo: PackInfo;
  onSave: (info: PackInfo) => void;
  /** A library pack is open: the website writes its name, description, tags and author. */
  isLibraryPack?: boolean;
}

type FormData = Omit<PackInfo, 'tags'> & { tags: string };

const ICON_ACCEPT = Object.keys(ICON_TYPES).join(',');

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function EditPackModal({
  isOpen,
  onClose,
  packInfo,
  onSave,
  isLibraryPack = false,
}: EditPackModalProps) {
  const [formData, setFormData] = useState<FormData>({
    ...packInfo,
    tags: packInfo.tags.join(', '),
  });
  const iconInputRef = React.useRef<HTMLInputElement>(null);

  const iconUrl = React.useMemo(
    () => (formData.icon ? URL.createObjectURL(formData.icon) : null),
    [formData.icon],
  );
  React.useEffect(
    () => () => {
      if (iconUrl) URL.revokeObjectURL(iconUrl);
    },
    [iconUrl],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, tags: parseTags(formData.tags) });
    onClose();
  };

  const handleChange =
    (field: 'name' | 'author' | 'description' | 'tags') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const ext = file ? file.name.slice(file.name.lastIndexOf('.')) : '';
    if (file && ICON_TYPES[ext.toLowerCase()]) {
      setFormData((prev) => ({ ...prev, icon: file }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">Edit Pack Information</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {isLibraryPack && (
            <p className="text-xs text-base-content/70 bg-base-200 rounded-box p-3">
              This pack is in the library. When you update it, the website keeps
              the name, description, tags and author from the pack's page, so
              change those there.
            </p>
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
              placeholder="mechanical, clicky, cherry"
            />
            <p className="label text-xs mt-1">Separate tags with commas</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Icon</legend>
            <div className="flex items-center gap-3">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-box bg-base-200 object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-box bg-base-200 flex items-center justify-center">
                  <ImagePlus className="h-5 w-5 text-base-content/40" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm rounded-box"
                  onClick={() => iconInputRef.current?.click()}
                >
                  {formData.icon ? 'Change' : 'Choose image'}
                </button>
                {formData.icon && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost rounded-box"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, icon: null }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept={ICON_ACCEPT}
                className="hidden"
                onChange={handleIconChange}
              />
            </div>
            <p
              className={`label text-xs mt-1 whitespace-normal ${formData.icon && formData.icon.size > MAX_ICON_BYTES ? 'text-warning' : ''}`}
            >
              {formData.icon && formData.icon.size > MAX_ICON_BYTES
                ? `This image is ${Math.ceil(formData.icon.size / 1024)} KB. The library takes icons up to 512 KB.`
                : 'PNG, JPG or WebP. A square image around 512×512 works best.'}
            </p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Recommended volume</legend>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                className="range range-xs flex-1"
                value={formData.recommendedVolume}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recommendedVolume: Number(e.target.value),
                  }))
                }
                aria-label="Recommended volume"
              />
              <span className="text-xs w-12 text-right tabular-nums">
                {Math.round(formData.recommendedVolume * 100)}%
              </span>
            </div>
            <p className="label text-xs mt-1">
              A starting volume for the pack, from 0% to 200%
            </p>
          </fieldset>

          <fieldset className="fieldset">
            <label className="label cursor-pointer justify-start gap-3 text-sm text-base-content">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={formData.randomPitch}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    randomPitch: e.target.checked,
                  }))
                }
              />
              Random pitch
            </label>
            <p className="label text-xs mt-1 whitespace-normal">
              Each keystroke plays at a slightly different pitch
            </p>
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
