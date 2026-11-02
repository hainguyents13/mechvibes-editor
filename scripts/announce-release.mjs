// Announces a release on Discord in two steps, so nothing is posted that was
// not seen first. `preview` builds the message from the GitHub release,
// downloads its announcement image and saves both, posting nothing. `post`
// sends what a preview saved, once it has checked that the release still has
// that same image. The announce-release workflow runs both, with an approval
// in between. See docs/release-guide.md.
//
// Usage:
//   pnpm release:announce v1.2.0 [--test] [--message-file message.txt]
//   node scripts/announce-release.mjs preview --tag v1.2.0 [--test]
//     [--message-file message.txt] [--published] [--out dir]
//   WEBHOOK=<Discord webhook URL> node scripts/announce-release.mjs post --dir dir
//
// Both read the release with GH_TOKEN, or the gh login when it is not set, so
// preview works on a draft. The role it pings is DISCORD_RELEASE_ROLE_ID,
// read from the repository variable when the environment does not set it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  buildForm,
  buildPayload,
  checkImage,
  checkImageUnchanged,
  imageRecord,
  previewMarkdown,
  releaseUrl,
} from './announcement.mjs';

const REPO = process.env.GITHUB_REPOSITORY || 'hainguyents13/mechvibes-editor';
const REPO_URL = `${(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, '')}/${REPO}`;
const API = `${(process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '')}/`;
const ROLE_VARIABLE = 'DISCORD_RELEASE_ROLE_ID';

function githubToken() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) return token;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Sign in with `gh auth login`, or set GH_TOKEN.');
  }
}

async function github(path, accept = 'application/vnd.github+json') {
  const url = new URL(path, API);
  // The token only ever goes to the GitHub API. GitHub answers an asset
  // download with a redirect to its storage, and fetch drops the token there.
  if (!url.href.startsWith(API))
    throw new Error(`Not a GitHub API URL: ${url}`);
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${githubToken()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'mechvibes-editor-release',
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      `GitHub answered ${response.status} for ${url.pathname}: ${body.message ?? response.statusText}`,
    );
    error.status = response.status;
    throw error;
  }
  return response;
}

// Looking a release up by tag does not find drafts, so the list is searched.
async function findRelease(tag) {
  for (let page = 1; ; page++) {
    const response = await github(
      `repos/${REPO}/releases?per_page=100&page=${page}`,
    );
    const releases = await response.json();
    const release = releases.find((item) => item.tag_name === tag);
    if (release) return release;
    if (releases.length < 100) {
      throw new Error(
        `${REPO} has no release for ${tag}. Push the tag; the Release workflow drafts it.`,
      );
    }
  }
}

async function releaseRoleId() {
  const fromEnv = process.env[ROLE_VARIABLE];
  if (fromEnv) return fromEnv;
  const missing = `${ROLE_VARIABLE} is not set. Set it as a repository variable: gh variable set ${ROLE_VARIABLE}`;
  // The workflow passes the variable in; its token cannot read variables.
  if (process.env.GITHUB_ACTIONS) throw new Error(missing);
  try {
    const response = await github(
      `repos/${REPO}/actions/variables/${ROLE_VARIABLE}`,
    );
    return (await response.json()).value;
  } catch (error) {
    if (error.status === 404) throw new Error(missing);
    throw error;
  }
}

async function preview(values, positionals) {
  const tag = values.tag ?? positionals[0];
  if (!tag) throw new Error('Which release? Pass its tag, such as v1.2.0.');
  const message =
    values['message-file'] === undefined
      ? undefined
      : readFileSync(values['message-file'], 'utf8').trimEnd();
  const release = await findRelease(tag);
  const payload = buildPayload({
    release,
    repoUrl: REPO_URL,
    roleId: await releaseRoleId(),
    test: values.test,
    message,
    allowDraft: !values.published,
  });

  const { filename } = payload.attachments[0];
  const asset = release.assets.find((item) => item.name === filename);
  const response = await github(asset.url, 'application/octet-stream');
  const image = new Uint8Array(await response.arrayBuffer());
  checkImage(filename, image);

  const out = resolve(
    values.out ?? join(tmpdir(), 'mechvibes-editor-announcement', tag),
  );
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, filename), image);
  writeFileSync(
    join(out, 'payload.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  writeFileSync(
    join(out, 'image.json'),
    `${JSON.stringify(imageRecord(tag, asset), null, 2)}\n`,
  );
  writeFileSync(
    join(out, 'preview.md'),
    previewMarkdown({
      tag,
      payload,
      imageSize: image.length,
      // The download link works in a browser once the release is published;
      // a draft's image is the copy saved next to the preview.
      imageUrl: release.draft ? filename : asset.browser_download_url,
    }),
  );

  const roles = payload.allowed_mentions.roles;
  console.log(`${payload.content}

---
Release: ${releaseUrl(REPO_URL, tag)}${release.draft ? ' (draft)' : ''}
Pings:   ${roles.length ? `the release role (${roles[0]})` : 'nobody (test)'}
Image:   ${join(out, filename)}
Saved:   ${join(out, 'payload.json')}
Nothing was posted.`);
}

async function post(values) {
  if (!values.dir)
    throw new Error('Pass the preview folder: post --dir <dir>.');
  const webhook = process.env.WEBHOOK;
  if (!webhook) {
    throw new Error(
      'WEBHOOK is not set, so nothing was posted. Add the DISCORD_RELEASE_WEBHOOK secret to the discord-announce environment.',
    );
  }
  const payload = JSON.parse(
    readFileSync(join(values.dir, 'payload.json'), 'utf8'),
  );
  const image = readFileSync(join(values.dir, payload.attachments[0].filename));
  const form = buildForm(payload, image);
  const saved = JSON.parse(
    readFileSync(join(values.dir, 'image.json'), 'utf8'),
  );
  checkImageUnchanged(saved, await findRelease(saved.tag));

  // wait=true makes Discord answer with the message, or with why it refused.
  const url = new URL(webhook);
  url.searchParams.set('wait', 'true');
  const response = await fetch(url, { method: 'POST', body: form });
  const answer = await response.text();
  if (!response.ok) {
    // The webhook URL holds its token, so the error leaves it out.
    throw new Error(
      `Discord refused the message (${response.status}): ${answer}`,
    );
  }
  let id;
  try {
    id = JSON.parse(answer).id;
  } catch {}
  console.log(`Posted to Discord${id ? `, message ${id}` : ''}.`);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    tag: { type: 'string' },
    test: { type: 'boolean', default: false },
    'message-file': { type: 'string' },
    published: { type: 'boolean', default: false },
    out: { type: 'string' },
    dir: { type: 'string' },
  },
});
const [command, ...rest] = positionals;

try {
  if (command === 'preview') await preview(values, rest);
  else if (command === 'post') await post(values);
  else {
    throw new Error(
      'Usage: node scripts/announce-release.mjs preview <tag> | post --dir <dir>',
    );
  }
} catch (error) {
  // fetch only says "fetch failed"; the code of its cause says why. Neither
  // holds the webhook URL.
  const cause = error?.cause?.code ? ` (${error.cause.code})` : '';
  console.error(`${error instanceof Error ? error.message : error}${cause}`);
  process.exit(1);
}
