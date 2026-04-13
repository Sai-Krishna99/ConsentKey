# ConsentKey — Project One-Pager

**A physical consent firewall for high-risk AI actions, built on the Logitech Actions SDK.**

---

## The Problem

AI coding agents can draft and execute infrastructure commands — service restarts, secret rotations, deployment rollbacks — in seconds. Production systems are fragile. A single unreviewed action can cascade into an outage affecting thousands of users. Today, the only gate between an AI agent's intent and live execution is a text prompt on screen that's easy to miss or reflexively accept. There is no hardware-level, deliberate human-intent verification in the loop.

---

## Our Solution

ConsentKey places a **physical trust boundary** between AI agents and the execution layer. It turns the **MX Creative Console** and **Actions Ring** into human-intent control points. When an agent proposes a risky action, execution is paused until an operator makes a deliberate physical gesture on hardware — not just a click on screen.

---

## How It Works

```
AI Agent ──▶ consent-run CLI ──▶ Consent Broker ──▶ MX Creative Console / Actions Ring
                  │                     │                         │
                  │ (blocked)           │ (classifies risk)       │ (operator decides)
                  │                     │                         │
                  ◀─── 403 denied ◀────┘◀── approve / deny ◀─────┘
                  ◀─── token + exec ◀──┘
```

1. **Agent wraps risky command** with `consent-run` (e.g., `consent-run kubectl rollout restart deploy/auth-service -n prod`).
2. **Broker classifies risk** (LOW / HIGH / CRITICAL) and pauses execution. The CLI blocks, polling broker state.
3. **Request surfaces on hardware** — the MX Creative Console keys and Actions Ring overlay display the pending action with its risk level, diff preview, blast radius, and policy ID.
4. **Operator decides physically:**
   - **LOW risk** — single tap to approve (read-only diffs, safe previews).
   - **HIGH risk** — press and hold ~1.2 seconds to prevent accidental approval (service restarts).
   - **CRITICAL risk** — written reason required + hold ~1.8 seconds (secret rotation + restart).
   - **Deny** — single press on the deny key at any risk level.
5. **Broker responds** — on approval, a short-lived token is issued and the command executes. On denial, the agent receives `403 Consent Required` and exits non-zero. Every decision is tagged with `surface: "mx-creative-console"` in the audit record.

---

## What We Built

| Component | Description |
|---|---|
| **Consent Broker** | In-memory state-machine API (Next.js). Routes: request, approve, deny, state, scenarios. Enforces single-active-request, issues demo tokens on approval. |
| **Logitech Actions SDK Plugin** | Four bound actions: Request High-Risk, Request Critical, Approve Pending, Deny Pending. Cross-platform source with a Windows-native `logitoolkit`-buildable wrapper. |
| **consent-run CLI** | Node.js agent-side adapter. Submits actions to the broker, renders a consent card in the terminal, polls for decisions, and executes on approval. Works with any AI agent or automation tool. |
| **Real-Time UI** | Dashboard polls broker state every 600ms. Shows live status transitions, diff previews, haptic indicator visualization, blast radius warnings, and issued tokens. Includes operator mode for triggering scenarios. |

---

## Logitech Hardware Integration

- **MX Creative Console** — primary physical trust surface. Four keys mapped to ConsentKey actions. Hardware button presses POST directly to the local broker. All approvals are tagged `surface: "mx-creative-console"` in audit records, distinguishing device-originated decisions from UI or API ones.
- **Actions Ring** — contextual on-screen approval surface that overlays the consent card alongside the Console keys.
- **MX Master 4** — planned future extension for pointer-tip interaction at the point of consent (e.g., hover over a flagged line in an IDE to surface the consent card).

---

## Risk-Graduated Interaction Design

| Risk Level | Haptic Pattern | Approval Gesture | Reason Required |
|---|---|---|---|
| **LOW** | Gentle single pulse | Single tap | No |
| **HIGH** | Strong dual pulse | Press + hold 1.2s | No |
| **CRITICAL** | Danger triple pulse | Press + hold 1.8s | Yes (min 8 chars) |

The graduated physical friction is intentional — the higher the blast radius, the more deliberate the gesture required. This prevents rubber-stamping high-risk actions.

---

## Technical Stack

- **Frontend/Broker:** Next.js 14, React, TypeScript, Tailwind CSS
- **Plugin:** Logitech Actions SDK (`@logitech/plugin-sdk`), TypeScript, tsup
- **CLI:** Node.js (ESM), `node:http` for polling
- **State:** In-memory state machine (global singleton with `force-dynamic` routes and `no-store` cache headers for real-time polling)

---

## What's Real vs. Roadmap

**Built and working today:**
- Full broker contract (request → await → approve/deny → token/403)
- Logitech Actions SDK plugin with four hardware-bound actions
- MX Creative Console + Actions Ring integration with live hardware round-trips
- CLI wrapper with request/poll/decide loop and real shell exit codes
- Real-time UI with live state transitions

**Next milestones:**
- Signed JWT tokens with claims (action hash, timestamp, device serial, policy ID, expiry)
- YAML policy engine for custom risk classification rules
- MX Master 4 integration for pointer-based consent at the IDE level

---

## Links

- **GitHub:** https://github.com/Sai-Krishna99/ConsentKey
- **Video:** https://vimeo.com/1182474875
- **Category:** MX Creative Console + MX Master 4 & Actions Ring — Innovate with the Actions SDK

---

*ConsentKey — because the most dangerous button in production should be a physical one.*
