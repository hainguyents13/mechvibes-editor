import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CircleIcon,
  Moon02Icon,
  Sun03Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react';

/**
 * The editor's icons, from the free Hugeicons set (stroke rounded) that
 * mechvibes.com uses, under the same names as the site's icons.tsx. The stroke
 * is a little heavier than Hugeicons' 1.5 so icons at 13 to 16px stay as
 * legible as the text beside them.
 */
export type IconProps = Omit<HugeiconsIconProps, 'icon'>;
export type IconComponent = ((props: IconProps) => React.JSX.Element) & {
  displayName?: string;
};

const STROKE = 1.75;

function icon(svg: HugeiconsIconProps['icon'], name: string): IconComponent {
  const Icon = (props: IconProps) => (
    <HugeiconsIcon icon={svg} strokeWidth={STROKE} {...props} />
  );
  Icon.displayName = name;
  return Icon;
}

export const Check = icon(Tick02Icon, 'Check');
export const ChevronDown = icon(ArrowDown01Icon, 'ChevronDown');
export const ChevronRight = icon(ArrowRight01Icon, 'ChevronRight');
export const Circle = icon(CircleIcon, 'Circle');
export const Moon = icon(Moon02Icon, 'Moon');
export const Sun = icon(Sun03Icon, 'Sun');
