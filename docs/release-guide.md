# Release guide

The editor has a version, shown next to its name in the navbar, and a GitHub release for each version that matters to the people using it. This guide covers how the version is chosen, how the changelog is kept, and how a release is made.

## Where the version lives

`version` in [`package.json`](../package.json) is the only place the version is written. Vite inlines it into the build (`__APP_VERSION__` in [`vite.config.ts`](../vite.config.ts)), and the navbar shows it as a link to the [releases page](https://github.com/hainguyents13/mechvibes-editor/releases).

The site deploys from `main` on every push, not from releases. So the live editor can run code newer than the last release, and the version it shows is the last released one until the next release is merged.

## Versioning policy

The editor follows [semantic versioning](https://semver.org/), read for a web app whose output is a sound pack:

- **Major** (`2.0.0`): a pack made or exported by the new editor may not open in older Mechvibes apps, or the pack format changes in a way that is not compatible.
- **Minor** (`1.1.0`): new features. Packs still open in the same Mechvibes apps as before.
- **Patch** (`1.0.1`): fixes only.

Not every merge needs a release. Release after an important update, or when enough has gathered under `[Unreleased]` to be worth announcing.

## Keeping the changelog

[`CHANGELOG.md`](../CHANGELOG.md) follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), like the app's. Each pull request that changes something users can see adds its entry under `## [Unreleased]` at the top, in the same pull request:

- Pick the section: `### Added`, `### Changed`, `### Fixed` or `### Security`. Add the heading if it is not there yet.
- Start each bullet with a short bold lead that says what users get, as good news, then explain in plain sentences.
- Write for the people who make sound packs, not for developers: no file names, function names or internal ids.
- Do not use em dashes.

Changes users cannot see (refactors, tests, CI, docs) need no entry.

## Making a release

1. On an up-to-date branch from `main`, set the version:

   ```bash
   pnpm release:bump 1.1.0
   ```

   This sets `version` in `package.json` and turns `## [Unreleased]` into `## [1.1.0] - <today>` (in Vietnam time), with a fresh, empty `## [Unreleased]` above it. It refuses a version that is not `x.y.z` or not greater than the current one, and it does not commit.

2. Read the new section in `CHANGELOG.md` and finish it: merge duplicate entries, check every bullet still holds, and fix the wording. `pnpm --silent release:notes 1.1.0` prints the section as the release will show it.

3. Commit as `chore: release v1.1.0`, open a pull request and merge it once CI passes.

4. Tag the merge commit on `main` and push the tag:

   ```bash
   git switch main
   git pull
   git tag v1.1.0
   git push origin v1.1.0
   ```

5. The [Release workflow](../.github/workflows/release.yml) runs on the tag. It checks that the tag is `v` plus the `package.json` version, that the commit is on `main`, and that the tag has no release yet, then runs lint, typecheck, tests and the build. If all of that passes, it creates a **draft** release named `v1.1.0`: the changelog section first, then the list of merged pull requests GitHub generates.

6. Open the draft on the [releases page](https://github.com/hainguyents13/mechvibes-editor/releases), review it, and press **Publish release**.

If the workflow fails, fix the cause on `main` through a pull request, then move the tag to the fixed commit (`git tag -f v1.1.0 <commit>` and `git push -f origin v1.1.0`) while the release is not published yet. Delete a draft before tagging again, or the workflow refuses to make a second one.
