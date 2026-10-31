import { Keyboard, type LucideIcon, Mouse } from 'lucide-react';
import type { PackType } from '@/utils/soundPack';
import { BackButton, ScreenHeading, StartPage } from './StartPage';

const CHOICES: { packType: PackType; Icon: LucideIcon; hint: string }[] = [
  { packType: 'Keyboard', Icon: Keyboard, hint: 'Sounds when you type' },
  { packType: 'Mouse', Icon: Mouse, hint: 'Sounds when you click' },
];

function question(fileCount: number) {
  if (fileCount === 0) return 'What is this pack for?';
  if (fileCount === 1) return 'What is this file for?';
  return `What are these ${fileCount} files for?`;
}

/** Asks whether a new pack is for a keyboard or a mouse; choosing one opens it. */
export function PackTypeScreen({
  fileCount,
  onBack,
  onChoose,
}: {
  /** Files waiting to go into the new pack. */
  fileCount: number;
  onBack: () => void;
  onChoose: (packType: PackType) => void;
}) {
  return (
    <StartPage>
      <BackButton onClick={onBack} />
      <ScreenHeading className="mt-4 text-center text-2xl md:text-3xl font-bold">
        {question(fileCount)}
      </ScreenHeading>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        {CHOICES.map(({ packType, Icon, hint }) => (
          <button
            key={packType}
            type="button"
            // This screen opens under the pointer that clicked Start, so the
            // second click of a double click would choose for the visitor.
            onClick={(event) => {
              if (event.detail > 1) return;
              onChoose(packType);
            }}
            className="flex flex-col items-center gap-3 rounded-box border border-base-300 bg-base-100 px-6 py-10 shadow-sm transition hover:border-primary/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon
              className="h-16 w-16 text-primary"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="text-lg font-semibold">{packType}</span>
            <span className="text-sm text-base-content/70">{hint}</span>
          </button>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-base-content/60">
        A pack is for a keyboard or a mouse. You can change this later.
      </p>
    </StartPage>
  );
}
