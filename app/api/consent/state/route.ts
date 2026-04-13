import { NextResponse } from "next/server";

import { getBrokerSnapshot } from "@/lib/consent-broker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(getBrokerSnapshot(), {
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache"
    }
  });
}
