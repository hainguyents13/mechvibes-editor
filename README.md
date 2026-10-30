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

`VITE_LIBRARY_ORIGINS` lists the comma-separated sites the editor may load packs from through `?source=`; the first one is the website it links back to. Vite reads it at build time, so pass it as a build argument (`--build-arg VITE_LIBRARY_ORIGINS=...`), not as a runtime variable. It defaults to `https://mechvibes.com`. See [`.env.example`](./.env.example).

## Opening a library pack

The Mechvibes website opens the editor with `?pack=<id>&name=<name>&author=<name>`, plus `&source=<download url>` for a fork. A valid `mv-<32 hex>` pack id is written as `id` in the exported `config.json`; otherwise the editor writes no `id` unless the loaded zip had one. Other parameters, such as `utm_*`, are ignored.

## Sound pack format

Exported packs follow the `config.json` v2 format documented in the app repo: [soundpack-config-v2.md](https://github.com/hainguyents13/mechvibes/blob/main/docs/soundpack-config-v2.md).

## License

[MIT](./LICENSE)
