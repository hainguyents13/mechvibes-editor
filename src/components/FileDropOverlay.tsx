import { CircleAlert, FolderOpen, type LucideIcon, Music } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  carriesLink,
  type DropContents,
  type DropContext,
  type DroppedFile,
  type DropRoute,
  routeDrop,
} from '@/lib/dropRouting';
import { isTextEntry } from '@/lib/shortcuts';

/**
 * Whether a drag carries anything the browser would open in place of the
 * editor: files, a link or text.
 */
function carriesDrop(
  dataTransfer: DataTransfer | null,
): dataTransfer is DataTransfer {
  return (
    dataTransfer !== null &&
    ['Files', 'text/uri-list', 'text/plain'].some((type) =>
      dataTransfer.types.includes(type),
    )
  );
}

/** What a drag carries: the browser tells each file's type, not its name. */
function draggedContents(
  dataTransfer: DataTransfer,
): DropContents<DroppedFile> {
  const files = Array.from(dataTransfer.items)
    .filter((item) => item.kind === 'file')
    .map((item) => ({ name: '', type: item.type }));
  // Some browsers list no items during the drag; the files are still coming.
  if (files.length === 0 && dataTransfer.types.includes('Files')) {
    files.push({ name: '', type: '' });
  }
  return { files, hasLink: carriesLink(dataTransfer) };
}

/** Text that is not a link is no file and asks for nothing: it gets no answer. */
function answers(contents: DropContents<DroppedFile>) {
  return contents.files.length > 0 || contents.hasLink;
}

const ROUTE_LOOKS: Record<
  DropRoute<DroppedFile>['kind'],
  { Icon: LucideIcon; tone: string }
> = {
  'open-zip': { Icon: FolderOpen, tone: 'border-primary text-base-content' },
  'to-type-question': { Icon: Music, tone: 'border-primary text-base-content' },
  'add-media': { Icon: Music, tone: 'border-primary text-base-content' },
  unknown: {
    Icon: FolderOpen,
    tone: 'border-base-content/40 text-base-content',
  },
  reject: { Icon: CircleAlert, tone: 'border-error text-error-strong' },
};

/**
 * Takes files or a link dropped or pasted anywhere on the page, and
 * while a drag is over the page covers it with what the drop will do. The
 * cover takes the drop itself, so drop targets under it never see one.
 *
 * Drags that start on the page (a waveform region, a selected word) are left
 * alone. While `enabled` is off, a drop still does nothing, rather than the
 * browser opening the file in place of the editor.
 */
export function FileDropOverlay({
  enabled,
  context,
  onDrop,
}: {
  enabled: boolean;
  context: DropContext;
  onDrop: (route: DropRoute<File>) => void;
}) {
  const [route, setRoute] = useState<DropRoute<DroppedFile> | null>(null);
  // The latest props, for listeners that live as long as the page.
  const latest = useRef({ enabled, context, onDrop });
  latest.current = { enabled, context, onDrop };

  useEffect(() => {
    // dragenter and dragleave fire for every element crossed; the drag is over
    // the page while more have been entered than left.
    let depth = 0;
    let isFromPage = false;

    const hide = () => {
      depth = 0;
      setRoute(null);
    };
    // Text dragged into a text field lands there.
    const handles = (
      event: DragEvent,
    ): event is DragEvent & { dataTransfer: DataTransfer } =>
      !isFromPage &&
      carriesDrop(event.dataTransfer) &&
      (event.dataTransfer.types.includes('Files') ||
        !isTextEntry(event.target));

    const onDragStart = () => {
      isFromPage = true;
    };
    const onDragEnd = () => {
      isFromPage = false;
    };
    const onDragEnter = (event: DragEvent) => {
      if (!handles(event)) return;
      event.preventDefault();
      depth += 1;
      const { enabled, context } = latest.current;
      const contents = draggedContents(event.dataTransfer);
      setRoute(
        enabled && answers(contents) ? routeDrop(contents, context) : null,
      );
    };
    const onDragOver = (event: DragEvent) => {
      if (!handles(event)) return;
      // Taken even when off, so the browser does not open the file instead.
      event.preventDefault();
      event.dataTransfer.dropEffect = latest.current.enabled ? 'copy' : 'none';
    };
    const onDragLeave = (event: DragEvent) => {
      if (!handles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setRoute(null);
    };
    const onDropEvent = (event: DragEvent) => {
      if (isFromPage) {
        isFromPage = false;
        return;
      }
      hide();
      if (!handles(event)) return;
      event.preventDefault();
      const { enabled, context, onDrop } = latest.current;
      const contents = {
        files: Array.from(event.dataTransfer.files),
        hasLink: carriesLink(event.dataTransfer),
      };
      if (enabled && answers(contents)) onDrop(routeDrop(contents, context));
    };
    // Pasting files or a link outside a text field is a drop by other means.
    const onPaste = (event: ClipboardEvent) => {
      const { enabled, context, onDrop } = latest.current;
      if (!enabled || isTextEntry(event.target) || !event.clipboardData) {
        return;
      }
      const contents = {
        files: Array.from(event.clipboardData.files),
        hasLink: carriesLink(event.clipboardData),
      };
      if (!answers(contents)) return;
      event.preventDefault();
      onDrop(routeDrop(contents, context));
    };

    window.addEventListener('dragstart', onDragStart);
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDropEvent);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDropEvent);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  // A dialog that opens mid-drag takes over; the drop then does nothing.
  if (!route || !enabled) return null;
  const { Icon, tone } = ROUTE_LOOKS[route.kind];
  return (
    <div className="fixed inset-0 z-[120] bg-base-100/85 p-4 backdrop-blur-sm">
      <div
        className={`flex h-full flex-col items-center justify-center gap-4 rounded-box border-4 border-dashed px-6 text-center ${tone}`}
      >
        <Icon className="h-14 w-14" strokeWidth={1.5} aria-hidden="true" />
        <output className="block max-w-xl text-xl md:text-2xl font-semibold">
          {route.message}
        </output>
      </div>
    </div>
  );
}
