# ConsentKey Actions - Windows wrapper

This is the Logitech toolkit-generated Windows wrapper that actually runs inside `LogiPluginService`. It is the linkable build target for ConsentKey.

## Prerequisites

- Windows (Logi's Node.js Actions SDK is Windows-only during alpha)
- Node.js >= 22 (pinned in `package.json` engines)
- Logi Options+ installed and running (provides `LogiPluginService`)

## Build and link

```bash
npm ci
npm run build
npm run link
```

- `npm run build` runs `tsc --noEmit` then `tsup`, emitting `dist/index.mjs` plus the `actionicons/`, `actionsymbols/`, and `metadata/` folders.
- `npm run link` runs `logitoolkit link`, which symlinks `%LOCALAPPDATA%\Logi\LogiPluginService\plugins\ConsentKeyActions -> dist/` and pokes the runtime to reload.

## Confirming the plugin loaded

Check `%LOCALAPPDATA%\Logi\LogiPluginService\logs\plugin_logs\ConsentKeyActions.log` - a successful load looks like:

```
INFO | Started loading plugin 'ConsentKeyActions' type 'remote'
```

And in `Remote.log`:

```
INFO | Plugin 'ConsentKeyActions' version '0.1.0' loaded from '...\Plugins\ConsentKeyActions' in <ms>
```

## Unlink / rebuild loop

- `npm run unlink` - `logitoolkit unlink`, removes the symlink
- `npm run watch` - rebuild on source changes; re-run `link` (or it reloads automatically, depending on toolkit version)

## Source layout

- `index.ts` - plugin entrypoint; instantiates `PluginSDK`, registers the four actions
- `src/broker-client.ts` - HTTP client against the local Next broker
- `src/actions/*` - one file per action (request-high-risk, request-critical, approve-pending, deny-pending)
- `src/types.ts` - shared types
- `package/actionicons/`, `package/actionsymbols/`, `package/metadata/` - Logi plugin package assets; `LoupedeckPackage.yaml` is the manifest

The same source also lives (as a reference copy) under `../consentkey-actions/src/`. Keep them in sync.

## Broker dependency

The plugin talks to `http://127.0.0.1:3000` by default. Run the root Next app (`npm run dev` from the repo root) before pressing bound Console keys. Override with `CONSENTKEY_BROKER_URL` if needed.
