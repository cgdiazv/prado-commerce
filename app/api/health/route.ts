import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "prado-core-edge-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
