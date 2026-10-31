import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTextEntry, shouldIgnoreShortcut } from '@/lib/shortcuts';

// Tests run in Node, which has no DOM: stand-ins for the element classes the
// rules check, and a document whose open overlay each test picks.
class FakeElement {
  isContentEditable = false;
}
class FakeInput extends FakeElement {
  type: string;
  constructor(type: string) {
    super();
    this.type = type;
  }
}
class FakeTextArea extends FakeElement {}
class FakeSelect extends FakeElement {}

let openOverlay: string | null = null;

beforeEach(() => {
  openOverlay = null;
  vi.stubGlobal('HTMLElement', FakeElement);
  vi.stubGlobal('HTMLInputElement', FakeInput);
  vi.stubGlobal('HTMLTextAreaElement', FakeTextArea);
  vi.stubGlobal('HTMLSelectElement', FakeSelect);
  vi.stubGlobal('document', {
    querySelector: (selector: string) =>
      openOverlay && selector.includes(openOverlay) ? {} : null,
  });
});

const target = (element: FakeElement) => element as unknown as EventTarget;

describe('isTextEntry', () => {
  it.each(['text', 'number', 'search', 'email', 'url'])(
    'is true for an input of type %s',
    (type) => {
      expect(isTextEntry(target(new FakeInput(type)))).toBe(true);
    },
  );

  it.each(['button', 'checkbox', 'range', 'radio', 'file', 'color'])(
    'is false for an input of type %s',
    (type) => {
      expect(isTextEntry(target(new FakeInput(type)))).toBe(false);
    },
  );

  it('is true for a textarea, a select and editable content', () => {
    const editable = new FakeElement();
    editable.isContentEditable = true;
    expect(isTextEntry(target(new FakeTextArea()))).toBe(true);
    expect(isTextEntry(target(new FakeSelect()))).toBe(true);
    expect(isTextEntry(target(editable))).toBe(true);
  });

  it('is false for another element, a target that is not one, and no target', () => {
    expect(isTextEntry(target(new FakeElement()))).toBe(false);
    expect(isTextEntry({} as EventTarget)).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('shouldIgnoreShortcut', () => {
  const event = (
    patch: Partial<
      Pick<KeyboardEvent, 'defaultPrevented' | 'isComposing' | 'target'>
    > = {},
  ) => ({
    defaultPrevented: false,
    isComposing: false,
    target: target(new FakeElement()),
    ...patch,
  });

  it('lets a key press on the page through', () => {
    expect(shouldIgnoreShortcut(event())).toBe(false);
  });

  it('ignores a handled press, an IME composition and a text field', () => {
    expect(shouldIgnoreShortcut(event({ defaultPrevented: true }))).toBe(true);
    expect(shouldIgnoreShortcut(event({ isComposing: true }))).toBe(true);
    expect(
      shouldIgnoreShortcut(event({ target: target(new FakeInput('number')) })),
    ).toBe(true);
  });

  it.each(['.modal-open', '.driver-popover'])(
    'ignores every press while %s is on the page',
    (overlay) => {
      openOverlay = overlay;
      expect(shouldIgnoreShortcut(event())).toBe(true);
    },
  );
});
