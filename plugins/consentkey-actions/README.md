# ConsentKey Actions - shared source

This folder is the cross-platform reference copy of the Logitech Actions SDK source for ConsentKey.

The Windows-native build lives in `../consentkey-actions-windows/` and is what actually gets linked into `LogiPluginService`. That folder contains its own `src/` with the same files; keep them in sync when editing.

## Scope

Current ConsentKey surfaces:
- `MX Creative Console` - primary physical trust surface
- `Actions Ring` - contextual on-screen approval surface
- `MX Master 4` - future extension

## Actions

| Action id | Purpose |
| --- | --- |
| `RequestHighRiskConsent` | Submit a HIGH-risk consent request (restart auth-service scenario) |
| `RequestCriticalConsent` | Submit a CRITICAL consent request (rotate secret + restart scenario) |
| `ApprovePendingConsent` | Approve the currently-pending request, tagged with `surface: "mx-creative-console"` |
| `DenyPendingConsent` | Deny the currently-pending request with reason `"Denied from MX Creative Console"` |

## Broker

Each action uses `ConsentBrokerClient` to call the local Next.js broker:
- `GET  /api/consent/state`
- `POST /api/consent/request`
- `POST /api/consent/approve`
- `POST /api/consent/deny`

Base URL defaults to `http://127.0.0.1:3000`, overridable via `CONSENTKEY_BROKER_URL`.

## Editing

If you change anything under `src/`, mirror the same change under `../consentkey-actions-windows/src/` and rebuild the wrapper with `npm run build` from that folder.
