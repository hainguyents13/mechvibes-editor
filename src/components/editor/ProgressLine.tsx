import { Check } from 'lucide-react';
import type { ProgressItem } from '@/lib/progressLine';

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

/**
 * What is done so far, as words rather than buttons: the navbar holds the
 * buttons. No numbers and no set order. One line high; only the count is cut
 * short when the row is too narrow.
 */
export function ProgressLine({ items }: { items: ProgressItem[] }) {
  return (
    <ul
      aria-label="Progress"
      className="flex h-4 min-w-0 items-center gap-1.5 whitespace-nowrap leading-4 text-base-content/70"
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`flex items-center gap-1.5 ${item.state === 'count' ? 'min-w-0' : 'shrink-0'} ${item.state === 'not-yet' ? 'text-base-content/40' : ''}`}
        >
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="flex min-w-0 items-center gap-1">
            {item.state === 'done' && (
              <Check
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-success-strong"
                strokeWidth={3}
              />
            )}
            {/* On the words, not the item: a title on the <li> becomes its
                accessible name and is read in place of the label. */}
            <span
              title={item.title}
              className={item.state === 'count' ? 'truncate' : undefined}
            >
              {item.label}
            </span>
          </span>
          <span className="sr-only">{spokenState(item)}</span>
        </li>
      ))}
    </ul>
  );
}
