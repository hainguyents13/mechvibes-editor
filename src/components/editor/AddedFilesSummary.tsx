import { ChevronDown, CircleAlert, X } from 'lucide-react';
import type React from 'react';
import { NavbarMenu } from '@/components/NavbarMenu';
import type { AddSummary, AddSummaryLine } from '@/lib/addSummary';
import type { FileKind } from '@/lib/fileKinds';

/** A line of the summary that carries a button. */
export type SummaryActionLine = Extract<
  AddSummaryLine,
  { kind: 'matched' | 'no-match' | 'similar' }
>;

/** Files being read on their way in: how many of how many. */
export type ReadingProgress = { read: number; total: number };

export function readingText({ read, total }: ReadingProgress) {
  return total === 1
    ? 'Reading the file…'
    : `Reading ${read} of ${total} files…`;
}

/**
 * The strip across the top of the sound panel about the last add: what kind
 * the files look like, with Change ▾ to say otherwise, which files match keys
 * by name and the buttons that give them out. While files are read it says
 * so, and a file the browser could not read is named here. Each line keeps to
 * one row, cut short with its full text on hover.
 */
export function AddedFilesSummary({
  summary,
  reading,
  error,
  onChangeKind,
  onAction,
  onDismiss,
  ref,
}: {
  summary: AddSummary | null;
  reading: ReadingProgress | null;
  error: string | null;
  onChangeKind: (kind: FileKind) => void;
  onAction: (line: SummaryActionLine) => void;
  onDismiss: () => void;
  ref?: React.Ref<HTMLElement>;
}) {
  if (!summary && !reading && !error) return null;
  return (
    <section
      ref={ref}
      aria-label="Added files"
      className="shrink-0 flex items-start gap-2 border-b-2 border-base-content/20 px-4 py-1.5 text-xs"
    >
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        {reading ? (
          <output className="block leading-6 text-base-content/70">
            {readingText(reading)}
          </output>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="flex min-w-0 items-center gap-1.5 leading-6 text-error-strong"
                title={error}
              >
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{error}</span>
              </p>
            )}
            {summary && (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  <p
                    className="min-w-0 truncate font-medium text-base-content"
                    title={summary.heading}
                  >
                    {summary.heading}
                  </p>
                  <NavbarMenu
                    align="end"
                    buttonClassName="shrink-0 btn btn-xs btn-ghost rounded-box"
                    items={(['one', 'many'] as const).map((kind) => ({
                      label: summary.changeLabels[kind],
                      onSelect: () => onChangeKind(kind),
                    }))}
                  >
                    Change
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </NavbarMenu>
                </div>
                {summary.lines.map((line) => (
                  <div
                    key={line.kind}
                    className="flex min-w-0 items-center gap-2 leading-6"
                  >
                    <p
                      className="min-w-0 truncate text-base-content/80"
                      title={line.text}
                    >
                      {line.text}
                    </p>
                    {(line.kind === 'matched' ||
                      line.kind === 'no-match' ||
                      line.kind === 'similar') &&
                      line.action && (
                        <button
                          type="button"
                          className="shrink-0 btn btn-xs btn-primary rounded-box"
                          onClick={() => onAction(line)}
                        >
                          {line.action}
                        </button>
                      )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      {!reading && (
        <button
          type="button"
          className="shrink-0 btn btn-xs btn-ghost btn-square rounded-box"
          onClick={onDismiss}
          aria-label="Close the summary of added files"
          title="Close"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </section>
  );
}
