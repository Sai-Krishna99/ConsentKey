"use client";

/*
Quick run:
1) npm install
2) npm run dev
3) Open http://localhost:3000

Recording tip:
- Keep "Operator Mode" off for clean product-style recording.
- Toggle it on briefly only to switch scenario and trigger requests.
- Keep the terminal panel visible to show 403 and token handoff.
*/

import { useEffect, useMemo, useRef, useState } from "react";

type Risk = "LOW" | "HIGH" | "CRITICAL";
type BrokerStatus = "idle" | "awaiting" | "blocked" | "approved";
type TerminalTone = "info" | "error" | "success";

type TerminalLine = {
  id: number;
  text: string;
  tone: TerminalTone;
};

type Scenario = {
  id: string;
  label: string;
  menuLabel: string;
  risk: Risk;
  command: string;
  cluster: string;
  namespace: string;
  diffPreview: string[];
  blastRadius: string;
  policyId: string;
  hapticBars: 1 | 2 | 3;
  holdMs: number;
  requiresReason: boolean;
};

const SCENARIOS: readonly Scenario[] = [
  {
    id: "restart-auth-high",
    label: "Incident: Restart auth-service (HIGH)",
    menuLabel: "Restart auth-service (HIGH)",
    risk: "HIGH",
    command: "kubectl rollout restart deploy/auth-service -n prod",
    cluster: "prod-us-east-1",
    namespace: "prod",
    diffPreview: [
      "~ deployment/auth-service generation +1",
      "~ 3 pods will terminate and re-schedule",
      "~ readiness check window: 25s"
    ],
    blastRadius: "Short auth blip possible for 14 downstream services.",
    policyId: "CK-POL-INC-114",
    hapticBars: 2,
    holdMs: 1200,
    requiresReason: false
  },
  {
    id: "rotate-restart-critical",
    label: "Incident: Rotate secret + restart (CRITICAL)",
    menuLabel: "Rotate secret + restart (CRITICAL)",
    risk: "CRITICAL",
    command:
      "kubectl apply -f secret-rotation.yaml && kubectl rollout restart deploy/auth-service -n prod",
    cluster: "prod-us-east-1",
    namespace: "prod",
    diffPreview: [
      "+ secret/auth-service-api-key version bump",
      "~ deployment/auth-service env var checksum update",
      "~ full pod restart with new credentials"
    ],
    blastRadius: "Credential mismatch could degrade auth path for all users.",
    policyId: "CK-POL-SEC-004",
    hapticBars: 3,
    holdMs: 1800,
    requiresReason: true
  },
  {
    id: "kubectl-diff-low",
    label: "Low-risk: kubectl diff (LOW)",
    menuLabel: "kubectl diff (LOW)",
    risk: "LOW",
    command: "kubectl diff -f k8s/auth-service.yaml -n prod",
    cluster: "prod-us-east-1",
    namespace: "prod",
    diffPreview: [
      "~ probes timeout from 3s to 4s",
      "~ cpu limit from 300m to 350m"
    ],
    blastRadius: "Read-only preview. No workload mutation.",
    policyId: "CK-POL-OBS-002",
    hapticBars: 1,
    holdMs: 0,
    requiresReason: false
  }
] as const;

const RISK_CLASSES: Record<Risk, string> = {
  LOW: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  HIGH: "border-amber-500/45 bg-amber-500/15 text-amber-200",
  CRITICAL: "border-rose-500/55 bg-rose-500/20 text-rose-200"
};

const STATUS_THEME: Record<
  BrokerStatus,
  {
    title: string;
    detail: string;
    wrapperClass: string;
    dotClass: string;
  }
> = {
  idle: {
    title: "Ready for consent request",
    detail: "Broker online. No pending action.",
    wrapperClass: "border-cyan-500/35 bg-cyan-500/10 text-cyan-100",
    dotClass: "bg-cyan-300"
  },
  awaiting: {
    title: "Awaiting human consent",
    detail: "Execution paused pending physical approval.",
    wrapperClass: "border-amber-500/40 bg-amber-500/12 text-amber-100",
    dotClass: "bg-amber-300"
  },
  blocked: {
    title: "Blocked - Consent Required",
    detail: "403 returned to requesting agent.",
    wrapperClass: "border-rose-500/45 bg-rose-500/14 text-rose-100",
    dotClass: "bg-rose-300"
  },
  approved: {
    title: "Approved - Token Issued",
    detail: "Signed short-lived token returned to agent.",
    wrapperClass: "border-emerald-500/40 bg-emerald-500/14 text-emerald-100",
    dotClass: "bg-emerald-300"
  }
};

