import { NextResponse } from "next/server";
import { requireAdvisor } from "@/server/auth/advisor-access";
import { errorResponse } from "@/server/http/error-response";
import { listLiveCases } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";

/** The Skylar advisor queue across every workspace. */
export async function GET() {
  try {
    await requireAdvisor();
    return NextResponse.json({ cases: await listLiveCases() });
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/live");
  }
}
