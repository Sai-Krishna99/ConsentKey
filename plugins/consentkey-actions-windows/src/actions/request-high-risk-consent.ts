import { CommandAction } from "@logitech/plugin-sdk";

import { ConsentBrokerClient } from "../broker-client";

export class RequestHighRiskConsentAction extends CommandAction {
  readonly name = "consentkey-request-high-risk";

  displayName = "Request HIGH Consent";

  description = "Create a pending HIGH-risk ConsentKey request from MX Creative Console.";

  constructor(private readonly broker: ConsentBrokerClient) {
    super();
  }

  async onKeyDown() {
    const snapshot = await this.broker.requestScenario("restart-auth-high", "mx-creative-console");
    console.log(
      `[ConsentKey] Created request ${snapshot.activeRequest?.requestId ?? "unknown"} for HIGH scenario.`
    );
  }
}