const TERMINAL_TONE_CLASSES: Record<TerminalTone, string> = {
  info: "text-slate-200",
  error: "text-rose-300",
  success: "text-emerald-300"
};

const BLAST_RADIUS_CLASSES: Record<Risk, string> = {
  LOW: "border-cyan-500/30 bg-cyan-400/10 text-cyan-100",
  HIGH: "border-amber-500/35 bg-amber-500/12 text-amber-100",
  CRITICAL: "border-rose-500/38 bg-rose-500/12 text-rose-100"
};

function buildHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const base = (hash >>> 0).toString(16).padStart(8, "0");
  return `sha256:${base}${base.slice(0, 6)}${base.slice(2, 8)}a1`;
}

function buildToken(actionHash: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ck_demo_${actionHash.slice(7, 15)}_${suffix}`;
}

function riskApproveLabel(scenario: Scenario): string {
  if (scenario.risk === "LOW") return "Approve";
  if (scenario.risk === "HIGH") return "Hold to Approve (1.2s)";
  return "Hold to Approve (1.8s)";
}

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string>(SCENARIOS[0].id);
  const [status, setStatus] = useState<BrokerStatus>("idle");
  const [operatorMode, setOperatorMode] = useState<boolean>(false);
  const [pendingLock, setPendingLock] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");
  const [actionHash, setActionHash] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [clock, setClock] = useState<string>("--:--:--");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 1,
      text: `$ ${SCENARIOS[0].command}`,
      tone: "info"
    },
    {
      id: 2,
      text: "-> Ready. Trigger consent request.",
      tone: "info"
    }
  ]);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const terminalIdRef = useRef<number>(2);
  const terminalTimersRef = useRef<number[]>([]);
  const pendingUnlockTimerRef = useRef<number | null>(null);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((scenario) => scenario.id === selectedId) ?? SCENARIOS[0],
    [selectedId]
  );

  const previewHash = useMemo(
    () => buildHash(`${selectedScenario.command}|${selectedScenario.policyId}`),
    [selectedScenario]
  );

  const shownHash = actionHash || previewHash;
  const reasonValid = reason.trim().length >= 8;
  const canTrigger = status !== "awaiting";
  const canActOnRequest = status === "awaiting" && !pendingLock;
  const statusTheme = STATUS_THEME[status];
  const statusDetail =
    status === "awaiting" && pendingLock
      ? "Broker stabilizing request context before allowing confirmation."
      : statusTheme.detail;

  function clearTerminalTimers(): void {
    terminalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    terminalTimersRef.current = [];
  }

  function clearPendingUnlockTimer(): void {
    if (pendingUnlockTimerRef.current !== null) {
      window.clearTimeout(pendingUnlockTimerRef.current);
      pendingUnlockTimerRef.current = null;
    }
  }

  function pushTerminalLine(text: string, tone: TerminalTone): void {
    terminalIdRef.current += 1;
    const nextId = terminalIdRef.current;
    setTerminalLines((current) => [...current, { id: nextId, text, tone }].slice(-8));
  }

  function queueTerminalLines(
    lines: Array<{ text: string; tone: TerminalTone; delayMs: number }>
  ): void {
    clearTerminalTimers();
    let elapsed = 0;
    lines.forEach((line) => {
      elapsed += line.delayMs;
      const timer = window.setTimeout(() => {
        pushTerminalLine(line.text, line.tone);
      }, elapsed);
      terminalTimersRef.current.push(timer);
    });
  }

  function resetTerminalForScenario(scenario: Scenario): void {
    clearTerminalTimers();
    terminalIdRef.current = 2;
    setTerminalLines([
      { id: 1, text: `$ ${scenario.command}`, tone: "info" },
      { id: 2, text: "-> Ready. Trigger consent request.", tone: "info" }
    ]);
  }

  function armPendingLock(durationMs: number): void {
    clearPendingUnlockTimer();
    setPendingLock(true);
    pendingUnlockTimerRef.current = window.setTimeout(() => {
      setPendingLock(false);
      pendingUnlockTimerRef.current = null;
    }, durationMs);
  }

  useEffect(() => {
    const tick = (): void => {
      setClock(new Date().toLocaleTimeString([], { hour12: false }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTerminalTimers();
      clearPendingUnlockTimer();
    };
  }, []);

  function stopHold(reset: boolean): void {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    holdStartRef.current = null;
    setIsHolding(false);
    if (reset && status === "awaiting") setHoldProgress(0);
  }

  function approveAction(): void {
    if (status !== "awaiting" || pendingLock) return;
    clearPendingUnlockTimer();
    setPendingLock(false);
    setStatus("approved");
    setHoldProgress(100);
    const issuedToken = buildToken(shownHash);
    setToken(issuedToken);
    queueTerminalLines([
      { text: "-> Approval captured from MX Console.", tone: "success", delayMs: 220 },
      { text: `-> Approval token received: ${issuedToken}`, tone: "success", delayMs: 320 },
      { text: "-> Executing command in approved window...", tone: "success", delayMs: 260 }
    ]);
    stopHold(false);
  }

  function handleStartHold(): void {
    if (status !== "awaiting" || pendingLock) return;

    if (selectedScenario.risk === "LOW") {
      approveAction();
      return;
    }

    if (selectedScenario.requiresReason && !reasonValid) return;

    setIsHolding(true);
    holdStartRef.current = performance.now();

    const animate = (now: number): void => {
      if (!holdStartRef.current) return;
      const elapsed = now - holdStartRef.current;
      const progress = Math.min((elapsed / selectedScenario.holdMs) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        approveAction();
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }

  function triggerRequest(): void {
    if (!canTrigger) return;
    startRequestForScenario(selectedScenario);
  }

  function startRequestForScenario(scenario: Scenario): void {
    stopHold(true);
    clearPendingUnlockTimer();
    armPendingLock(1200);
    setStatus("awaiting");
    setSelectedId(scenario.id);
    setToken("");
    setReason("");
    const requestedHash = buildHash(
      `${scenario.command}|${scenario.policyId}|${Date.now().toString()}`
    );
    setActionHash(requestedHash);
    clearTerminalTimers();
    terminalIdRef.current = 1;
    setTerminalLines([{ id: 1, text: `$ ${scenario.command}`, tone: "info" }]);
    queueTerminalLines([
      { text: "-> Requesting ConsentKey approval...", tone: "info", delayMs: 260 },
      {
        text: `-> Risk=${scenario.risk} Policy=${scenario.policyId}`,
        tone: "info",
        delayMs: 320
      },
      { text: "-> Awaiting human gesture on MX Console...", tone: "info", delayMs: 260 }
    ]);
  }

  function triggerLowRiskPass(): void {
    if (!canTrigger) return;
    const lowScenario = SCENARIOS.find((scenario) => scenario.risk === "LOW") ?? SCENARIOS[0];
    startRequestForScenario(lowScenario);
  }

  function denyRequest(): void {
    if (status !== "awaiting" || pendingLock) return;
    stopHold(true);
    clearPendingUnlockTimer();
    setPendingLock(false);
    setStatus("blocked");
    setToken("");
    queueTerminalLines([
      { text: "-> Consent denied by operator.", tone: "error", delayMs: 220 },
      { text: "-> 403 Consent Required", tone: "error", delayMs: 300 }
    ]);
  }

  function switchScenario(nextId: string): void {
    stopHold(true);
    clearPendingUnlockTimer();
    setPendingLock(false);
    const nextScenario = SCENARIOS.find((scenario) => scenario.id === nextId) ?? SCENARIOS[0];
    setSelectedId(nextScenario.id);
    setStatus("idle");
    setToken("");
    setReason("");
    setActionHash("");
    resetTerminalForScenario(nextScenario);
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-7 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">MX Creative Console</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">ConsentKey</h1>
            <p className="mt-1 text-sm text-slate-300">
              Physical human-consent gate for high-risk AI actions
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
              Incident mode: long session
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOperatorMode((current) => !current)}
            className="rounded-full border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition duration-150 hover:bg-cyan-400/20"
          >
            {operatorMode ? "Hide Operator Panel" : "Operator Mode"}
          </button>
        </header>

        <section className={`grid gap-6 ${operatorMode ? "lg:grid-cols-[390px,1fr]" : ""}`}>
          {operatorMode && (
            <aside className="rounded-3xl border border-slate-700/60 bg-panel/80 p-5 shadow-frame backdrop-blur">
              <h2 className="text-xl font-medium text-white">Operator Panel</h2>
              <p className="mt-1 text-sm text-slate-300">Queue and review consent requests.</p>

              <label className="mt-5 block text-xs uppercase tracking-[0.2em] text-slate-300" htmlFor="scenario">
                Scenario
              </label>
              <select
                id="scenario"
                className="mt-2 w-full rounded-xl border border-line bg-slate-900/60 px-3 py-3 pr-9 text-sm text-slate-100 outline-none transition duration-150 focus:border-cyan-400"
                value={selectedId}
                disabled={status === "awaiting"}
                onChange={(event) => switchScenario(event.target.value)}
              >
                {SCENARIOS.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.menuLabel}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400">{selectedScenario.label}</p>

              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition duration-150 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={triggerRequest}
                disabled={!canTrigger}
              >
                Trigger Consent Request
              </button>
              <button
                type="button"
                className="mt-2 w-full rounded-xl border border-emerald-500/45 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition duration-150 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={triggerLowRiskPass}
                disabled={!canTrigger}
              >
                Quick LOW Pass (Single Tap)
              </button>

              <div className={`mt-5 rounded-2xl border p-4 ${statusTheme.wrapperClass}`}>
                <p className="text-xs uppercase tracking-[0.17em] text-slate-200/80">Broker State</p>
                <p className="mt-2 text-lg font-semibold">{statusTheme.title}</p>
                <p className="mt-1 text-sm">{statusDetail}</p>

                {token && (
                  <>
                    <p className="mt-4 text-xs uppercase tracking-[0.17em] text-slate-100/80">Issued token</p>
                    <code className="mono mt-2 block rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                      {token}
                    </code>
                  </>
                )}
              </div>
            </aside>
          )}

          <div className="rounded-3xl border border-slate-700/60 bg-slate-900/35 p-5 shadow-frame backdrop-blur">
            <div className="mt-3 rounded-[2rem] border border-slate-600/70 bg-gradient-to-br from-slate-900 to-slate-950 p-3 shadow-frame">
              <div className="rounded-[1.65rem] border border-slate-700/80 bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">ConsentKey</h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">MX Console</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "awaiting" && (
                      <span className="flex items-center gap-2 rounded-full border border-amber-400/45 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-80" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
                        </span>
                        Pending
                      </span>
                    )}
                    <span className="mono rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200">
                      {clock}
                    </span>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-xl border px-4 py-3 transition-all duration-150 ${statusTheme.wrapperClass}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusTheme.dotClass} ${status === "awaiting" ? "animate-pulse" : ""}`}
                    />
                    <span>{statusTheme.title}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-90">{statusDetail}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-line bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-300">
                      Requested by: <span className="font-medium text-white">Cursor Agent (local)</span>
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${RISK_CLASSES[selectedScenario.risk]}`}
                    >
                      {selectedScenario.risk}
                    </span>
                  </div>

                  <div className="mono mt-3 rounded-xl border border-slate-600/80 bg-slate-900 px-3 py-3 text-[13px] text-slate-100 sm:text-sm">
                    {selectedScenario.command}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                      Cluster: {selectedScenario.cluster}
                    </span>
                    <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                      Namespace: {selectedScenario.namespace}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Haptic indicator</p>
                    <div className="mt-3 flex items-end gap-2">
                      {[1, 2, 3].map((bar) => {
                        const active = bar <= selectedScenario.hapticBars;
                        const pendingPulse = status === "awaiting" && active;
                        return (
                          <span
                            key={bar}
                            className={[
                              "h-8 w-6 rounded-md border",
                              bar === 2 ? "h-10" : "",
                              bar === 3 ? "h-12" : "",
                              active
                                ? selectedScenario.risk === "CRITICAL"
                                  ? "border-rose-400/80 bg-rose-500/35"
                                  : selectedScenario.risk === "HIGH"
                                    ? "border-amber-400/80 bg-amber-500/30"
                                    : "border-emerald-400/80 bg-emerald-500/30"
                                : "border-slate-700 bg-slate-800/30",
                              pendingPulse ? "animate-inhale" : ""
                            ].join(" ")}
                            style={{ animationDelay: `${bar * 85}ms` }}
                          />
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {selectedScenario.risk === "LOW" && "Gentle tap pattern"}
                      {selectedScenario.risk === "HIGH" && "Strong dual pulse"}
                      {selectedScenario.risk === "CRITICAL" && "Danger triple pulse"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Diff preview</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-200">
                      {selectedScenario.diffPreview.map((line) => (
                        <li key={line} className="mono rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p
                    className={`mt-4 rounded-lg border px-3 py-2 text-sm font-medium ${BLAST_RADIUS_CLASSES[selectedScenario.risk]}`}
                  >
                    <span className="mr-2 inline-block rounded border border-current/35 px-1 text-[11px] font-bold">
                      !
                    </span>
                    Blast radius: {selectedScenario.blastRadius}
                  </p>

                  <p className="mono mt-4 text-[11px] text-slate-400">
                    Policy: {selectedScenario.policyId} | Action hash: {shownHash}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-line bg-slate-900/55 p-4">
                  {status === "awaiting" && (
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                        </span>
                        Awaiting Human Confirmation
                      </p>
                      <span className="mono text-[11px] text-amber-100/90">
                        {pendingLock
                          ? "Stabilizing..."
                          : selectedScenario.risk === "LOW"
                            ? "Single tap"
                            : "Press + hold"}
                      </span>
                    </div>
                  )}

                  {selectedScenario.risk === "CRITICAL" && (
                    <div className="mb-3">
                      <label
                        htmlFor="reason"
                        className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-300"
                      >
                        Reason (required for critical approval)
                      </label>
                      <input
                        id="reason"
                        value={reason}
                        maxLength={120}
                        disabled={status !== "awaiting"}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="e.g. incident bridge approved rollback sequence"
                        className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 disabled:opacity-70"
                      />
                      <p className="mt-1 text-xs text-slate-400">Minimum 8 characters.</p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={denyRequest}
                      disabled={!canActOnRequest}
                      className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Deny
                    </button>

                    <button
                      type="button"
                      onMouseDown={handleStartHold}
                      onMouseUp={() => stopHold(true)}
                      onMouseLeave={() => stopHold(true)}
                      onTouchStart={handleStartHold}
                      onTouchEnd={() => stopHold(true)}
                      onTouchCancel={() => stopHold(true)}
                      disabled={
                        !canActOnRequest ||
                        (selectedScenario.requiresReason && !reasonValid)
                      }
                      className="relative overflow-hidden rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition duration-150 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {(selectedScenario.risk === "HIGH" || selectedScenario.risk === "CRITICAL") && (
                        <span
                          className="absolute inset-y-0 left-0 bg-emerald-400/35 transition-all"
                          style={{ width: `${holdProgress}%` }}
                        />
                      )}
                      <span className="relative z-10">{riskApproveLabel(selectedScenario)}</span>
                    </button>
                  </div>

                  {(selectedScenario.risk === "HIGH" || selectedScenario.risk === "CRITICAL") &&
                    status === "awaiting" && (
                      <p className="mono mt-3 text-xs text-slate-300">
                        {pendingLock
                          ? "Preparing consent packet..."
                          : isHolding
                            ? `Hold progress ${Math.floor(holdProgress)}%`
                            : "Press and hold to approve"}
                      </p>
                    )}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Agent Terminal</p>
                    <span className="mono text-[11px] text-slate-500">local adapter stream</span>
                  </div>
                  <div className="mono mt-2 rounded-xl border border-slate-700 bg-[#080d1c] px-3 py-3 text-[12px] sm:text-[13px]">
                    {terminalLines.map((line) => (
                      <p key={line.id} className={`leading-6 ${TERMINAL_TONE_CLASSES[line.tone]}`}>
                        {line.text}
                      </p>
                    ))}
                    <p className="mt-1 flex items-center gap-1 text-slate-400">
                      <span>$</span>
                      <span className="inline-block h-3.5 w-2 animate-pulse rounded-[1px] bg-slate-400/80" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
