import React, { useId, useState } from 'react';
import { ImagePlus, X } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReturnFocus } from '@/hooks/useReturnFocus';
import {
  REALISTIC,
  usePackVocabulary,
  withoutFieldWords,
} from '@/lib/packVocabulary';
import { cn } from '@/lib/utils';
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

const FIELD_CLASS = 'flex flex-col gap-1.5';
const HINT_CLASS = 'm-0 text-xs leading-normal text-mv-subtle';
const LEGEND_CLASS =
  'mb-1.5 p-0 text-[13px] font-bold leading-snug text-mv-ink';
const OPTIONAL = <span className="font-normal text-mv-faint">(optional)</span>;

/** A word to pick, as the website's pack form draws it. */
function Chip({
  on,
  disabled = false,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-[26px] cursor-pointer items-center rounded-full px-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        on
          ? 'bg-mv-fill font-bold text-mv-ink shadow-[inset_0_0_0_1.5px_var(--mv-ink)]'
          : 'text-mv-text shadow-[inset_0_0_0_1px_var(--mv-line)] enabled:hover:text-mv-ink',
      )}
    >
      {children}
    </button>
  );
}

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

const hasTag = (tags: string[], tag: string) =>
  tags.some((each) => each.toLowerCase() === tag);

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
  const soundsRef = React.useRef<HTMLFieldSetElement>(null);
  const [soundsMissing, setSoundsMissing] = useState(false);
  const id = useId();
  const returnFocus = useReturnFocus();
  const vocabulary = usePackVocabulary();

  const realistic = formData.category === REALISTIC;
  const category = vocabulary.categories.find(
    (entry) => entry.value === formData.category,
  );
  const tagList = parseTags(formData.tags);
  const keptTags = withoutFieldWords(tagList, vocabulary);
  const longTag = keptTags.find((tag) => tag.length > vocabulary.maxTagLength);

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
    // The website asks a realistic pack how it sounds before it takes it.
    if (realistic && formData.soundProfiles.length === 0) {
      setSoundsMissing(true);
      soundsRef.current?.scrollIntoView({ block: 'center' });
      soundsRef.current?.querySelector('button')?.focus();
      return;
    }
    onSave({
      ...formData,
      tags: keptTags,
      // Only a realistic pack has a switch type.
      switchType: realistic ? formData.switchType : null,
    });
    onClose();
  };

  const toggleSound = (value: string) => {
    setSoundsMissing(false);
    setFormData((prev) => ({
      ...prev,
      soundProfiles: prev.soundProfiles.includes(value)
        ? prev.soundProfiles.filter((profile) => profile !== value)
        : [...prev.soundProfiles, value],
    }));
  };

  const toggleTag = (tag: string) =>
    setFormData((prev) => {
      const tags = parseTags(prev.tags);
      return {
        ...prev,
        tags: (hasTag(tags, tag)
          ? tags.filter((each) => each.toLowerCase() !== tag)
          : [...tags, tag]
        ).join(', '),
      };
    });

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

  const iconTooLarge = formData.icon && formData.icon.size > MAX_ICON_BYTES;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        aria-describedby={undefined}
        // A click beside the form would lose what was typed; Esc, Cancel and
        // the close button still close it.
        onInteractOutside={(event) => event.preventDefault()}
        className="flex max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="flex shrink-0 items-center pt-[18px] pr-14 pb-3.5 pl-5">
            <DialogTitle className="mb-0 text-xl tracking-[-0.015em]">
              Edit Pack Information
            </DialogTitle>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-1 pb-5">
            {isLibraryPack && (
              <p className="m-0 rounded-[10px] bg-mv-fill p-3 text-xs leading-normal text-mv-muted">
                This pack is in the library. When you update it, the website
                keeps the name, description, category, sound, tags and author
                from the pack's page, so change those there.
              </p>
            )}

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-name`}>Name</Label>
              <Input
                id={`${id}-name`}
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="My Sound Pack..."
                required
              />
            </div>

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-author`}>Author</Label>
              <Input
                id={`${id}-author`}
                type="text"
                value={formData.author}
                onChange={handleChange('author')}
                placeholder="Your name..."
                aria-describedby={`${id}-author-hint`}
              />
              <p id={`${id}-author-hint`} className={HINT_CLASS}>
                Shown as the pack author when someone installs it. Left empty,
                the name of the account you are signed in with is used. Packs in
                the library always show the account's name.
              </p>
            </div>

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-description`}>Description</Label>
              <textarea
                id={`${id}-description`}
                className="mv-field resize-y"
                value={formData.description}
                onChange={handleChange('description')}
                placeholder='Make it short and sweet. For example: "My custom sound pack."'
              />
            </div>

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-category`}>Category</Label>
              <select
                id={`${id}-category`}
                className="mv-field"
                value={formData.category ?? ''}
                onChange={(e) => {
                  setSoundsMissing(false);
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value || null,
                  }));
                }}
                aria-describedby={`${id}-category-hint`}
              >
                <option value="">Choose one</option>
                {vocabulary.categories.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <p id={`${id}-category-hint`} className={HINT_CLASS}>
                {category?.hint || 'Where the pack is listed in the library'}
              </p>
            </div>

            <fieldset
              ref={soundsRef}
              className="m-0 min-w-0 border-0 p-0"
              aria-describedby={`${id}-sounds-hint`}
            >
              <legend className={LEGEND_CLASS}>
                How it sounds {!realistic && OPTIONAL}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.soundProfiles.map((entry) => {
                  const on = formData.soundProfiles.includes(entry.value);
                  return (
                    <Chip
                      key={entry.value}
                      on={on}
                      disabled={
                        !on &&
                        formData.soundProfiles.length >=
                          vocabulary.maxSoundProfiles
                      }
                      onClick={() => toggleSound(entry.value)}
                    >
                      {entry.label}
                    </Chip>
                  );
                })}
              </div>
              <p
                id={`${id}-sounds-hint`}
                role={soundsMissing ? 'alert' : undefined}
                className={cn(
                  HINT_CLASS,
                  'mt-1.5',
                  soundsMissing && 'text-mv-danger',
                )}
              >
                {soundsMissing
                  ? 'A realistic pack needs at least one word for how it sounds.'
                  : `Pick ${realistic ? 1 : 'up'} to ${vocabulary.maxSoundProfiles}. They show on the pack page and help people find it.`}
              </p>
            </fieldset>

            {realistic && (
              <div className={FIELD_CLASS}>
                <Label htmlFor={`${id}-switch`}>Switch type {OPTIONAL}</Label>
                <select
                  id={`${id}-switch`}
                  className="mv-field"
                  value={formData.switchType ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      switchType: e.target.value || null,
                    }))
                  }
                >
                  <option value="">Not sure or none</option>
                  {vocabulary.switchTypes.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-tags`}>Tags {OPTIONAL}</Label>
              <Input
                id={`${id}-tags`}
                type="text"
                value={formData.tags}
                onChange={handleChange('tags')}
                placeholder="gaming, quiet, 75%"
                aria-describedby={`${id}-tags-hint`}
              />
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.suggestedTags.map((tag) => (
                  <Chip
                    key={tag}
                    on={hasTag(tagList, tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
              <p
                id={`${id}-tags-hint`}
                className={cn(
                  HINT_CLASS,
                  (longTag || keptTags.length > vocabulary.maxTags) &&
                    'text-mv-danger',
                )}
              >
                {longTag
                  ? `"${longTag}" is ${longTag.length} characters. The library takes tags up to ${vocabulary.maxTagLength}.`
                  : keptTags.length > vocabulary.maxTags
                    ? `That is ${keptTags.length} tags. The library keeps the first ${vocabulary.maxTags}.`
                    : 'Separate tags with commas. No need to repeat the category, sound or switch type.'}
              </p>
            </div>

            <div className={FIELD_CLASS}>
              <span className="text-[13px] font-bold leading-snug text-mv-ink">
                Icon
              </span>
              <div className="flex items-center gap-3">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="size-[52px] shrink-0 rounded-xl bg-mv-fill object-cover"
                  />
                ) : (
                  <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-mv-fill">
                    <ImagePlus
                      className="size-5 text-mv-faint"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => iconInputRef.current?.click()}
                  >
                    {formData.icon ? 'Change' : 'Choose image'}
                  </Button>
                  {formData.icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, icon: null }))
                      }
                    >
                      Remove
                    </Button>
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
                className={`${HINT_CLASS} ${iconTooLarge ? 'text-mv-danger' : ''}`}
              >
                {formData.icon && iconTooLarge
                  ? `This image is ${Math.ceil(formData.icon.size / 1024)} KB. The library takes icons up to 512 KB.`
                  : 'PNG, JPG or WebP. A square image around 512×512 works best.'}
              </p>
            </div>

            <div className={FIELD_CLASS}>
              <Label htmlFor={`${id}-volume`}>Recommended volume</Label>
              <div className="flex items-center gap-3">
                <input
                  id={`${id}-volume`}
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  className="min-w-0 flex-1 cursor-pointer accent-mv-ink"
                  value={formData.recommendedVolume}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recommendedVolume: Number(e.target.value),
                    }))
                  }
                  aria-label="Recommended volume"
                />
                <span className="w-11 text-right font-code text-xs font-medium tabular-nums text-mv-muted">
                  {Math.round(formData.recommendedVolume * 100)}%
                </span>
              </div>
              <p className={HINT_CLASS}>
                A starting volume for the pack, from 0% to 200%
              </p>
            </div>

            <div className={FIELD_CLASS}>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-bold text-mv-ink">
                <input
                  type="checkbox"
                  className="m-0 size-[18px] cursor-pointer accent-mv-ink"
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
              <p className={HINT_CLASS}>
                Each keystroke plays at a slightly different pitch
              </p>
            </div>
          </div>

          {/* Outside the scrolling fields, so Save stays in view. */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-mv-line bg-mv-raised px-5 py-3.5 max-sm:[&>*]:flex-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>

        {/* Last, so the focus starts on the first field rather than here. */}
        <DialogClose
          aria-label="Close"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'absolute top-4 right-4',
          )}
        >
          <X className="size-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
