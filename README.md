# ConsentKey
ConsentKey is a software layer that turns the MX Creative Console and Actions Ring into human-intent control points for AI systems, with MX Master 4 planned as a future extension.

## UI Mock (Hackathon Demo)
This repo now includes a local Next.js + Tailwind UI mock for the ConsentKey console-first approval flow built around MX Creative Console and Actions Ring.

### Run locally
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Demo behavior included
- Presenter-first screen (clean device view) with toggleable `Operator Mode`
- Scenario selector for LOW / HIGH / CRITICAL actions
- Consent broker states: idle, awaiting consent, blocked (403), approved (token issued)
- Built-in mock agent terminal stream showing request, `403`, and token handoff lines
- Pending dwell window (~1.2s) before deny/approve is allowed, to emphasize human pause
- Console-first consent interaction designed to map onto Actions Ring and MX Creative Console inputs
- Risk-calibrated approvals:
  - LOW: single-click approve
  - HIGH: hold-to-approve (~1.2s)
  - CRITICAL: reason required (min 8 chars) + hold-to-approve (~1.8s)

## Local Broker API
The app now exposes a local consent broker API for Logitech integration work:

- `GET /api/consent/scenarios`
- `GET /api/consent/state`
- `POST /api/consent/request`
- `POST /api/consent/approve`
- `POST /api/consent/deny`

This gives the Actions SDK plugin a real contract to call instead of relying only on UI-local demo state.

## Actions SDK Implementation
The repository now includes a first-pass Logitech plugin source scaffold in `plugins/consentkey-actions`.

Current intent:
- `MX Creative Console` and `Actions Ring` are the primary implementation surfaces
- `MX Master 4` remains a later extension

Important note:
- Logitech's published Node.js Actions SDK docs currently describe the SDK as `Windows-only` during alpha, so the plugin portion should be developed and tested on Windows with the official toolkit-generated wrapper project.

## Repo Layout
- `app/` - Next.js demo UI and local broker API
- `lib/` - shared consent broker model and server-side logic
- `plugins/consentkey-actions/` - shared Actions SDK source we own
- `plugins/consentkey-actions-windows/` - Windows-only toolkit wrapper project for Logitech runtime testing

## Cross-Platform Workflow
Keep this as a single repo.

- On WSL, Linux, or macOS:
  - work on `app/`, `lib/`, docs, and shared plugin source
  - run the broker and UI locally with `npm run dev`
- On Windows:
  - open the same repo when working with Logitech's toolkit and device runtime
  - use `plugins/consentkey-actions-windows/` for the generated wrapper project
  - keep the shared logic in `plugins/consentkey-actions/`

Recommended flow:
1. Build and review product logic in the shared repo.
2. On Windows, generate the Logitech toolkit wrapper in `plugins/consentkey-actions-windows/`.
3. Copy or sync the shared `src/` implementation from `plugins/consentkey-actions/` into that wrapper project.
4. Test against Logi Options+ and MX Creative Console on Windows.

Practical note:
- Opening the same repo from Windows is fine.
- If Logitech file watching or plugin linking behaves poorly against the WSL filesystem path, keep the repository structure the same but use a native Windows checkout for runtime testing.
