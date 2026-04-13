#!/usr/bin/env node
// consent-run: agent-side wrapper that submits a proposed action to the local
// ConsentKey broker and blocks until a human approves or denies on hardware.
// Exits 0 when approved (and runs the stubbed execution), exits 1 when denied.

import { setTimeout as sleep } from "node:timers/promises";
import process from "node:process";
import http from "node:http";

const DEFAULT_BROKER_URL = process.env.CONSENTKEY_BROKER_URL ?? "http://127.0.0.1:3000";
const DEFAULT_TIMEOUT_SECONDS = 120;
const POLL_INTERVAL_MS = 400;

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  grey: "\x1b[90m"
};

const RISK_COLOR = {
  LOW: ANSI.green,
  HIGH: ANSI.yellow,
  CRITICAL: ANSI.red
};

const STUB_EXECUTIONS = {
  "restart-auth-high": [
    { delayMs: 180, line: "→ kubectl rollout restart deploy/auth-service -n prod" },
    { delayMs: 420, line: "  deployment.apps/auth-service restarted" }
  ],
  "rotate-restart-critical": [
    { delayMs: 160, line: "→ kubectl apply -f secret-rotation.yaml" },
    { delayMs: 380, line: "  secret/auth-service-api-key configured" },
    { delayMs: 300, line: "→ kubectl rollout restart deploy/auth-service -n prod" },
    { delayMs: 400, line: "  deployment.apps/auth-service restarted" }
  ],
  "kubectl-diff-low": [
    { delayMs: 140, line: "→ kubectl diff -f k8s/auth-service.yaml -n prod" },
    { delayMs: 260, line: "  ~ readinessProbe.timeoutSeconds: 3 → 4" },
    { delayMs: 200, line: "  ~ resources.limits.cpu:            300m → 350m" }
  ]
};

function print(line = "") {
  process.stdout.write(line + "\n");
}

function info(line) {
  print(`${ANSI.grey}[consent-run]${ANSI.reset} ${line}`);
}

function ok(line) {
  print(`${ANSI.grey}[consent-run]${ANSI.reset} ${ANSI.green}✓${ANSI.reset} ${line}`);
}

function warn(line) {
  print(`${ANSI.grey}[consent-run]${ANSI.reset} ${ANSI.yellow}⚠${ANSI.reset} ${line}`);
}

function fail(line) {
  print(`${ANSI.grey}[consent-run]${ANSI.reset} ${ANSI.red}✗${ANSI.reset} ${line}`);
}

function parseArgs(argv) {
  const out = {
    brokerUrl: DEFAULT_BROKER_URL,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    help: false,
    list: false,
    rest: []
  };

  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token === "-h" || token === "--help") {
      out.help = true;
      i += 1;
    } else if (token === "--list") {
      out.list = true;
      i += 1;
    } else if (token === "--broker") {
      out.brokerUrl = argv[i + 1];
      i += 2;
    } else if (token === "--timeout") {
      out.timeoutSeconds = Number(argv[i + 1]);
      i += 2;
    } else {
      out.rest.push(token);
      i += 1;
    }
  }

  return out;
}

function printHelp() {
  print(`${ANSI.bold}consent-run${ANSI.reset} — agent-side wrapper for the ConsentKey consent broker

Usage:
  consent-run <command...>            submit the command for consent, then run on approval
  consent-run --scenario <id>         (same, but pick a scenario by id — see --list)
  consent-run --list                  list the scenarios the broker recognises
  consent-run --help                  print this help

Options:
  --broker <url>     Override broker URL (default: env CONSENTKEY_BROKER_URL or http://127.0.0.1:3000)
  --timeout <sec>    How long to wait for a human decision (default: ${DEFAULT_TIMEOUT_SECONDS}s)

Exit codes:
  0  — approved and executed
  1  — denied by human (403 Consent Required)
  2  — usage error, broker unreachable, or timeout

Notes:
  The "executed command" output is a local stub — no real cluster is touched.
  The command string is used to match a scenario; the scenario's metadata
  (risk, blast radius, policy id) is what the broker evaluates and what the
  human sees on the MX Creative Console + Actions Ring consent card.
`);
}

