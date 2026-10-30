# Mechvibes Editor

A browser-based sound pack editor for [Mechvibes](https://github.com/hainguyents13/mechvibes). Load an audio file, map sounds to keys, and export a sound pack zip that the app can import.

The editor runs entirely in the browser. It has no backend and needs no account. To share a pack, upload the exported zip to the sound pack library on the Mechvibes website.

> Status: early setup. The editor is being moved here from the Mechvibes website.

## Development

Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev        # start the dev server
pnpm lint       # biome check
pnpm build      # typecheck and build to dist/
```

## Sound pack format

Exported packs follow the `config.json` v2 format documented in the app repo: [soundpack-config-v2.md](https://github.com/hainguyents13/mechvibes/blob/main/docs/soundpack-config-v2.md).

## License

[MIT](./LICENSE)
