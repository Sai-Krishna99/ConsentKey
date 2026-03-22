import { NextRequest, NextResponse } from "next/server";

import { ConsentBrokerError, createConsentRequest } from "@/lib/consent-broker";

type RequestBody = {
  scenarioId?: string;
  requestedBy?: string;
  source?: string;
};

export async function POST(request: NextRequest) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.scenarioId) {
    return NextResponse.json({ error: "scenarioId is required." }, { status: 400 });
  }

  try {
    const snapshot = createConsentRequest({
      scenarioId: body.scenarioId,
      requestedBy: body.requestedBy,
      source: body.source
    });
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    if (error instanceof ConsentBrokerError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unable to create consent request." }, { status: 500 });
  }
}
