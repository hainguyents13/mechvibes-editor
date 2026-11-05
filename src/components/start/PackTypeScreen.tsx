import { type IconComponent, Keyboard, Mouse } from '@/components/icons';
import type { PackType } from '@/utils/soundPack';
import {
  BackButton,
  BUTTON_CARD_CLASS,
  SCREEN_LABEL_CLASS,
  ScreenHeading,
  StartPage,
} from './StartPage';

const CHOICES: { packType: PackType; Icon: IconComponent; hint: string }[] = [
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
    <StartPage centered>
      <div className="mx-auto max-w-2xl">
        <BackButton onClick={onBack} />
        <div className="mt-6 flex flex-col gap-3">
          <span className={SCREEN_LABEL_CLASS}>New pack</span>
          <ScreenHeading className="font-display text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-mv-ink">
            {question(fileCount)}
          </ScreenHeading>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
              className={`flex flex-col items-start gap-2 p-6 text-left ${BUTTON_CARD_CLASS}`}
            >
              <Icon
                className="size-10 text-mv-ink"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="mt-3 font-display text-[21px] font-bold tracking-[-0.015em] text-mv-ink">
                {packType}
              </span>
              <span className="text-sm text-mv-muted">{hint}</span>
            </button>
          ))}
        </div>

        <p className="m-0 mt-7 text-[13px] text-mv-subtle">
          A pack is for a keyboard or a mouse. You can change this later.
        </p>
      </div>
    </StartPage>
  );
}
