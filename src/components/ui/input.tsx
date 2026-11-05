import type * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full min-w-0 rounded-lg border border-mv-line-strong bg-mv-page px-3 py-0 text-sm text-mv-ink file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-mv-ink placeholder:text-mv-faint focus-visible:border-mv-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
