import {
  buildHash,
  buildToken,
  createRequestId,
  findScenarioById,
  type BrokerSnapshot,
  type ConsentDecision,
  type ConsentRequest,
  type ConsentSurface
} from "./consent-model";

type BrokerStore = {
  activeRequest: ConsentRequest | null;
  lastDecision: ConsentDecision | null;
  updatedAt: string;
};

declare global {
  var __consentKeyBrokerStore: BrokerStore | undefined;
}

function createStore(): BrokerStore {
  return {
    activeRequest: null,
    lastDecision: null,
    updatedAt: new Date().toISOString()
  };
}

function getStore(): BrokerStore {
  if (!globalThis.__consentKeyBrokerStore) {
    globalThis.__consentKeyBrokerStore = createStore();
  }
  return globalThis.__consentKeyBrokerStore;
}

function currentStatus(store: BrokerStore): BrokerSnapshot["status"] {
  if (store.activeRequest) return "awaiting";
  return store.lastDecision?.status ?? "idle";
}

function snapshotFrom(store: BrokerStore): BrokerSnapshot {
  return {
    status: currentStatus(store),
    activeRequest: store.activeRequest,
    lastDecision: store.lastDecision,
    updatedAt: store.updatedAt
  };
}

export class ConsentBrokerError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ConsentBrokerError";
    this.statusCode = statusCode;
  }
}

export function getBrokerSnapshot(): BrokerSnapshot {
  return snapshotFrom(getStore());
}

export function createConsentRequest(input: {
  scenarioId: string;
  requestedBy?: string;
  source?: string;
}): BrokerSnapshot {
  const scenario = findScenarioById(input.scenarioId);
  if (!scenario) {
    throw new ConsentBrokerError(404, `Unknown scenario: ${input.scenarioId}`);
  }

  const store = getStore();
  if (store.activeRequest) {
    throw new ConsentBrokerError(409, "A consent request is already awaiting a decision.");
  }

  const requestedAt = new Date().toISOString();
  const actionHash = buildHash(`${scenario.command}|${scenario.policyId}|${requestedAt}`);

  store.activeRequest = {
    requestId: createRequestId(),
    scenarioId: scenario.id,
    command: scenario.command,
    risk: scenario.risk,
    cluster: scenario.cluster,
    namespace: scenario.namespace,
    diffPreview: scenario.diffPreview,
    blastRadius: scenario.blastRadius,
    policyId: scenario.policyId,
    hapticBars: scenario.hapticBars,
    holdMs: scenario.holdMs,
    requiresReason: scenario.requiresReason,
    actionHash,
    requestedBy: input.requestedBy ?? "unknown-client",
    source: input.source ?? "api",
    requestedAt
  };
  store.lastDecision = null;
  store.updatedAt = requestedAt;

  return snapshotFrom(store);
}

function decideActiveRequest(input: {
  requestId: string;
  outcome: "approved" | "blocked";
  surface?: ConsentSurface;
  reason?: string;
}): BrokerSnapshot {
  const store = getStore();
  const request = store.activeRequest;

  if (!request) {
    throw new ConsentBrokerError(409, "There is no active consent request.");
  }

  if (request.requestId !== input.requestId) {
    throw new ConsentBrokerError(409, "Active request does not match supplied requestId.");
  }

  const decidedAt = new Date().toISOString();

  store.lastDecision = {
    requestId: request.requestId,
    status: input.outcome,
    decidedAt,
    surface: input.surface ?? "api",
    reason: input.reason?.trim() || null,
    token: input.outcome === "approved" ? buildToken(request.actionHash) : null
  };
  store.activeRequest = null;
  store.updatedAt = decidedAt;

  return snapshotFrom(store);
}

export function approveConsentRequest(input: {
  requestId: string;
  surface?: ConsentSurface;
  reason?: string;
}): BrokerSnapshot {
  return decideActiveRequest({
    requestId: input.requestId,
    outcome: "approved",
    surface: input.surface,
    reason: input.reason
  });
}

export function denyConsentRequest(input: {
  requestId: string;
  surface?: ConsentSurface;
  reason?: string;
}): BrokerSnapshot {
  return decideActiveRequest({
    requestId: input.requestId,
    outcome: "blocked",
    surface: input.surface,
    reason: input.reason
  });
}
