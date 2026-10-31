/** Narrower than this, the keyboard and the sound panel do not fit. */
export const PHONE_MAX_WIDTH = 768;

/** A touch screen shorter than this is a phone held sideways. */
export const PHONE_SIDEWAYS_MAX_HEIGHT = 500;

export type ScreenFacts = {
  width: number;
  height: number;
  /** The main pointer is a finger, as `(pointer: coarse)` reports. */
  coarsePointer: boolean;
};

/** Whether the screen is too small to make a pack on: a phone, upright or sideways. */
export function isPhoneScreen({ width, height, coarsePointer }: ScreenFacts) {
  return (
    width < PHONE_MAX_WIDTH ||
    (coarsePointer && height < PHONE_SIDEWAYS_MAX_HEIGHT)
  );
}
