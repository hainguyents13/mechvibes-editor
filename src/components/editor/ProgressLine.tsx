import type { ReactNode } from 'react';
import { Check } from '@/components/icons';
import type { ProgressItem } from '@/lib/progressLine';
import { cn } from '@/lib/utils';

// What a screen reader adds after each item; the count reads as it is.
function spokenState(item: ProgressItem) {
  switch (item.state) {
    case 'done':
      return ', done';
    case 'todo':
      return ', not done yet';
    case 'not-yet':
      return item.title
        ? `, ${item.title.charAt(0).toLowerCase()}${item.title.slice(1)}`
        : '';
    default:
      return '';
  }
}

/** Before the first file there is one thing to do, which the band names. */
const ADD_SOUNDS: ProgressItem = {
  id: 'sounds',
  label: 'Add sounds',
  state: 'todo',
};

/** A step's mark: filled with a check once done, a ring while it can be done. */
function StepMark({ state }: { state: ProgressItem['state'] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full',
        state === 'done' && 'bg-mv-ink text-mv-page',
        state === 'todo' && 'bg-mv-page shadow-[inset_0_0_0_2px_var(--mv-ink)]',
        state === 'not-yet' &&
          'bg-mv-page shadow-[inset_0_0_0_1px_var(--mv-line-strong)]',
      )}
    >
      {state === 'done' && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

/**
 * The band under the top bar: what is done so far, as words rather than
 * buttons (the bar holds the buttons), and what to do next. No numbers and no
 * set order. It sits outside the keyboard's column, so when a narrow window
 * wraps it onto two lines the keyboard simply gets less room.
 */
export function StepsBand({
  items,
  next,
}: {
  items: ProgressItem[];
  /** The Next line, at the band's end. */
  next: ReactNode;
}) {
  const steps = items.length > 0 ? items : [ADD_SOUNDS];
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-mv-raised px-5 py-2 shadow-[inset_0_-1px_0_var(--mv-line)]">
      <ul
        aria-label="Progress"
        className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-5 gap-y-1 p-0 whitespace-nowrap"
      >
        {steps.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center gap-2',
              item.state === 'count'
                ? 'font-code text-xs text-mv-subtle'
                : 'font-code text-[11px] font-bold uppercase tracking-[0.1em]',
              item.state === 'not-yet' ? 'text-mv-subtle' : 'text-mv-ink',
              item.state === 'count' && 'text-mv-subtle',
            )}
          >
            {item.state !== 'count' && <StepMark state={item.state} />}
            {/* On the words, not the item: a title on the <li> becomes its
                accessible name and is read in place of the label. */}
            <span title={item.title}>{item.label}</span>
            <span className="sr-only">{spokenState(item)}</span>
          </li>
        ))}
      </ul>
      <div className="min-w-0">{next}</div>
    </div>
  );
}
