import {
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  AudioWave01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CircleIcon,
  Clock01Icon,
  CloudUploadIcon,
  ComputerIcon,
  DiscordIcon,
  Download01Icon,
  FileAudioIcon,
  Files01Icon,
  FlashIcon,
  FolderOpenIcon,
  GithubIcon,
  Globe02Icon,
  HelpCircleIcon,
  Home09Icon,
  ImageAdd01Icon,
  InformationCircleIcon,
  KeyboardIcon,
  LaptopIcon,
  Link01Icon,
  Loading03Icon,
  Login01Icon,
  Menu01Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  Mouse01Icon,
  MusicNote01Icon,
  PackageIcon,
  PencilEdit01Icon,
  PlayIcon,
  PlusSignIcon,
  Redo02Icon,
  RefreshIcon,
  StopIcon,
  Sun03Icon,
  Tick02Icon,
  Undo02Icon,
  Video01Icon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react';

/**
 * The editor's icons, from the free Hugeicons set (stroke rounded) that
 * mechvibes.com uses. Named as the editor named them before, so swapping one
 * icon is a one-line change here. The stroke is a little heavier than
 * Hugeicons' 1.5 so icons at 13 to 16px stay as legible as the text beside
 * them.
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

export const ArrowRight = icon(ArrowRight02Icon, 'ArrowRight');
export const AudioLines = icon(AudioWave01Icon, 'AudioLines');
export const AudioWaveform = icon(AudioWave01Icon, 'AudioWaveform');
export const BookOpen = icon(BookOpen01Icon, 'BookOpen');
export const Check = icon(Tick02Icon, 'Check');
export const ChevronDown = icon(ArrowDown01Icon, 'ChevronDown');
export const ChevronLeft = icon(ArrowLeft01Icon, 'ChevronLeft');
export const ChevronRight = icon(ArrowRight01Icon, 'ChevronRight');
export const Circle = icon(CircleIcon, 'Circle');
export const CircleAlert = icon(AlertCircleIcon, 'CircleAlert');
export const CircleHelp = icon(HelpCircleIcon, 'CircleHelp');
export const CloudUpload = icon(CloudUploadIcon, 'CloudUpload');
export const Discord = icon(DiscordIcon, 'Discord');
export const Download = icon(Download01Icon, 'Download');
export const Ellipsis = icon(MoreHorizontalIcon, 'Ellipsis');
export const EyeOff = icon(ViewOffIcon, 'EyeOff');
export const FileAudio = icon(FileAudioIcon, 'FileAudio');
export const Files = icon(Files01Icon, 'Files');
export const FolderOpen = icon(FolderOpenIcon, 'FolderOpen');
export const GitHub = icon(GithubIcon, 'GitHub');
export const Globe = icon(Globe02Icon, 'Globe');
export const History = icon(Clock01Icon, 'History');
export const House = icon(Home09Icon, 'House');
export const ImagePlus = icon(ImageAdd01Icon, 'ImagePlus');
export const Info = icon(InformationCircleIcon, 'Info');
export const Keyboard = icon(KeyboardIcon, 'Keyboard');
export const Laptop = icon(LaptopIcon, 'Laptop');
export const Link = icon(Link01Icon, 'Link');
export const Loader = icon(Loading03Icon, 'Loader');
export const LogIn = icon(Login01Icon, 'LogIn');
export const Menu = icon(Menu01Icon, 'Menu');
export const MonitorDown = icon(ComputerIcon, 'MonitorDown');
export const Moon = icon(Moon02Icon, 'Moon');
export const Mouse = icon(Mouse01Icon, 'Mouse');
export const Music = icon(MusicNote01Icon, 'Music');
export const Package = icon(PackageIcon, 'Package');
export const Pencil = icon(PencilEdit01Icon, 'Pencil');
export const Play = icon(PlayIcon, 'Play');
export const Plus = icon(PlusSignIcon, 'Plus');
export const Redo2 = icon(Redo02Icon, 'Redo2');
export const RotateCcw = icon(RefreshIcon, 'RotateCcw');
export const Square = icon(StopIcon, 'Square');
export const Sun = icon(Sun03Icon, 'Sun');
export const TriangleAlert = icon(Alert02Icon, 'TriangleAlert');
export const Undo2 = icon(Undo02Icon, 'Undo2');
export const Video = icon(Video01Icon, 'Video');
export const X = icon(Cancel01Icon, 'X');
export const Zap = icon(FlashIcon, 'Zap');
