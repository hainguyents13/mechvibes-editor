// The version and changelog logic behind bump-version.mjs and
// extract-changelog.mjs. Everything here works on strings, so it is tested
// without touching the real package.json or CHANGELOG.md.

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const UNRELEASED_HEADING = /^## \[Unreleased\]\s*$/;
const SECTION_HEADING = /^## \[/;
const HEADING = /^#{1,6}\s/;
// A Keep a Changelog file may end with link definitions such as
// "[1.0.0]: https://...", which belong to no section.
const LINK_DEFINITION = /^\[[^\]]+\]:\s/;

/** The three numbers of an x.y.z version, or null when it is not one. */
export function parseVersion(version) {
  const match = SEMVER.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

/** Negative when a is older than b, zero when equal, positive when newer. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) throw new Error(`Not an x.y.z version: ${a}, ${b}`);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/** Today's date as YYYY-MM-DD in the given time zone. */
export function dateIn(timeZone, now = new Date()) {
  // The Canadian English format is already YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function splitLines(text) {
  return {
    lines: text.split(/\r?\n/),
    eol: text.includes('\r\n') ? '\r\n' : '\n',
  };
}

function findVersionHeading(lines, version) {
  const heading = `## [${version}]`;
  return lines.findIndex(
    (line) => line === heading || line.startsWith(`${heading} `),
  );
}

/** package.json text with its version set to the new one, formatting kept. */
export function setPackageVersion(packageText, version) {
  const current = JSON.parse(packageText).version;
  if (!parseVersion(version)) {
    throw new Error(`"${version}" is not an x.y.z version, such as 1.2.0.`);
  }
  if (!parseVersion(current)) {
    throw new Error(`package.json has no x.y.z version (found "${current}").`);
  }
  if (compareVersions(version, current) <= 0) {
    throw new Error(
      `The new version ${version} must be greater than the current ${current}.`,
    );
  }
  // The top-level "version" is the first one in the file: dependency
  // versions sit inside objects further down.
  const updated = packageText.replace(
    /("version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
  );
  if (JSON.parse(updated).version !== version) {
    throw new Error('Could not update the version in package.json.');
  }
  return updated;
}

/**
 * The changelog with its [Unreleased] section turned into the release of
 * `version` on `date`, under a fresh, empty [Unreleased] section.
 */
export function releaseUnreleased(changelog, version, date) {
  if (!parseVersion(version)) {
    throw new Error(`"${version}" is not an x.y.z version, such as 1.2.0.`);
  }
  const { lines, eol } = splitLines(changelog);
  if (findVersionHeading(lines, version) !== -1) {
    throw new Error(`CHANGELOG.md already has a section for ${version}.`);
  }
  const index = lines.findIndex((line) => UNRELEASED_HEADING.test(line));
  if (index === -1) {
    throw new Error('CHANGELOG.md has no "## [Unreleased]" section.');
  }
  lines.splice(index, 1, '## [Unreleased]', '', `## [${version}] - ${date}`);
  return lines.join(eol);
}

/**
 * The body of the section for `version`, without its heading and trimmed.
 * Throws when the section is missing or has nothing in it.
 */
export function extractSection(changelog, version) {
  const { lines } = splitLines(changelog);
  const start = findVersionHeading(lines, version);
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "## [${version}]" section.`);
  }
  let end = start + 1;
  while (
    end < lines.length &&
    !SECTION_HEADING.test(lines[end]) &&
    !LINK_DEFINITION.test(lines[end])
  ) {
    end++;
  }
  const body = lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
  // Headings such as "### Added" with no entries under them say nothing.
  if (!body.split('\n').some((line) => line.trim() && !HEADING.test(line))) {
    throw new Error(`The CHANGELOG.md section for ${version} is empty.`);
  }
  return body;
}
