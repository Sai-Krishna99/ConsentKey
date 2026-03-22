import type { BrokerSnapshot, ConsentSurface } from "./types";

type RequestPayload = {
  scenarioId: string;
  requestedBy: string;
  source: string;
};

type DecisionPayload = {
  requestId: string;
  surface: ConsentSurface;
  reason?: string;
};

export class ConsentBrokerClient {
  constructor(
    private readonly baseUrl = process.env.CONSENTKEY_BROKER_URL ?? "http://127.0.0.1:3000"
  ) {}

  async getState(): Promise<BrokerSnapshot> {
    return this.request<BrokerSnapshot>("/api/consent/state", { method: "GET" });
  }

  async requestScenario(scenarioId: string, source: string): Promise<BrokerSnapshot> {
    const payload: RequestPayload = {
      scenarioId,
      requestedBy: "consentkey-actions-plugin",
      source
    };

    return this.request<BrokerSnapshot>("/api/consent/request", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async approvePending(requestId: string, surface: ConsentSurface): Promise<BrokerSnapshot> {
    const payload: DecisionPayload = { requestId, surface };
    return this.request<BrokerSnapshot>("/api/consent/approve", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async denyPending(
    requestId: string,
    surface: ConsentSurface,
    reason?: string
  ): Promise<BrokerSnapshot> {
    const payload: DecisionPayload = { requestId, surface, reason };
    return this.request<BrokerSnapshot>("/api/consent/deny", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {})
      }
    });

    const body = (await response.json()) as T | { error?: string };

    if (!response.ok) {
      const errorMessage =
        typeof body === "object" && body && "error" in body && typeof body.error === "string"
          ? body.error
          : `Broker request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return body as T;
  }
}
