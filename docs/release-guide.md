# Release guide

The editor has a version, shown next to its name in the navbar, and a GitHub release for each version that matters to the people using it. This guide covers how the version is chosen, how the changelog is kept, and how a release is made and announced.

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

Before the first release, do the [one-time setup](#one-time-setup) for the Discord announcement. For 1.0.0, the version and its changelog section are already set: merge them (fix the date in `## [1.0.0]` if the merge is on a later day) and start at step 4.

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

6. Open the draft on the [releases page](https://github.com/hainguyents13/mechvibes-editor/releases) and review it.

7. Take a screenshot of the release's highlight in the live editor and attach it to the draft. Every announcement carries one image, named `announcement.png` (or `.jpg`, `.jpeg`, `.webp`, `.gif`), 8 MB at most:

   ```bash
   gh release upload v1.1.0 announcement.png
   ```

8. Preview the Discord announcement and show it, with the image, to the owner:

   ```bash
   pnpm release:announce v1.1.0
   ```

   It prints the exact message and saves the image and the payload to a folder it names, posting nothing. It reads the draft with your `gh` login. `--test` previews a test run, and `--message-file message.txt` a hand-written message.

9. Press **Publish release**.

10. Publishing starts the [Announce release workflow](../.github/workflows/announce-release.yml). Its preview job builds the message again from the published release and shows it with the image in the run summary. Check that it matches, then approve the **Post to Discord** job (**Review deployments**, then **Approve and deploy**) to post it, within 30 days. Reject it to post nothing.

    The post sends the image the preview job saved. If you replace the image on the release after that, the post job refuses to post: use **Re-run all jobs** to preview the new image, then approve.

If the Release workflow fails, fix the cause on `main` through a pull request, then move the tag to the fixed commit (`git tag -f v1.1.0 <commit>` and `git push -f origin v1.1.0`) while the release is not published yet. Delete a draft before tagging again, or the workflow refuses to make a second one.

## Announcing on Discord

The announcement goes to the same channel as the desktop app's releases, through the same webhook, and pings the same opt-in release role, never `@everyone`. It is posted under the name **Editor Release Bot**, so it is not mistaken for the app's **Release Bot**. Its links show no preview cards, so the release image is the only picture in it. The message says it is about the Mechvibes Editor on the web, not the desktop app, then lists one line per change (the bold lead of each changelog bullet) and links the live editor and the release. A long list is shortened to fit Discord's 2000 characters.

The workflow fails, and posts nothing, when the release has no announcement image or more than one, when the image is over 8 MB or not the type its name says, or when the webhook secret is missing. Fix the cause and run it again from the Actions tab: **Announce release**, **Run workflow**, with the tag. A manual run has two options:

- **test**: marks the message as a test and pings nobody.
- **message**: posts this text as it is, in place of the generated one, with the release image still attached. 2000 characters at most.

A manual run for a release that was already announced posts a second message, and it waits for the same approval.

### One-time setup

1. In **Settings**, **Environments**, create `discord-announce`, or open it if a run already created it (a run creates it without any protection). Add the owner as a **Required reviewer**, and under **Deployment branches and tags** choose **Selected branches and tags** and add the branch `main` and the tag pattern `v*`. Check both are saved before the next step.
2. In the Discord channel, open **Integrations**, **Webhooks**, create a webhook, copy its URL and store it as a secret of that environment, so the workflow only gets it after the approval:

   ```bash
   gh secret set DISCORD_RELEASE_WEBHOOK --env discord-announce
   ```

3. Set the id of the release role as a repository variable: `gh variable set DISCORD_RELEASE_ROLE_ID`.
