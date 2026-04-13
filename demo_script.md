# ConsentKey Demo Script — Final Submission Video

Target runtime: 2:00 - 2:30 recorded. Spoken content is pitched at ~1:40 so there's room for visual beats (UI transitions, hardware presses, approval haptic) to land without rushing. Two speakers (`Sai` + `Ankit`); a single-voice cut is also fine — merge both roles into one.

No presentation deck. Opener and closer are CapCut text cards (black background, clean sans-serif, fade in/out). The middle is a live screen recording.

Recording setup (per the "Recording-time checklist" in [WINDOWS_HANDOFF.md](WINDOWS_HANDOFF.md)):
- Broker running: `npm run dev` (root)
- Plugin linked: `npm run link` from `plugins/consentkey-actions-windows/`, confirmed via `ConsentKeyActions.log`
- Browser at `http://localhost:3000/` visible, terminal visible, MX Creative Console on camera
- Reset broker to idle before recording (restart `npm run dev`)
- 4 actions bound on the Console: request high-risk, request critical, approve pending, deny pending

Framing rules:
- Do not say "Cursor" or name a specific AI IDE on camera — our `consent-run` CLI is the legitimate agent-side primitive, not a faked Cursor screen.
- Do not claim the token is signed JWT / has expiry. It's a demo token. If you need to narrate it, say "short-lived token" or "approval token," not "signed JWT."
- Do not claim Console haptics are firing unless they actually are (UI bars are visual indicators, not hardware feedback).

---

## 0:00 - 0:12 — Cold open: the problem

**Visual:** Three text cards on black. One line each, crossfade between them, ~4 seconds per card.
1. `AI coding agents move fast.`
2. `Production systems are fragile.`
3. `Approval dialogs became click-through noise.`

**Voice:**
- **Sai:** AI coding agents now rotate keys, deploy to prod, and restart services — faster than any human can supervise.
- **Ankit:** Software approval dialogs exist. They've been click-through noise for a decade.

**Direction:** Flat, matter-of-fact. This is a problem statement, not a pitch.

**CapCut note:** Use the `Text` → `Basic` style, white on black, one line, fade in/out. Avoid the animated "Trending" tab.

---

## 0:12 - 0:25 — What ConsentKey is

**Visual:** Two text cards on black, still clean and minimal.
1. `ConsentKey`
2. `Verified human intent, through hardware.`

Then crossfade to the live screen recording (browser at `localhost:3000/` idle, terminal visible, Console in frame).

**Voice:**
- **Sai:** ConsentKey is a physical consent firewall for high-risk AI actions.
- **Ankit:** It puts deliberate human intent — expressed through Logitech hardware — between the agent and execution.

**Direction:** The crossfade to the live setup should land on "expressed through Logitech hardware."

---

## 0:25 - 1:00 — The block path (hero moment)

**Visual cue to start:** Terminal cursor in frame, UI showing `Ready for consent request`.

**Terminal (typed once, then keep on screen):**
```
$ consent-run kubectl rollout restart deploy/auth-service -n prod
```

**Voice (as the line is typed):**
- **Sai:** Here's a real agent-side wrapper. It proposes a high-risk production restart.

**Visual as command runs:**
- CLI prints the `proposed action` block with command, risk=HIGH, policy id, blast radius
- CLI prints `requesting consent via http://127.0.0.1:3000...`
- UI on the browser flips from `Ready` to amber `Awaiting human consent` with the full consent card (command, risk badge, diff preview, blast radius)
- CLI prints `⏸ awaiting human approval on MX Creative Console + Actions Ring...`

**Voice (over those transitions):**
- **Ankit:** ConsentKey intercepts. The broker pauses execution. The agent is blocked until a human decides. On the Console, the operator sees exactly what would run, at what risk, with what blast radius.

**Direction:** Hold on the awaiting state for ~2 seconds so it lands. Don't rush.

