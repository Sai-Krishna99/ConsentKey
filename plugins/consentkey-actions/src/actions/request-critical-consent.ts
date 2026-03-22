import { CommandAction } from "@loupedeck/plugin-sdk";

import { ConsentBrokerClient } from "../broker-client";

export class RequestCriticalConsentAction extends CommandAction {
  readonly name = "consentkey-request-critical";

  displayName = "Request CRITICAL Consent";

  description = "Create a pending CRITICAL ConsentKey request from MX Creative Console.";

  constructor(private readonly broker: ConsentBrokerClient) {
    super();
  }

  async onKeyDown() {
    const snapshot = await this.broker.requestScenario("rotate-restart-critical", "mx-creative-console");
    console.log(
      `[ConsentKey] Created request ${snapshot.activeRequest?.requestId ?? "unknown"} for CRITICAL scenario.`
    );
  }
}
