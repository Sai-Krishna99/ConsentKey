import { CommandAction } from "@logitech/plugin-sdk";

import { ConsentBrokerClient } from "../broker-client";

export class DenyPendingConsentAction extends CommandAction {
  readonly name = "consentkey-deny-pending";

  displayName = "Deny Pending Consent";

  description = "Deny the currently active ConsentKey request.";

  constructor(private readonly broker: ConsentBrokerClient) {
    super();
  }

  async onKeyDown() {
    const state = await this.broker.getState();
    const requestId = state.activeRequest?.requestId;

    if (!requestId) {
      console.log("[ConsentKey] No active request to deny.");
      return;
    }

    await this.broker.denyPending(requestId, "mx-creative-console", "Denied from MX Creative Console");
    console.log(`[ConsentKey] Denied ${requestId}.`);
  }
}
