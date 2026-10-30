# Mechvibes Editor

A browser-based sound pack editor for [Mechvibes](https://github.com/hainguyents13/mechvibes). Load an audio file, map sounds to keys, and export a sound pack zip that the app can import.

Open it at [editor.mechvibes.com](https://editor.mechvibes.com).

The editor runs entirely in the browser. It has no backend and needs no account. To share a pack, upload the exported zip to the sound pack library on the Mechvibes website.

## Development

Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev        # start the dev server
pnpm lint       # biome check
pnpm typecheck  # tsc
pnpm build      # typecheck and build to dist/
```

## Deployment

The editor is a static site. The `Dockerfile` builds it and serves `dist/` with nginx on port 80, falling back to `index.html` for every path.

```bash
docker build -t mechvibes-editor .
docker run -p 8080:80 mechvibes-editor
```

`VITE_WEBSITE_URL` is the Mechvibes website the editor links to and calls (default `https://mechvibes.com`). Vite inlines it, and the image's Content-Security-Policy allows API calls to its origin, so pass it as a build argument: `--build-arg VITE_WEBSITE_URL=...`. See [`.env.example`](./.env.example).

## Publishing to the library

1. Build the pack here and export the zip.
2. On the Mechvibes website, create a pack from that zip. The website fills in the pack details from `config.json`, and from then on it owns them: it writes the pack's id, name, description and author into `config.json` when it publishes.
3. To change a published pack, sign in (the editor uses your website session), open it from **My packs**, edit, and press **Update** to publish the next revision. Importing its zip, exporting and uploading on the pack's page works too.

The editor never invents an `id`. It keeps the `id` of an imported zip, so a published pack's zip still matches its pack; otherwise it writes none. The website API the editor uses is documented in the website repo (`docs/editor-api.md`).

To work against a local website, run it on `localhost:3000` with `NEXT_PUBLIC_EDITOR_URL=http://localhost:5173`, and run the editor with `VITE_WEBSITE_URL=http://localhost:3000` (for example in a git-ignored `.env.local`). Both must be on `localhost` for the session cookie to be sent.

## Sound pack format

Exported packs follow the `config.json` v2 format documented in the app repo: [soundpack-config-v2.md](https://github.com/hainguyents13/mechvibes/blob/main/docs/soundpack-config-v2.md).

## License

[MIT](./LICENSE)
