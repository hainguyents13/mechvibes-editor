import { useEffect, useRef, useState } from 'react';
import { Check, ExternalMark, Laptop, Link } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buttonVariants } from '@/components/ui/button';
import { websiteHost, websiteUrl } from '@/config/siteIdentity';
import { Logo } from '../Logo';
import { SCREEN_LABEL_CLASS } from './StartPage';

/** Shown instead of the editor on a phone, which has no room to make a pack. */
export function PhoneScreen() {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'refused'>('idle');
  const linkRef = useRef<HTMLInputElement>(null);
  // The whole address, so a link into the editor is passed on as it came.
  const link = window.location.href;

  const copyLink = async () => {
    try {
      // Missing outside secure pages, and refused when permission is denied.
      await navigator.clipboard.writeText(window.location.href);
      setCopy('copied');
    } catch {
      setCopy('refused');
    }
  };

  useEffect(() => {
    if (copy === 'refused') linkRef.current?.select();
    if (copy !== 'copied') return;
    const timer = setTimeout(() => setCopy('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copy]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full shrink-0 bg-mv-page shadow-[inset_0_-1px_0_var(--mv-line)]">
        <div className="flex min-h-[60px] items-center gap-2.5 px-4">
          <Logo />
          <ThemeToggle
            className={`${buttonVariants({ variant: 'outline', size: 'icon' })} ml-auto size-10`}
          />
        </div>
      </header>

      {/* A phone held sideways is short: the picture goes and the gaps shrink, so it all fits above the footer */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col gap-3.5 px-6 py-10 [@media(max-height:499px)]:py-5">
          <span
            aria-hidden="true"
            className="flex size-[52px] items-center justify-center rounded-[14px] bg-mv-raised text-mv-chart shadow-[inset_0_0_0_1px_var(--mv-line)] [@media(max-height:499px)]:hidden"
          >
            <Laptop className="size-[26px]" strokeWidth={1.5} />
          </span>
          <span className={SCREEN_LABEL_CLASS}>Sound pack editor</span>
          <h1 className="m-0 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em] text-mv-ink">
            Making a sound pack needs a bigger screen
          </h1>
          <p className="m-0 text-base text-mv-muted">
            Open this page on a computer or tablet.
          </p>

          <button
            type="button"
            onClick={copyLink}
            className={`${buttonVariants({ variant: 'primary' })} mt-3 h-11`}
          >
            {copy === 'copied' ? (
              <Check className="size-4" />
            ) : (
              <Link className="size-4" />
            )}
            {copy === 'copied' ? 'Link copied' : 'Copy link'}
          </button>
          <output className="sr-only">
            {copy === 'copied' ? 'Link copied' : ''}
          </output>

          {copy === 'refused' && (
            <div className="w-full text-left">
              <label htmlFor="phone-screen-link" className="text-sm">
                Your browser did not allow copying. Copy the link from here:
              </label>
              <input
                ref={linkRef}
                id="phone-screen-link"
                type="text"
                readOnly
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                className="mv-field mt-2"
              />
            </div>
          )}

          <a
            href={`${websiteUrl}/sound-packs`}
            className={`${buttonVariants({ variant: 'outline' })} h-11`}
          >
            Browse sound packs on {websiteHost}
            <ExternalMark className="ml-0 size-4" />
          </a>
        </div>
      </div>
    </>
  );
}
