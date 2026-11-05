import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// mechvibes.com's button ladder: one primary per screen, then secondary
// (filled) > outline (page colour, a light line) > ghost. Secondary always
// reads heavier than outline. Danger is only for confirming a loss.
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-bold leading-[1.2] no-underline transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-line-strong disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-mv-primary text-mv-on-primary hover:opacity-90',
        secondary: 'bg-mv-fill-strong text-mv-ink hover:bg-mv-line-strong',
        outline:
          'bg-mv-page text-mv-text shadow-[inset_0_0_0_1px_var(--mv-line)] hover:text-mv-ink hover:shadow-[inset_0_0_0_1px_var(--mv-line-strong)]',
        ghost: 'bg-transparent text-mv-text hover:bg-mv-fill hover:text-mv-ink',
        danger: 'bg-mv-danger-solid text-white hover:opacity-90',
      },
      size: {
        // As tall as icon-sm, so a labelled button and the icon buttons beside
        // it line up. The leading is repeated because tailwind-merge drops the
        // base leading once a font size is set.
        sm: 'h-[30px] gap-1.5 rounded-lg px-3 py-0 text-[13px] leading-[1.2]',
        // The largest a button gets: a screen's main action is this size,
        // never bigger.
        default: 'px-4 py-2.5 text-sm leading-[1.2]',
        icon: 'size-9 p-0',
        'icon-sm': 'size-[30px] rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      // A button never submits a form by accident.
      type={asChild ? type : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
