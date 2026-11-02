// Starts a release: sets the version in package.json and dates the
// [Unreleased] section of CHANGELOG.md as that version. It does not commit,
// tag or push. See docs/release-guide.md.
//
// Usage: pnpm release:bump 1.2.0

import { readFileSync, writeFileSync } from 'node:fs';
import { dateIn, releaseUnreleased, setPackageVersion } from './changelog.mjs';

const packagePath = new URL('../package.json', import.meta.url);
const changelogPath = new URL('../CHANGELOG.md', import.meta.url);
const version = process.argv[2];

if (!version) {
  console.error('Usage: pnpm release:bump <x.y.z>');
  process.exit(1);
}

try {
  // Both files are worked out before either is written, so a refusal leaves
  // them as they were.
  const packageText = setPackageVersion(
    readFileSync(packagePath, 'utf8'),
    version,
  );
  const changelog = releaseUnreleased(
    readFileSync(changelogPath, 'utf8'),
    version,
    dateIn('Asia/Saigon'),
  );
  writeFileSync(packagePath, packageText);
  writeFileSync(changelogPath, changelog);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`Version set to ${version}. Next:
  1. Fill in the ${version} section of CHANGELOG.md.
  2. Commit as "chore: release v${version}" and open a pull request.
  3. Once it is merged, tag the merge commit on main and push the tag:
     git tag v${version} && git push origin v${version}`);
