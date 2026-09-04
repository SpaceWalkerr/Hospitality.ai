import { NextResponse } from "next/server";
import { MODEL, isDemoMode } from "@/lib/services/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the client whether it is talking to a live model, and which one. */
export async function GET() {
  const demo = isDemoMode();
  return NextResponse.json({ demo, model: demo ? null : MODEL });
}
