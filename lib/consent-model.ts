export type Risk = "LOW" | "HIGH" | "CRITICAL";

export type BrokerStatus = "idle" | "awaiting" | "blocked" | "approved";

export type Scenario = {
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

export type ConsentSurface = "mx-creative-console" | "actions-ring" | "api";

export type ConsentRequest = {
  requestId: string;
  scenarioId: string;
  command: string;
  risk: Risk;
  cluster: string;
  namespace: string;
  diffPreview: string[];
  blastRadius: string;
  policyId: string;
  hapticBars: 1 | 2 | 3;
  holdMs: number;
  requiresReason: boolean;
  actionHash: string;
  requestedBy: string;
  source: string;
  requestedAt: string;
};

export type ConsentDecision = {
  requestId: string;
  status: "approved" | "blocked";
  decidedAt: string;
  surface: ConsentSurface;
  reason: string | null;
  token: string | null;
};

export type BrokerSnapshot = {
  status: BrokerStatus;
  activeRequest: ConsentRequest | null;
  lastDecision: ConsentDecision | null;
  updatedAt: string;
};

export const DEMO_SCENARIOS: readonly Scenario[] = [
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

export function buildHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const base = (hash >>> 0).toString(16).padStart(8, "0");
  return `sha256:${base}${base.slice(0, 6)}${base.slice(2, 8)}a1`;
}

export function buildToken(actionHash: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ck_demo_${actionHash.slice(7, 15)}_${suffix}`;
}

export function createRequestId(): string {
  return `ckr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function findScenarioById(scenarioId: string): Scenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === scenarioId);
}