// Use node:http directly. Node's global fetch (undici) exhibits a heavy
// response-staleness bug when mixing POST and GET on the same keep-alive
// connection against Next.js dev mode — a GET poll will keep returning the
// pre-POST state for ~50s before it sees the real update. Using http with a
// fresh agent per request avoids that entirely.
function httpJson(url, { method = "GET", body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? Buffer.from(body, "utf8") : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        agent: new http.Agent({ keepAlive: false }),
        headers: {
          accept: "application/json",
          ...(payload ? { "content-type": "application/json", "content-length": payload.length } : {}),
          connection: "close",
          ...headers
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            // leave parsed as null
          }
          if (res.statusCode && res.statusCode >= 400) {
            const message =
              parsed && typeof parsed.error === "string" ? parsed.error : `HTTP ${res.statusCode}`;
            const err = new Error(message);
            err.statusCode = res.statusCode;
            reject(err);
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", (err) => reject(new Error(`broker unreachable at ${url} — ${err.message}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchJson(url, init = {}) {
  return httpJson(url, init);
}

async function listScenarios(brokerUrl) {
  const { scenarios } = await fetchJson(`${brokerUrl}/api/consent/scenarios`, { method: "GET" });
  info(`${scenarios.length} scenarios known to the broker:`);
  for (const s of scenarios) {
    const riskTag = `${RISK_COLOR[s.risk] ?? ""}${s.risk.padEnd(8)}${ANSI.reset}`;
    print(`  ${riskTag} ${ANSI.bold}${s.id}${ANSI.reset}`);
    print(`           ${ANSI.dim}${s.command}${ANSI.reset}`);
  }
}

function findScenarioMatch(scenarios, rest) {
  const scenarioFlagIdx = rest.indexOf("--scenario");
  if (scenarioFlagIdx !== -1) {
    const id = rest[scenarioFlagIdx + 1];
    const byId = scenarios.find((s) => s.id === id);
    if (!byId) {
      throw new Error(`no scenario with id "${id}" — try --list`);
    }
    return byId;
  }

  const joined = rest.join(" ").trim();
  if (!joined) {
    throw new Error("no command specified — try --help");
  }

  const byCommand = scenarios.find((s) => s.command === joined);
  if (byCommand) return byCommand;

  const byId = scenarios.find((s) => s.id === joined);
  if (byId) return byId;

  throw new Error(
    `command did not match any known scenario — try --list for the ones the broker recognises.`
  );
}

function renderConsentCard(scenario) {
  const riskColor = RISK_COLOR[scenario.risk] ?? "";
  print("");
  print(`${ANSI.bold}proposed action${ANSI.reset}`);
  print(`  ${ANSI.dim}command  ${ANSI.reset} ${scenario.command}`);
  print(`  ${ANSI.dim}risk     ${ANSI.reset} ${riskColor}${scenario.risk}${ANSI.reset}`);
  print(`  ${ANSI.dim}policy   ${ANSI.reset} ${scenario.policyId}`);
  print(`  ${ANSI.dim}cluster  ${ANSI.reset} ${scenario.cluster} / ${scenario.namespace}`);
  print(`  ${ANSI.dim}blast    ${ANSI.reset} ${scenario.blastRadius}`);
  print("");
}

async function submitConsentRequest(brokerUrl, scenarioId) {
  return fetchJson(`${brokerUrl}/api/consent/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      scenarioId,
      requestedBy: `consent-run-cli@${process.env.USERNAME ?? "local"}`,
      source: "cli"
    })
  });
}

async function pollForDecision(brokerUrl, requestId, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let pollCount = 0;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    pollCount += 1;
    const snap = await fetchJson(`${brokerUrl}/api/consent/state`, { method: "GET" });
    if (process.env.CONSENTKEY_DEBUG === "1") {
      info(`poll#${pollCount} status=${snap.status} lastDecision.reqId=${snap.lastDecision?.requestId ?? "null"} activeReq.reqId=${snap.activeRequest?.requestId ?? "null"} (waiting on ${requestId})`);
    }
    if (snap.status === "approved" && snap.lastDecision?.requestId === requestId) {
      return { decision: "approved", snapshot: snap };
    }
    if (snap.status === "blocked" && snap.lastDecision?.requestId === requestId) {
      return { decision: "blocked", snapshot: snap };
    }
  }
  throw new Error(`timed out waiting for decision after ${timeoutSeconds}s`);
}

async function runStubExecution(scenarioId) {
  const steps = STUB_EXECUTIONS[scenarioId] ?? [
    { delayMs: 200, line: `→ (stub) running command for scenario ${scenarioId}` }
  ];
  print("");
  for (const step of steps) {
    await sleep(step.delayMs);
    print(step.line);
  }
  print("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return 0;
  }

  if (args.list) {
    try {
      await listScenarios(args.brokerUrl);
      return 0;
    } catch (error) {
      fail(error.message);
      return 2;
    }
  }

  let scenarios;
  try {
    const payload = await fetchJson(`${args.brokerUrl}/api/consent/scenarios`, { method: "GET" });
    scenarios = payload.scenarios;
  } catch (error) {
    fail(error.message);
    info(`is the ConsentKey broker running at ${args.brokerUrl}? start it with ${ANSI.bold}npm run dev${ANSI.reset}`);
    return 2;
  }

  let scenario;
  try {
    scenario = findScenarioMatch(scenarios, args.rest);
  } catch (error) {
    fail(error.message);
    return 2;
  }

  renderConsentCard(scenario);

  info(`requesting consent via ${args.brokerUrl}...`);
  let submitted;
  try {
    submitted = await submitConsentRequest(args.brokerUrl, scenario.id);
  } catch (error) {
    if (error.statusCode === 409) {
      warn("broker already has an awaiting request — resolve it on the Console first.");
      return 2;
    }
    fail(error.message);
    return 2;
  }

  const { requestId, actionHash } = submitted.activeRequest;
  ok(`request accepted  ${ANSI.dim}id=${requestId}  hash=${actionHash}${ANSI.reset}`);
  info(`${ANSI.yellow}⏸${ANSI.reset}  awaiting human approval on ${ANSI.bold}MX Creative Console${ANSI.reset} + Actions Ring...`);

  let result;
  try {
    result = await pollForDecision(args.brokerUrl, requestId, args.timeoutSeconds);
  } catch (error) {
    fail(error.message);
    return 2;
  }

  const decision = result.snapshot.lastDecision;

  if (result.decision === "blocked") {
    const reason = decision.reason ?? "no reason provided";
    fail(`denied  ${ANSI.dim}surface=${decision.surface}  reason="${reason}"${ANSI.reset}`);
    print("");
    print(`${ANSI.red}${ANSI.bold}ERROR${ANSI.reset}${ANSI.red}: 403 Consent Required — action blocked.${ANSI.reset}`);
    print("");
    return 1;
  }

  ok(`approved  ${ANSI.dim}surface=${decision.surface}${ANSI.reset}`);
  info(`token: ${ANSI.green}${decision.token}${ANSI.reset}  ${ANSI.dim}(short-lived, bound to action hash ${actionHash})${ANSI.reset}`);
  info(`executing under approved token window...`);

  const startedAt = Date.now();
  await runStubExecution(scenario.id);
  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(2);
  ok(`completed under approval  ${ANSI.dim}duration=${durationSec}s${ANSI.reset}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    fail(`unexpected error: ${error.stack ?? error.message}`);
    process.exit(2);
  });
