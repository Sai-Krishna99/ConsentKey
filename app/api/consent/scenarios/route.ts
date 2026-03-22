import { NextResponse } from "next/server";

import { DEMO_SCENARIOS } from "@/lib/consent-model";

export function GET() {
  return NextResponse.json({ scenarios: DEMO_SCENARIOS });
}
