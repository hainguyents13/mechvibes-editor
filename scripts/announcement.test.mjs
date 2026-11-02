import { describe, expect, it } from 'vitest';
import {
  buildContent,
  buildForm,
  buildPayload,
  checkImage,
  digestNotes,
  IMAGE_LIMIT,
  MESSAGE_LIMIT,
  pickImageAsset,
  previewMarkdown,
} from './announcement.mjs';

const NOTES = `### Added

- **Keyboard packs and mouse packs.** A new pack asks one question.
- Wheel sounds play on Linux. Other systems come later.
- A line without a sentence break

### Fixed

- **Try it plays release sounds.** It did not before.

### For developers

- **A refactor.** Nobody sees it.

## What's Changed
* Add mouse packs by @someone in https://github.com/x/y/pull/1
`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ROLE = '123456789012345678';

function release(overrides = {}) {
  return {
    tag_name: 'v1.1.0',
    html_url: 'https://github.com/x/y/releases/tag/v1.1.0',
    draft: false,
    body: NOTES,
    assets: [
      { name: 'announcement.png', size: 1000 },
      { name: 'other.zip', size: 10 },
    ],
    ...overrides,
  };
}

describe('digestNotes', () => {
  it('keeps one line per change for pack makers', () => {
    expect(digestNotes(NOTES)).toEqual([
      '- Keyboard packs and mouse packs.',
      '- Wheel sounds play on Linux.',
      '- A line without a sentence break',
      '- Try it plays release sounds.',
    ]);
  });

  it('stops at the pull request list when there is no section for developers', () => {
    const notes =
      '- **One.** Text.\r\n\r\n## What’s Changed\r\n- **Two.** Text.';
    expect(digestNotes(notes)).toEqual(['- One.']);
  });

  it('takes only a bold lead, not bold text later in the line', () => {
    expect(digestNotes('- Fixed **Try it** on Safari. It works.')).toEqual([
      '- Fixed **Try it** on Safari.',
    ]);
  });
});

