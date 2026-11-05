/**
 * A key drawn as a raised keycap: its face sits on an edge that shows under
 * it. The edge splits in two halves, the left for the press sound and the
 * right for the release sound, each coloured while the key has that sound and
 * a light grey while it has not. These replace the dots the keys used to wear.
 */

/** How tall the edge shows under the face, in unscaled pixels. */
export const KEYCAP_EDGE_PX = 4;

const EMPTY = 'var(--mv-fill-strong)';

/** The edge's background: two halves with a 2px gap between them. */
export function keycapEdge(hasPress: boolean, hasRelease: boolean): string {
  if (!hasPress && !hasRelease) return EMPTY;
  const left = hasPress ? 'var(--mv-press)' : EMPTY;
  const right = hasRelease ? 'var(--mv-release)' : EMPTY;
  return `linear-gradient(90deg, ${left} 0 calc(50% - 1px), transparent calc(50% - 1px) calc(50% + 1px), ${right} calc(50% + 1px))`;
}

/** The face of a selected key: filled with the ink colour. */
export const KEYCAP_FACE_SELECTED = 'bg-mv-primary text-mv-on-primary';
/** The face of a key with a sound. */
export const KEYCAP_FACE_ON =
  'bg-mv-page text-mv-ink shadow-[inset_0_0_0_1px_var(--mv-line-strong)]';
/** The face of a key that plays nothing. */
export const KEYCAP_FACE_OFF =
  'bg-mv-page text-mv-subtle shadow-[inset_0_0_0_1px_var(--mv-line-strong)]';
