import { NextResponse } from "next/server";

import { getBrokerSnapshot } from "@/lib/consent-broker";

export function GET() {
  return NextResponse.json(getBrokerSnapshot());
}
