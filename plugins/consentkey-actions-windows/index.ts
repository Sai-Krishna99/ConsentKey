import { PluginSDK } from "@logitech/plugin-sdk";

import { ApprovePendingConsentAction } from "./src/actions/approve-pending-consent";
import { DenyPendingConsentAction } from "./src/actions/deny-pending-consent";
import { RequestCriticalConsentAction } from "./src/actions/request-critical-consent";
import { RequestHighRiskConsentAction } from "./src/actions/request-high-risk-consent";
import { ConsentBrokerClient } from "./src/broker-client";

const pluginSDK = new PluginSDK();
const broker = new ConsentBrokerClient();

pluginSDK.registerAction(new RequestHighRiskConsentAction(broker));
pluginSDK.registerAction(new RequestCriticalConsentAction(broker));
pluginSDK.registerAction(new ApprovePendingConsentAction(broker));
pluginSDK.registerAction(new DenyPendingConsentAction(broker));

await pluginSDK.connect();
