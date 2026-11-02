import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  dateIn,
  extractSection,
  parseVersion,
  releaseUnreleased,
  setPackageVersion,
} from './changelog.mjs';

const CHANGELOG = `# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- **Something new.** It does a thing.

## [1.0.0] - 2026-11-02

### Added

- **The first release.** Everything is new.

### Fixed

- **A fix.** It works now.
`;

describe('parseVersion', () => {
  it('reads an x.y.z version', () => {
    expect(parseVersion('1.20.3')).toEqual([1, 20, 3]);
  });

  it.each(['1.2', 'v1.2.3', '1.2.3-beta.1', '01.2.3', '', '1.2.3 '])(
    'refuses %j',
    (version) => {
      expect(parseVersion(version)).toBeNull();
    },
  );
});

describe('compareVersions', () => {
  it('compares each number, not the text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });
});

describe('dateIn', () => {
  it('gives the date in the time zone, not in UTC', () => {
    // 20:00 UTC on 1 November is 03:00 on 2 November in Vietnam.
    const now = new Date('2026-11-01T20:00:00Z');
    expect(dateIn('Asia/Saigon', now)).toBe('2026-11-02');
    expect(dateIn('UTC', now)).toBe('2026-11-01');
  });
});

describe('setPackageVersion', () => {
  const pkg = `{
  "name": "mechvibes-editor",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.2.8"
  }
}
`;

  it('changes only the top-level version and keeps the formatting', () => {
    expect(setPackageVersion(pkg, '1.1.0')).toBe(
      pkg.replace('"version": "1.0.0"', '"version": "1.1.0"'),
    );
  });

  it.each(['1.0.0', '0.9.9'])('refuses %s, which is not newer', (version) => {
    expect(() => setPackageVersion(pkg, version)).toThrow(/greater/);
  });

  it('refuses a version that is not x.y.z', () => {
    expect(() => setPackageVersion(pkg, 'v1.1.0')).toThrow(/x\.y\.z/);
  });
});

describe('releaseUnreleased', () => {
  it('dates the unreleased section and opens an empty one above it', () => {
    const released = releaseUnreleased(CHANGELOG, '1.1.0', '2026-12-01');
    expect(released).toContain(
      '## [Unreleased]\n\n## [1.1.0] - 2026-12-01\n\n### Added\n\n- **Something new.**',
    );
    expect(released.match(/## \[Unreleased\]/g)).toHaveLength(1);
    expect(released).toContain('## [1.0.0] - 2026-11-02');
  });

  it('keeps Windows line endings', () => {
    const released = releaseUnreleased(
      CHANGELOG.replaceAll('\n', '\r\n'),
      '1.1.0',
      '2026-12-01',
    );
    expect(released).toContain(
      '## [Unreleased]\r\n\r\n## [1.1.0] - 2026-12-01\r\n',
    );
    expect(released.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('refuses a version the changelog already has', () => {
    expect(() => releaseUnreleased(CHANGELOG, '1.0.0', '2026-12-01')).toThrow(
      /already/,
    );
  });

  it('refuses a changelog without an unreleased section', () => {
    const changelog = CHANGELOG.replace('## [Unreleased]', '');
    expect(() => releaseUnreleased(changelog, '1.1.0', '2026-12-01')).toThrow(
      /Unreleased/,
    );
  });
});

describe('extractSection', () => {
  it('gives the body of a version without its heading', () => {
    expect(extractSection(CHANGELOG, '1.0.0')).toBe(
      '### Added\n\n- **The first release.** Everything is new.\n\n### Fixed\n\n- **A fix.** It works now.',
    );
  });

  it('stops at the next section', () => {
    const released = releaseUnreleased(CHANGELOG, '1.1.0', '2026-12-01');
    expect(extractSection(released, '1.1.0')).toBe(
      '### Added\n\n- **Something new.** It does a thing.',
    );
  });

  it('leaves out link definitions at the end of the file', () => {
    const changelog = `${CHANGELOG}\n[1.0.0]: https://example.com/v1.0.0\n`;
    expect(extractSection(changelog, '1.0.0')).not.toContain('example.com');
  });

  it('does not take a version for a longer one that starts the same', () => {
    const changelog = CHANGELOG.replace('## [1.0.0]', '## [1.0.10]');
    expect(() => extractSection(changelog, '1.0.1')).toThrow(/no/);
  });

  it('refuses a missing section', () => {
    expect(() => extractSection(CHANGELOG, '2.0.0')).toThrow(/no/);
  });

  it('refuses an empty section', () => {
    const released = releaseUnreleased(CHANGELOG, '1.1.0', '2026-12-01');
    const empty = releaseUnreleased(released, '1.2.0', '2026-12-02');
    expect(() => extractSection(empty, '1.2.0')).toThrow(/empty/);
  });

  it('refuses a section with headings but no entries', () => {
    const released = releaseUnreleased(CHANGELOG, '1.1.0', '2026-12-01');
    const headingsOnly = releaseUnreleased(
      released,
      '1.2.0',
      '2026-12-02',
    ).replace(
      '## [1.2.0] - 2026-12-02',
      '## [1.2.0] - 2026-12-02\n\n### Added\n\n### Fixed',
    );
    expect(() => extractSection(headingsOnly, '1.2.0')).toThrow(/empty/);
  });
});
