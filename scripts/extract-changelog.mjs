// Prints the CHANGELOG.md section of one version, without its heading: the
// release workflow puts it at the top of the GitHub release notes.
//
// Usage: node scripts/extract-changelog.mjs 1.2.0

import { readFileSync } from 'node:fs';
import { extractSection } from './changelog.mjs';

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/extract-changelog.mjs <x.y.z>');
  process.exit(1);
}

try {
  const changelog = readFileSync(
    new URL('../CHANGELOG.md', import.meta.url),
    'utf8',
  );
  console.log(extractSection(changelog, version));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
