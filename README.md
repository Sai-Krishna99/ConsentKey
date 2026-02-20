# ConsentKey
ConsentKey is a software layer that transforms Logitech devices from input peripherals into human-intent control points for AI systems.

## UI Mock (Hackathon Demo)
This repo now includes a local Next.js + Tailwind UI mock for the ConsentKey "MX Console Screen" flow.

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
- Risk-calibrated approvals:
  - LOW: single-click approve
  - HIGH: hold-to-approve (~1.2s)
  - CRITICAL: reason required (min 8 chars) + hold-to-approve (~1.8s)
