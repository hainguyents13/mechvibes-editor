import * as TabsPrimitive from '@radix-ui/react-tabs';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// mechvibes.com's two kinds of tabs. Underline tabs (44px, the selected one
// bold on a 2px ink line) switch what a screen shows; pill tabs are a segmented
// control for small switches.

const underlineList =
  'flex min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const underlineTab =
  'inline-flex h-11 shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap px-3 text-sm font-medium text-mv-muted no-underline hover:text-mv-ink aria-selected:font-bold aria-selected:text-mv-ink aria-selected:shadow-[inset_0_-2px_0_var(--mv-ink)] data-[state=active]:font-bold data-[state=active]:text-mv-ink data-[state=active]:shadow-[inset_0_-2px_0_var(--mv-ink)]';

const pillList =
  'inline-flex gap-0.5 rounded-[10px] p-[3px] text-xs shadow-[inset_0_0_0_1px_var(--mv-line)]';
const pillTab =
  'cursor-pointer rounded-[7px] px-[9px] py-[5px] text-mv-muted no-underline hover:text-mv-ink aria-selected:bg-mv-fill aria-selected:font-bold aria-selected:text-mv-ink data-[state=active]:bg-mv-fill data-[state=active]:font-bold data-[state=active]:text-mv-ink';

/** In-screen tabs (Radix), drawn as underline tabs. */
const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        underlineList,
        'px-[clamp(6px,1.5vw,12px)] shadow-[inset_0_-1px_0_var(--mv-line)]',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger className={cn(underlineTab, className)} {...props} />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

export {
  pillList,
  pillTab,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  underlineList,
  underlineTab,
};
