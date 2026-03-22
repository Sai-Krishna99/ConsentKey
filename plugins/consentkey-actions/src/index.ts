import { PluginSDK } from "@loupedeck/plugin-sdk";

import { ApprovePendingConsentAction } from "./actions/approve-pending-consent";
import { DenyPendingConsentAction } from "./actions/deny-pending-consent";
import { RequestCriticalConsentAction } from "./actions/request-critical-consent";
import { RequestHighRiskConsentAction } from "./actions/request-high-risk-consent";
import { ConsentBrokerClient } from "./broker-client";

const sdk = new PluginSDK();
const broker = new ConsentBrokerClient();

sdk.registerAction(new RequestHighRiskConsentAction(broker));
sdk.registerAction(new RequestCriticalConsentAction(broker));
sdk.registerAction(new ApprovePendingConsentAction(broker));
sdk.registerAction(new DenyPendingConsentAction(broker));

sdk.connect();
