# Mechvibes Editor

A browser-based sound pack editor for [Mechvibes](https://github.com/hainguyents13/mechvibes). Load an audio file, map sounds to keys, and export a sound pack zip that the app can import.

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

## Sound pack format

Exported packs follow the `config.json` v2 format documented in the app repo: [soundpack-config-v2.md](https://github.com/hainguyents13/mechvibes/blob/main/docs/soundpack-config-v2.md).

## License

[MIT](./LICENSE)
