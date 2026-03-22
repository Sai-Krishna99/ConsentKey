import { NextRequest, NextResponse } from "next/server";

import { ConsentBrokerError, approveConsentRequest } from "@/lib/consent-broker";
import type { ConsentSurface } from "@/lib/consent-model";

type RequestBody = {
  requestId?: string;
  reason?: string;
  surface?: ConsentSurface;
};

export async function POST(request: NextRequest) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.requestId) {
    return NextResponse.json({ error: "requestId is required." }, { status: 400 });
  }

  try {
    const snapshot = approveConsentRequest({
      requestId: body.requestId,
      reason: body.reason,
      surface: body.surface
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof ConsentBrokerError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unable to approve consent request." }, { status: 500 });
  }
}