**Visual — the hero beat:**
- Close-up on the MX Creative Console; press the **Deny pending consent** key
- Cut back to the terminal: CLI prints `✗ denied  surface=mx-creative-console` then `ERROR: 403 Consent Required — action blocked.`
- UI flips to red `Blocked - Consent Required`

**Voice (firm):**
- **Sai:** No approval, no execution.
- **Ankit:** The process exits with a 403. The agent cannot proceed.

**Direction:** This is the first mic-drop. Pause briefly before moving on.

---

## 1:00 - 1:35 — The approve path

**Visual:** Terminal re-runs the same command:
```
$ consent-run kubectl rollout restart deploy/auth-service -n prod
```

UI flips back to amber awaiting with the same consent card.

**Voice:**
- **Sai:** Now the agent proposes the same action again, and this time the operator does intend to run it.
- **Ankit:** ConsentKey requires a deliberate physical confirmation. Not a checkbox — a press-and-hold on the Console.

**Visual — the approve beat:**
- Close-up on the Console; press **Approve pending consent**
- UI flips to green `Approved - Token Issued` with the token shown
- CLI prints `✓ approved  surface=mx-creative-console`, then the token line, then executes the stubbed `kubectl rollout restart` output and exits 0 with `completed under approval  duration=0.61s`

**Voice (over the approve and execution):**
- **Sai:** The broker issues a short-lived approval token bound to the action hash.
- **Ankit:** Without it, 403. With it, a bounded window in which the action can run.

**Direction:** Let the terminal stub output (`deployment.apps/auth-service restarted`) breathe before cutting.

---

## 1:35 - 1:55 — Architecture (credibility pass)

**Visual:** Cut to the architecture page at `/architecture`. Pan or hold.

**Voice:**
- **Sai:** Under the hood: three pieces. A Logitech Actions SDK plugin — `surface: mx-creative-console` tags every device decision. A local consent broker evaluating risk and issuing approval tokens. And a thin agent adapter — the `consent-run` CLI you just saw.
- **Ankit:** What shipped today: the trust surface and the broker contract, running on real hardware. What's next: signed JWTs, hash-chained audit, and adapters for GitHub Actions, LangChain, and AutoGen.

**Direction:** Don't linger on the architecture. This is a credibility pass, not a deep dive.

---

## 1:55 - 2:05 — Close

**Visual:** Closing text card on black. Three lines stacked, all visible at once.
```
ConsentKey
Verified human intent for AI actions
MX Creative Console + Actions Ring today. MX Master 4 next.
```
`ConsentKey` larger than the other two lines. Fade in, hold, hard cut to end.

**Voice:**
- **Sai:** ConsentKey keeps AI agents useful in production —
- **Ankit:** — without removing the human where it actually matters.

**Direction:** Let the voice finish before the hard cut. Card holds ~1.5s after the last syllable.

---

## If things go wrong during recording

- **Broker state stuck in `blocked` or `approved`**: restart `npm run dev` (from the repo root) between takes. Takes ~2 seconds. Alternative: reset by triggering and approving a LOW scenario from the Operator Panel.
- **Console press not registering**: confirm the plugin is still linked via `ConsentKeyActions.log` at `%LOCALAPPDATA%\Logi\LogiPluginService\logs\plugin_logs\`. If missing or empty, re-run `npm run link` from the plugin wrapper folder.
- **CLI times out (>2 min without a decision)**: means the press didn't land. Exit the CLI (Ctrl-C), deny the stale request via Operator Panel, re-run.
- **UI at `localhost:3000` shows blank / `404`**: Next.js hasn't compiled `/` yet. `curl -s http://localhost:3000/ >/dev/null` forces the compile; then reload the browser.

## Variants worth having

- **One-voice cut:** merge Sai + Ankit lines, remove the back-and-forth. Script gets ~15% shorter.
- **90-second cut:** drop the architecture section entirely. Lands at ~1:40. Good for channels with shorter attention spans.
- **LOW-risk variant:** use `kubectl-diff-low` scenario for a single-tap approve path. Less dramatic than HIGH, but demonstrates the risk-calibration point.
