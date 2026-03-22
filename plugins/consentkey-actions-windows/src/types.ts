export type ConsentSurface = "mx-creative-console" | "actions-ring" | "api";

export type BrokerStatus = "idle" | "awaiting" | "blocked" | "approved";

export type BrokerSnapshot = {
  status: BrokerStatus;
  activeRequest: {
    requestId: string;
    scenarioId: string;
    command: string;
    risk: "LOW" | "HIGH" | "CRITICAL";
    actionHash: string;
    requestedAt: string;
  } | null;
  lastDecision: {
    requestId: string;
    status: "approved" | "blocked";
    decidedAt: string;
    token: string | null;
  } | null;
  updatedAt: string;
};