describe('buildContent', () => {
  const base = {
    tag: 'v1.1.0',
    url: 'https://github.com/x/y/releases/tag/v1.1.0',
    notes: NOTES,
    roleId: ROLE,
  };

  it('names the editor, not the desktop app, and links the release', () => {
    const content = buildContent(base);
    expect(content).toMatch(
      /^Hi <@&123456789012345678>, \*\*Mechvibes Editor\*\* v1\.1\.0 is out! 🎉\n\nThis is the sound pack editor on the web \(editor\.mechvibes\.com\), not the Mechvibes desktop app\. Here is what’s new:\n\n- Keyboard packs and mouse packs\.\n/,
    );
    expect(content).toMatch(
      /reload the page if you have it open\n- GitHub release: https:\/\/github\.com\/x\/y\/releases\/tag\/v1\.1\.0$/,
    );
  });

  it('marks a test run', () => {
    expect(buildContent({ ...base, test: true })).toMatch(
      /^🧪 \*\*Test announcement, please ignore\.\*\*/,
    );
  });

  it('keeps the greeting and the links when the changes overflow the cap', () => {
    const notes = Array.from(
      { length: 200 },
      (_, i) => `- **Change number ${i}.** Text.`,
    ).join('\n');
    const content = buildContent({ ...base, notes });
    expect(content.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(content).toMatch(/^Hi <@&/);
    expect(content).toMatch(
      /GitHub release: https:\/\/github\.com\/x\/y\/releases\/tag\/v1\.1\.0$/,
    );
    expect(content).toContain('- Change number 0.\n');
    expect(content).toMatch(/- …and \d+ more in the release notes\n/);
    // Whole lines only: the last kept change is not cut.
    expect(content).toMatch(/- Change number \d+\.\n- …and/);
  });

  it('refuses notes with nothing to announce', () => {
    expect(() => buildContent({ ...base, notes: '### Added\n' })).toThrow(
      /no bullet/,
    );
  });

  it('posts a custom message as it is', () => {
    expect(buildContent({ ...base, message: 'Hello *there*' })).toBe(
      'Hello *there*',
    );
  });

  it('refuses a custom message over the cap instead of cutting it', () => {
    const message = 'a'.repeat(MESSAGE_LIMIT + 1);
    expect(() => buildContent({ ...base, message })).toThrow(/2000/);
    expect(buildContent({ ...base, message: message.slice(1) })).toHaveLength(
      MESSAGE_LIMIT,
    );
  });

  it('counts the test label against the cap of a custom message', () => {
    const message = 'a'.repeat(MESSAGE_LIMIT - 10);
    expect(() => buildContent({ ...base, message, test: true })).toThrow(
      /2000/,
    );
  });

  it('refuses an empty custom message', () => {
    expect(() => buildContent({ ...base, message: '  \n' })).toThrow(/empty/);
  });
});

describe('pickImageAsset', () => {
  it.each([
    'announcement.png',
    'announcement.jpg',
    'announcement.JPEG',
    'announcement.webp',
    'announcement.gif',
  ])('takes %s', (name) => {
    expect(pickImageAsset('v1.1.0', [{ name, size: 1 }]).name).toBe(name);
  });

  it('refuses a release without one, whatever other images it has', () => {
    const assets = [
      { name: 'screenshot.png', size: 1 },
      { name: 'announcement.png.zip', size: 1 },
      { name: 'announcement.bmp', size: 1 },
    ];
    expect(() => pickImageAsset('v1.1.0', assets)).toThrow(
      /no announcement image.*gh release upload v1\.1\.0 announcement\.png/,
    );
    expect(() => pickImageAsset('v1.1.0', undefined)).toThrow(
      /no announcement/,
    );
  });

  it('refuses two', () => {
    const assets = [
      { name: 'announcement.png', size: 1 },
      { name: 'announcement.gif', size: 1 },
    ];
    expect(() => pickImageAsset('v1.1.0', assets)).toThrow(/2 announcement/);
  });

  it('refuses one over 8 MB', () => {
    expect(
      pickImageAsset('v1.1.0', [
        { name: 'announcement.png', size: IMAGE_LIMIT },
      ]).size,
    ).toBe(IMAGE_LIMIT);
    expect(() =>
      pickImageAsset('v1.1.0', [
        { name: 'announcement.png', size: IMAGE_LIMIT + 1 },
      ]),
    ).toThrow(/8\.0 MB or less/);
  });
});

describe('checkImage', () => {
  it('gives the media type of a real image', () => {
    expect(checkImage('announcement.png', PNG)).toBe('image/png');
    expect(
      checkImage('announcement.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    ).toBe('image/jpeg');
  });

  it('refuses bytes that do not match the name', () => {
    expect(() => checkImage('announcement.gif', PNG)).toThrow(/not a GIF/);
  });

  it('refuses bytes over 8 MB', () => {
    const big = new Uint8Array(IMAGE_LIMIT + 1);
    big.set(PNG);
    expect(() => checkImage('announcement.png', big)).toThrow(/or less/);
  });
});

describe('buildPayload', () => {
  it('pings only the release role and attaches the image', () => {
    expect(buildPayload({ release: release(), roleId: ROLE })).toEqual({
      content: expect.stringMatching(/^Hi <@&123456789012345678>/),
      allowed_mentions: { parse: [], roles: [ROLE] },
      attachments: [{ id: 0, filename: 'announcement.png' }],
    });
  });

  it('pings nobody on a test run', () => {
    const payload = buildPayload({
      release: release(),
      roleId: ROLE,
      test: true,
    });
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: [] });
  });

  it('pings only the role from a custom message, never @everyone', () => {
    const payload = buildPayload({
      release: release(),
      roleId: ROLE,
      message: '@everyone <@&1> <@&123456789012345678> v1.1.0 is out',
    });
    expect(payload.content).toBe(
      '@everyone <@&1> <@&123456789012345678> v1.1.0 is out',
    );
    expect(payload.allowed_mentions).toEqual({ parse: [], roles: [ROLE] });
    expect(payload.attachments).toEqual([
      { id: 0, filename: 'announcement.png' },
    ]);
  });

  it('still needs the image for a custom message', () => {
    expect(() =>
      buildPayload({
        release: release({ assets: [] }),
        roleId: ROLE,
        message: 'Hi',
      }),
    ).toThrow(/no announcement image/);
  });

  it('refuses a draft unless previewing before publishing', () => {
    const draft = release({ draft: true });
    expect(() => buildPayload({ release: draft, roleId: ROLE })).toThrow(
      /draft/,
    );
    expect(
      buildPayload({ release: draft, roleId: ROLE, allowDraft: true }).content,
    ).toMatch(/v1\.1\.0 is out/);
  });

  it.each([undefined, '', 'everyone', '123> @everyone'])(
    'refuses the role id %j',
    (roleId) => {
      expect(() => buildPayload({ release: release(), roleId })).toThrow(
        /role id/,
      );
    },
  );
});

describe('buildForm', () => {
  it('sends the payload as JSON and the image as files[0]', async () => {
    const payload = buildPayload({ release: release(), roleId: ROLE });
    const form = buildForm(payload, PNG);
    expect(JSON.parse(form.get('payload_json'))).toEqual(payload);
    const file = form.get('files[0]');
    expect(file.name).toBe('announcement.png');
    expect(file.type).toBe('image/png');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(PNG);
  });

  it('refuses a payload without exactly one attachment', () => {
    const payload = buildPayload({ release: release(), roleId: ROLE });
    expect(() => buildForm({ ...payload, attachments: [] }, PNG)).toThrow(
      /exactly one/,
    );
  });
});

describe('previewMarkdown', () => {
  it('shows the exact message, who is pinged and the image', () => {
    const payload = buildPayload({
      release: release(),
      roleId: ROLE,
      message: 'Look: ```code```',
    });
    const markdown = previewMarkdown({
      tag: 'v1.1.0',
      payload,
      imageSize: 2 * 1024 * 1024,
      imageUrl: 'https://example.com/announcement.png',
    });
    expect(markdown).toContain(`the release role (${ROLE})`);
    expect(markdown).toContain('announcement.png, 2.0 MB');
    expect(markdown).toContain('````text\nLook: ```code```\n````');
    expect(markdown).toContain(
      '![The announcement image](https://example.com/announcement.png)',
    );
  });
});
