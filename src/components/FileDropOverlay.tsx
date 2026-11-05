import { useEffect, useRef, useState } from 'react';
import {
  CircleAlert,
  FolderOpen,
  type IconComponent,
  Music,
} from '@/components/icons';
import {
  carriesLink,
  DROP_MESSAGES,
  type DropContents,
  type DropContext,
  type DroppedFile,
  type DropRoute,
  offersKeyDrop,
  routeDrop,
} from '@/lib/dropRouting';
import { readDroppedEntries } from '@/lib/folderFiles';
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

// The frame's line and the message's colour, and the icon's tile. A drop the
// editor takes is drawn in ink.
const TAKEN_LOOK = {
  frame: 'shadow-[inset_0_0_0_2px_var(--mv-ink)] text-mv-ink',
  tile: 'bg-mv-primary text-mv-on-primary',
};
const ROUTE_LOOKS: Record<
  DropRoute<DroppedFile>['kind'],
  { Icon: IconComponent; frame: string; tile: string }
> = {
  'open-zip': { Icon: FolderOpen, ...TAKEN_LOOK },
  'open-folder': { Icon: FolderOpen, ...TAKEN_LOOK },
  'to-type-question': { Icon: Music, ...TAKEN_LOOK },
  'add-media': { Icon: Music, ...TAKEN_LOOK },
  unknown: {
    Icon: FolderOpen,
    frame: 'shadow-[inset_0_0_0_2px_var(--mv-faint)] text-mv-ink',
    tile: 'bg-mv-fill-strong text-mv-ink',
  },
  reject: {
    Icon: CircleAlert,
    frame: 'shadow-[inset_0_0_0_2px_var(--mv-danger)] text-mv-danger',
    tile: 'bg-mv-danger-fill text-mv-danger',
  },
};

/** The key under a drag, from the element it is over. */
export function dropCodeAt(target: EventTarget | null) {
  return target instanceof Element
    ? (target.closest('[data-drop-code]')?.getAttribute('data-drop-code') ??
        null)
    : null;
}

/**
 * Takes files or a link dropped or pasted anywhere on the page, and
 * while a drag is over the page covers it with what the drop will do. The
 * cover takes the drop itself, so drop targets under it never see one.
 *
 * One sound dragged over a workspace whose keyboard takes clicks may go onto
 * a key instead: the cover then lets the page show through and the pointer
 * reach the keys, reports the key under the drag with `onDropTarget`, and
 * hands that key to `onDrop`. A drop beside the keys adds the file as usual.
 *
 * Drags that start on the page (a waveform region, a selected word) are left
 * alone. While `enabled` is off, a drop still does nothing, rather than the
 * browser opening the file in place of the editor.
 */
