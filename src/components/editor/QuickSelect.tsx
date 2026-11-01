import React from 'react';
import { KEY_GROUPS } from '@/components/editor/key-groups';
import type { LayoutKey } from '@/components/editor/keyboardLayouts';
import { cn } from '@/lib/utils';

/** The Quick select block, which a panel too short for it leaves below its fold. */
export const QUICK_SELECT_SELECTOR = '[data-quick-select]';

/** Chips that select a group of keys, such as the letters; none without `keys`. */
export function QuickSelect({
  keys,
  getKeyId,
  selectedKeys,
  setSelectedKeys,
}: {
  /** Keys of the current layout, used to resolve the groups. */
  keys?: LayoutKey[];
  /** Same id builder the keyboard uses, so group ids match selection ids. */
  getKeyId?: (key: LayoutKey, index: number) => string;
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  // Resolve each group against the current layout once per render.
  const groupMatches = React.useMemo(() => {
    if (!keys || !getKeyId) return [];
    return KEY_GROUPS.map((group) => {
      const ids = new Set<string>();
      keys.forEach((key, index) => {
        if (group.matches(key)) ids.add(getKeyId(key, index));
      });
      return { group, ids };
    }).filter((entry) => entry.ids.size > 0);
  }, [keys, getKeyId]);

  const isGroupSelected = (ids: Set<string>) =>
    selectedKeys.size === ids.size &&
    Array.from(ids).every((id) => selectedKeys.has(id));

  // Clicking a fully-selected group clears it, so the same button toggles.
  const selectGroup = (ids: Set<string>) => {
    setSelectedKeys(isGroupSelected(ids) ? new Set() : new Set(ids));
  };

  if (groupMatches.length === 0) return null;
  return (
    <fieldset data-quick-select className="fieldset py-0 px-4 shrink-0 min-w-0">
      <legend className="fieldset-legend">
        <h2 className="text-xs font-medium text-base-content">Quick select</h2>
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        {groupMatches.map(({ group, ids }) => (
          <button
            type="button"
            key={group.id}
            className={cn(
              'btn btn-sm rounded-box',
              isGroupSelected(ids) ? 'btn-active' : '',
            )}
            onClick={() => selectGroup(ids)}
            title={`Select all ${ids.size} ${group.label}`}
          >
            {group.label} ({group.hint})
          </button>
        ))}
      </div>
    </fieldset>
  );
}
