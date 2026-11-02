// The Discord announcement logic behind announce-release.mjs: the message
// built from the release notes, the image it carries and the request that
// posts both. Everything here works on plain values, so it is tested without
// GitHub or Discord.

export const EDITOR_URL = 'https://editor.mechvibes.com';
// Discord's cap on a message's content. Lengths are counted in UTF-16 units,
// which is never fewer than the characters Discord counts, so a message that
// fits here fits there.
export const MESSAGE_LIMIT = 2000;
// The largest image a release announcement attaches.
export const IMAGE_LIMIT = 8 * 1024 * 1024;

const IMAGE_NAME = /^announcement\.(png|jpe?g|webp|gif)$/i;
const IMAGE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};
// The first bytes of each image type, so a renamed file is caught before
// Discord shows it as a broken attachment.
const IMAGE_SIGNATURES = {
  'image/png': (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  'image/gif': (b) => ascii(b, 0, 4) === 'GIF8',
};
// The changelog section comes first in the release notes. GitHub's list of
// pull requests and the notes for developers are not news for pack makers.
const DIGEST_END = [/^## What.s Changed/, /^### For developers/];
const BOLD_LEAD = /^- \*\*([^*]+)\*\*/;
const ROLE_ID = /^\d+$/;

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

// Rounded up, so an image just over the limit never shows as the limit.
function megabytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(Math.ceil((bytes * 10) / (1024 * 1024)) / 10).toFixed(1)} MB`;
}

/**
 * One line per change in the release notes: each bullet's bold lead, or its
 * first sentence when it has none. The full notes overflow Discord's cap, and
 * the footer links to them.
 */
export function digestNotes(body) {
  const digest = [];
  for (const line of (body ?? '').split(/\r?\n/)) {
    if (DIGEST_END.some((end) => end.test(line))) break;
    if (!line.startsWith('- ')) continue;
    const lead = BOLD_LEAD.exec(line);
    if (lead) {
      // A lead such as "Three ways in:" introduces text the digest leaves out.
      digest.push(`- ${lead[1].trim().replace(/[:;,]$/, '.')}`);
      continue;
    }
    const text = line.slice(2).trim();
    const end = text.indexOf('. ');
    digest.push(`- ${end === -1 ? text : text.slice(0, end + 1)}`);
  }
  return digest;
}

// The lines that fit in `room`, whole: a cut mid-sentence looks broken, so
// the lines that do not fit are counted instead.
function fitLines(lines, room) {
  for (let kept = lines.length; kept >= 0; kept--) {
    const left = lines.length - kept;
    const text = [
      ...lines.slice(0, kept),
      ...(left ? [`- …and ${left} more in the release notes`] : []),
    ].join('\n');
    if (text.length <= room) return text;
  }
  throw new Error('The announcement has no room for the list of changes.');
}

/**
 * The message text. A hand-written `message` is used as it is; otherwise the
 * greeting, the digest of the notes and the links. A test run says so first.
 */
export function buildContent({ tag, url, notes, roleId, test, message }) {
  const testLabel = test
    ? '🧪 **Test announcement, please ignore.** It pings nobody.\n\n'
    : '';
  if (message !== undefined) {
    if (!message.trim()) throw new Error('The custom message is empty.');
    const content = `${testLabel}${message}`;
    if (content.length > MESSAGE_LIMIT) {
      throw new Error(
        `The custom message is ${content.length} characters with everything added to it; Discord allows ${MESSAGE_LIMIT}.`,
      );
    }
    return content;
  }
  const digest = digestNotes(notes);
  if (!digest.length) {
    throw new Error(
      `The release notes of ${tag} have no bullet to announce. Write the message by hand instead.`,
    );
  }
  const head = `${testLabel}Hi <@&${roleId}>, **Mechvibes Editor** ${tag} is out! 🎉\n\nThis is the sound pack editor on the web (editor.mechvibes.com), not the Mechvibes desktop app. Here is what’s new:\n\n`;
  const foot = `\n\n**Try it & full changelog:**\n- It is already live at ${EDITOR_URL}, reload the page if you have it open\n- GitHub release: ${url}`;
  return (
    head + fitLines(digest, MESSAGE_LIMIT - head.length - foot.length) + foot
  );
}

/**
 * The one announcement image among the release assets. Throws when there is
 * none, more than one, or it is too big.
 */
export function pickImageAsset(tag, assets) {
  const images = (assets ?? []).filter((asset) => IMAGE_NAME.test(asset.name));
  if (!images.length) {
    throw new Error(
      `Release ${tag} has no announcement image. Attach a screenshot of its highlight: gh release upload ${tag} announcement.png`,
    );
  }
  if (images.length > 1) {
    throw new Error(
      `Release ${tag} has ${images.length} announcement images (${images.map((asset) => asset.name).join(', ')}). Keep exactly one.`,
    );
  }
  const [image] = images;
  if (image.size > IMAGE_LIMIT) {
    throw new Error(
      `${image.name} is ${megabytes(image.size)}; an announcement image must be ${megabytes(IMAGE_LIMIT)} or less.`,
    );
  }
  return image;
}

/** The media type of the image bytes, checked against the file name and size. */
export function checkImage(filename, bytes) {
  const match = IMAGE_NAME.exec(filename);
  if (!match) throw new Error(`${filename} is not an announcement image name.`);
  if (bytes.length > IMAGE_LIMIT) {
    throw new Error(
      `${filename} is ${megabytes(bytes.length)}; an announcement image must be ${megabytes(IMAGE_LIMIT)} or less.`,
    );
  }
  const type = IMAGE_TYPES[match[1].toLowerCase()];
  if (!IMAGE_SIGNATURES[type](bytes)) {
    throw new Error(
      `${filename} is not a ${type.slice(6).toUpperCase()} image.`,
    );
  }
  return type;
}

/**
 * The webhook payload for a release. Only the release role can be pinged,
 * never @everyone or a user, and a test run pings nobody: the role still
 * shows in the text, but no one is notified. A draft is refused unless
 * `allowDraft`, which only the preview made before publishing uses.
 */
export function buildPayload({
  release,
  roleId,
  test = false,
  message,
  allowDraft = false,
}) {
  if (release.draft && !allowDraft) {
    throw new Error(
      `Release ${release.tag_name} is still a draft. Publish it first.`,
    );
  }
  if (!ROLE_ID.test(roleId ?? '')) {
    throw new Error(
      `The release role id must be a number, such as 123456789012345678 (got "${roleId ?? ''}").`,
    );
  }
  const image = pickImageAsset(release.tag_name, release.assets);
  return {
    content: buildContent({
      tag: release.tag_name,
      url: release.html_url,
      notes: release.body,
      roleId,
      test,
      message,
    }),
    allowed_mentions: { parse: [], roles: test ? [] : [roleId] },
    attachments: [{ id: 0, filename: image.name }],
  };
}

/**
 * The multipart body Discord takes for a message with a file: the JSON
 * payload, and the image as files[0], which attachments[0] describes.
 */
export function buildForm(payload, bytes) {
  const [attachment, ...rest] = payload.attachments ?? [];
  if (!attachment || rest.length || attachment.id !== 0) {
    throw new Error('The payload must describe exactly one attachment, id 0.');
  }
  const type = checkImage(attachment.filename, bytes);
  if (payload.content.length > MESSAGE_LIMIT) {
    throw new Error(`The message is over ${MESSAGE_LIMIT} characters.`);
  }
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('files[0]', new Blob([bytes], { type }), attachment.filename);
  return form;
}

/** The preview as Markdown, for the job summary or a local file. */
export function previewMarkdown({ tag, payload, imageSize, imageUrl }) {
  const roles = payload.allowed_mentions.roles;
  // A fence longer than any run of backticks in the message keeps it whole.
  const longest = Math.max(
    0,
    ...(payload.content.match(/`+/g) ?? []).map((run) => run.length),
  );
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return [
    `## Discord announcement for ${tag}`,
    '',
    `- Pings: ${roles.length ? `the release role (${roles[0]})` : 'nobody'}`,
    `- Image: ${payload.attachments[0].filename}, ${megabytes(imageSize)}`,
    `- Length: ${payload.content.length} of ${MESSAGE_LIMIT} characters`,
    '',
    `${fence}text`,
    payload.content,
    fence,
    '',
    `![The announcement image](${imageUrl})`,
    '',
  ].join('\n');
}
