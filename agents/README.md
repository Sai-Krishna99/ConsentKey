# agents/ — agent-side adapters

This folder contains the thin adapter(s) that sit between an AI coding agent (or any process that wants to execute a risky action) and the ConsentKey broker. They are the "agent" half of the trust boundary: the broker decides, the adapter is blocked until it does, and the adapter only executes if a human approves on hardware.

## What's here

### `consent-run.mjs`

A CLI wrapper. The intended call site is any automation that would otherwise shell out directly to a risky command.

```
consent-run kubectl rollout restart deploy/auth-service -n prod
```

The wrapper:

1. Matches the command against scenarios the broker knows about (`GET /api/consent/scenarios`).
2. Submits a consent request (`POST /api/consent/request`). Broker moves to `awaiting`.
3. Polls `GET /api/consent/state` until the broker decides.
4. On `approved` — prints the issued token and executes the stubbed command (see honesty notes below).
5. On `blocked` — prints `403 Consent Required` and exits non-zero.

Exit codes:
- `0` — approved and executed
- `1` — denied by human (403 Consent Required)
- `2` — usage error, broker unreachable, or timeout

Flags:
- `--scenario <id>` — pick a scenario by id instead of matching the command string
- `--list` — show scenarios the broker recognises
- `--broker <url>` — override `CONSENTKEY_BROKER_URL` (default `http://127.0.0.1:3000`)
- `--timeout <sec>` — how long to wait for a human decision (default 120s)
- `--help`
- `CONSENTKEY_DEBUG=1` env — print per-poll diagnostics

## Invocation

On Windows, from any shell in the repo root:

```bash
consent-run kubectl rollout restart deploy/auth-service -n prod
```

The [consent-run.cmd](../consent-run.cmd) wrapper at the repo root delegates to `node agents/consent-run.mjs`.

From Git Bash, the `.cmd` resolves through PATHEXT. Directly invokable as `node agents/consent-run.mjs <cmd>` in any environment with Node 22+ on PATH.

## Honesty notes (for submission judges)

- **The executed command is a local stub.** The CLI does not actually run kubectl, terraform, or any real infrastructure tool. It prints realistic command output from a per-scenario table in `consent-run.mjs`. This is deliberate: a hackathon demo that runs real `kubectl rollout restart` against a real cluster would be reckless, and running against nothing would look less authentic than the stub. The stub preserves the *shape* of the end-to-end flow (process exits 0/1 based on consent) without touching real infrastructure.
- **The token is a demo string, not a signed JWT.** It contains the action hash and a random nonce, but it is not signed, has no expiry enforcement, and does not actually gate anything beyond the CLI's own execution path. The Devpost submission text describes a signed JWT with claims (action hash, timestamp, user ID, device serial, policy ID) — that is the next milestone, not today's build.
- **What *is* real:** the broker contract, the Logitech Actions SDK plugin, the MX Creative Console key bindings, the hardware round-trip (`surface: mx-creative-console` on every decision that came from a Console press), the CLI's request/poll/decide loop, and the real shell exit codes an orchestrator would actually observe.

## Where this maps to the Devpost pitch

The original submission described three components. This folder fulfills one of them (CLI wrapper). The other two — YAML policy engine and signed-JWT broker — are still on the roadmap.

## Implementation notes

- Uses `node:http` directly rather than Node's global `fetch`. Against Next.js dev mode, undici's keep-alive connection reuse caused a 50+ second response-staleness window after POST-then-GET sequences. The raw-http path with a fresh `http.Agent({ keepAlive: false })` per request avoids it. Not relevant in production (which would use a non-dev server), but worth knowing if someone wonders why the CLI doesn't use `fetch`.
- `/api/consent/state` has `export const dynamic = "force-dynamic"` + `cache-control: no-store` on the response. Without this, Next.js dev mode adds another staleness layer on top.
