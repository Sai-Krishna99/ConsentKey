# ConsentKey

ConsentKey is a physical consent firewall for high-risk AI actions. It turns the MX Creative Console and Actions Ring into human-intent control points that sit between AI agents and the execution layer.

Core idea:
- AI coding agents move fast
- production systems are fragile
- risky actions should require verified human intent before execution

Current implementation surfaces:
- `MX Creative Console` - primary physical trust surface
- `Actions Ring` - contextual on-screen approval surface
- `MX Master 4` - planned future extension

## What is in this repo

- `app/` - Next.js demo UI and local consent broker API
- `lib/` - shared consent model and in-memory broker
- `plugins/consentkey-actions/` - shared Logitech Actions SDK source (cross-platform reference)
- `plugins/consentkey-actions-windows/` - Windows-native Logitech plugin wrapper (`logitoolkit`-buildable)
- `agents/` - `consent-run` CLI: the agent-side wrapper that the broker gates
- `demo_script.md` - final submission script (Sai + Ankit)

## End-to-end flow

1. An agent wraps its risky command with `consent-run`, e.g. `consent-run kubectl rollout restart deploy/auth-service -n prod`.
2. ConsentKey's broker classifies the risk and pauses execution. The CLI blocks, polling broker state.
3. The pending request is surfaced to the operator through the MX Creative Console and Actions Ring.
4. The operator approves or denies on hardware:
   - **Deny** - request is blocked, CLI exits with `403 Consent Required` (exit 1).
   - **Approve** - broker issues a short-lived approval token; CLI executes in the approved window and exits 0.

Every hardware decision is tagged `surface: "mx-creative-console"` in the broker's audit record, so device-originated approvals are distinguishable from UI- or API-originated ones.

Scenarios wired in code:
- `LOW` - safe preview / diff (single-tap approve)
- `HIGH` - restart auth-service (hold-to-approve ~1.2s)
- `CRITICAL` - rotate secret + restart (reason required on UI surface, hold-to-approve ~1.8s)

## Running the demo

### 1. Install prerequisites (Windows)

- Node.js >= 22 (the plugin wrapper pins `node >= 22.0.0`)
- Logi Options+ (includes `LogiPluginService`)

### 2. Start the broker + UI

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The UI polls `/api/consent/state` every 600ms and reflects broker transitions in real time.

Sanity-check endpoints:
- `GET  /api/consent/state`
- `GET  /api/consent/scenarios`
- `POST /api/consent/request` `{scenarioId, requestedBy, source}`
- `POST /api/consent/approve` `{requestId, surface, reason?}`
- `POST /api/consent/deny` `{requestId, surface, reason?}`

### 3. Build and link the Logitech plugin

```bash
cd plugins/consentkey-actions-windows
npm ci
npm run build
npm run link
```

`npm run link` runs `logitoolkit link`, which creates a symlink at
`%LOCALAPPDATA%\Logi\LogiPluginService\plugins\ConsentKeyActions` -> this folder's `dist/`
and triggers the Logi runtime to reload the plugin. Confirm load in:
`%LOCALAPPDATA%\Logi\LogiPluginService\logs\plugin_logs\ConsentKeyActions.log`

### 4. Bind actions on MX Creative Console

In Logi Options+, the four ConsentKey actions appear under the ConsentKey plugin:
- `Request high-risk consent`
- `Request critical consent`
- `Approve pending consent`
- `Deny pending consent`

Map each to a key on the MX Creative Console. Pressing them will POST to `http://127.0.0.1:3000` and both the UI and any running `consent-run` CLI will react live.

### 5. Run the agent-side CLI

From the repo root in any Windows shell:

```bash
consent-run kubectl rollout restart deploy/auth-service -n prod
```

The CLI submits the action to the broker, prints a consent card, waits for a hardware decision, and either prints `403 Consent Required` (exit 1) on deny or executes the approved command (exit 0).

See [agents/README.md](agents/README.md) for flags, scenario matching, and honesty notes about the stubbed execution layer.

## Category fit

Logitech Dev Studio 2026 track: `MX Creative Console + MX Master 4 & Actions Ring: Innovate with the Actions SDK`.

The current scope intentionally centers `MX Creative Console + Actions Ring`. `MX Master 4` is framed as a natural future extension (pointer-tip interaction at the point of consent) rather than a present requirement.

## Broker implementation notes

- The broker is an in-memory state machine in `lib/consent-broker.ts`.
- A single active request is allowed at a time; concurrent `request` POSTs return `409`.
- Approved decisions produce a `ck_demo_<hash>_<nonce>` token. In production this would be a signed short-lived JWT with claims (action hash, device serial, policy id, expiry); the demo token is a visible string and does not enforce a real expiry.
- Both the plugin and `consent-run` honour the `CONSENTKEY_BROKER_URL` env var; default `http://127.0.0.1:3000`.
- `/api/consent/state` is declared `export const dynamic = "force-dynamic"` and sent with `cache-control: no-store` so polling clients always see fresh state.
