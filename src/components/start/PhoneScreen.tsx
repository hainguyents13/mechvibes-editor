import { ArrowRight, Check, Laptop, Link } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { siteIdentity, websiteHost, websiteUrl } from '@/config/siteIdentity';
import { Logo } from '../Logo';

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
      <div className="sticky top-0 z-50 w-full bg-base-200 border-b border-base-300">
        <div className="flex px-4 py-2 items-center">
          <Logo text={`${siteIdentity.productName} Editor`} showOnPhones />
        </div>
      </div>

      {/* A phone held sideways is short: the picture goes and the gaps shrink, so it all fits above the footer */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center [@media(max-height:499px)]:py-5">
          <Laptop
            className="h-12 w-12 text-primary [@media(max-height:499px)]:hidden"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-bold [@media(max-height:499px)]:mt-0">
            Making a sound pack needs a bigger screen.
          </h1>
          <p className="mt-2 text-base-content/70">
            Open this page on a computer or tablet.
          </p>

          <button
            type="button"
            onClick={copyLink}
            className="btn btn-primary rounded-box mt-8 [@media(max-height:499px)]:mt-5"
          >
            {copy === 'copied' ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            {copy === 'copied' ? 'Link copied' : 'Copy link'}
          </button>
          <output className="sr-only">
            {copy === 'copied' ? 'Link copied' : ''}
          </output>

          {copy === 'refused' && (
            <div className="mt-4 w-full text-left">
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
                className="input input-sm mt-2 w-full"
              />
            </div>
          )}

          <a
            href={`${websiteUrl}/sound-packs`}
            className="link link-hover mt-8 [@media(max-height:499px)]:mt-5 inline-flex items-center gap-1 text-sm"
          >
            Browse sound packs on {websiteHost}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </>
  );
}
