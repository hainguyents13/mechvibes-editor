import React from 'react';
import { KEY_GROUPS } from '@/components/editor/key-groups';
import type { LayoutKey } from '@/components/editor/keyboardLayouts';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    // biome-ignore lint/a11y/useSemanticElements: a row of toggle buttons, not a form group
    <div
      role="group"
      aria-label="Quick select"
      className="flex min-w-0 items-center gap-1"
    >
      <span className="mr-1 shrink-0 text-xs text-mv-subtle">Select</span>
      {groupMatches.map(({ group, ids }) => {
        const selected = isGroupSelected(ids);
        return (
          <button
            type="button"
            key={group.id}
            aria-pressed={selected}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-[26px] px-2.5 text-xs',
              selected && 'bg-mv-fill-strong text-mv-ink',
            )}
            onClick={() => selectGroup(ids)}
            title={`Select all ${ids.size} ${group.label} (${group.hint})`}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
