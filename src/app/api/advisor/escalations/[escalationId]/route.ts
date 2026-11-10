import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { errorResponse } from "@/server/http/error-response";
import { getCompanyAdvisorEscalation } from "@/server/repositories/advisor-escalation.repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { escalationId: string };
};

/** Customer admins can follow a case. Skylar's HR advisors answer it, from the advisor desk. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const escalation = await getCompanyAdvisorEscalation(session.companyId, params.escalationId);

    return NextResponse.json({ escalation });
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/escalations/[escalationId]");
  }
}