export function FileDropOverlay({
  enabled,
  context,
  keyboardReady,
  noun,
  onDrop,
  onDropTarget,
}: {
  enabled: boolean;
  context: DropContext;
  /** The workspace's keyboard takes clicks, so one sound can go onto a key. */
  keyboardReady: boolean;
  /** What the pack's keys are called: 'key' or 'button'. */
  noun: string;
  /** `code` is the key the file was dropped on, when it can go onto one. */
  onDrop: (route: DropRoute<File>, target?: { code: string }) => void;
  /** The key a file dragged over the page would go to; null over none or when the drag ends. */
  onDropTarget: (code: string | null) => void;
}) {
  const [route, setRoute] = useState<DropRoute<DroppedFile> | null>(null);
  // The latest props, for listeners that live as long as the page.
  const latest = useRef({
    enabled,
    context,
    keyboardReady,
    onDrop,
    onDropTarget,
  });
  latest.current = { enabled, context, keyboardReady, onDrop, onDropTarget };

  useEffect(() => {
    // dragenter and dragleave fire for every element crossed; the drag is over
    // the page while more have been entered than left.
    let depth = 0;
    let isFromPage = false;
    // Whether the drag can go onto a key, and the key it is over.
    let toKeys = false;
    let overCode: string | null = null;

    const setOverCode = (code: string | null) => {
      if (code === overCode) return;
      overCode = code;
      latest.current.onDropTarget(code);
    };
    const hide = () => {
      depth = 0;
      toKeys = false;
      setOverCode(null);
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
      const { enabled, context, keyboardReady } = latest.current;
      const contents = draggedContents(event.dataTransfer);
      const next =
        enabled && answers(contents) ? routeDrop(contents, context) : null;
      toKeys = next !== null && offersKeyDrop(next, keyboardReady);
      setRoute(next);
    };
    const onDragOver = (event: DragEvent) => {
      if (!handles(event)) return;
      // Taken even when off, so the browser does not open the file instead.
      event.preventDefault();
      event.dataTransfer.dropEffect = latest.current.enabled ? 'copy' : 'none';
      if (toKeys) setOverCode(dropCodeAt(event.target));
    };
    const onDragLeave = (event: DragEvent) => {
      if (!handles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) hide();
    };
    const onDropEvent = (event: DragEvent) => {
      if (isFromPage) {
        isFromPage = false;
        return;
      }
      // Under a cover that lets the keys show through, the drop lands on
      // the element under the pointer.
      const code = toKeys ? dropCodeAt(event.target) : null;
      hide();
      if (!handles(event)) return;
      event.preventDefault();
      if (!latest.current.enabled) return;
      const hasLink = carriesLink(event.dataTransfer);
      // A dropped folder comes as a file of no type; its entries hold what is
      // in it, and the browser hands them over only while the drop fires.
      const entries = Array.from(event.dataTransfer.items)
        .filter((item) => item.kind === 'file')
        .map((item) => item.webkitGetAsEntry());
      const route = (files: File[]) => {
        const { enabled, context, keyboardReady, onDrop } = latest.current;
        const contents = { files, hasLink };
        if (!enabled || !answers(contents)) return;
        const dropped = routeDrop(contents, context);
        // The files themselves decide: a drag that looked like one sound
        // may turn out to be something else.
        onDrop(
          dropped,
          code && offersKeyDrop(dropped, keyboardReady) ? { code } : undefined,
        );
      };
      if (entries.some((entry) => entry?.isDirectory)) {
        readDroppedEntries(
          entries.filter((entry): entry is FileSystemEntry => entry !== null),
        ).then(route, () =>
          latest.current.onDrop({
            kind: 'reject',
            message: DROP_MESSAGES.unusable,
          }),
        );
      } else {
        route(Array.from(event.dataTransfer.files));
      }
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
  if (offersKeyDrop(route, keyboardReady)) {
    // Neither blurred nor in the way: the keys under it light up and take
    // the drop. Its line sits at the foot of the page, over the footer,
    // rather than over the navbar's controls or the keys.
    return (
      <div className="pointer-events-none fixed inset-0 z-[120] bg-mv-page/15 p-2 font-body">
        <div className="flex h-full flex-col items-center justify-end rounded-[14px] shadow-[inset_0_0_0_2px_var(--mv-ink)]">
          <output className="mb-3 flex max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-xl bg-mv-page px-4 py-2.5 text-sm font-bold text-mv-ink shadow-[0_0_0_1px_var(--mv-line),0_14px_32px_-14px_var(--mv-shadow)] md:text-[15px]">
            <Music className="size-5 shrink-0" aria-hidden="true" />
            Drop on a {noun} to give it this sound, or anywhere else to add it.
          </output>
        </div>
      </div>
    );
  }
  const { Icon, frame, tile } = ROUTE_LOOKS[route.kind];
  return (
    <div className="fixed inset-0 z-[120] bg-mv-page/70 p-4 font-body backdrop-blur-sm">
      <div
        className={`flex h-full flex-col items-center justify-center gap-4 rounded-[14px] bg-mv-page/90 px-6 text-center ${frame}`}
      >
        <span
          aria-hidden="true"
          className={`flex size-[52px] items-center justify-center rounded-[14px] ${tile}`}
        >
          <Icon className="size-6" />
        </span>
        <output className="block max-w-xl font-display text-xl font-extrabold tracking-[-0.02em] md:text-2xl">
          {route.message}
        </output>
      </div>
    </div>
  );
}
