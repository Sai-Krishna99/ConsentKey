import { CommandAction } from "@loupedeck/plugin-sdk";

import { ConsentBrokerClient } from "../broker-client";

export class ApprovePendingConsentAction extends CommandAction {
  readonly name = "consentkey-approve-pending";

  displayName = "Approve Pending Consent";

  description = "Approve the currently active ConsentKey request.";

  constructor(private readonly broker: ConsentBrokerClient) {
    super();
  }

  async onKeyDown() {
    const state = await this.broker.getState();
    const requestId = state.activeRequest?.requestId;

    if (!requestId) {
      console.log("[ConsentKey] No active request to approve.");
      return;
    }

    const snapshot = await this.broker.approvePending(requestId, "actions-ring");
    console.log(
      `[ConsentKey] Approved ${requestId}. Token=${snapshot.lastDecision?.token ?? "missing"}`
    );
  }
}
