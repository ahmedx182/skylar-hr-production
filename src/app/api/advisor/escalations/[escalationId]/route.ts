import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { errorResponse } from "@/server/http/error-response";
import {
  getCompanyAdvisorEscalation,
  updateAdvisorEscalation,
} from "@/server/repositories/advisor-escalation.repository";

export const dynamic = "force-dynamic";

const mutationSchema = z.object({
  action: z.enum(["save_draft", "mark_responded", "resolve"]),
  responseText: z.string().trim().max(4000).optional(),
});

type RouteContext = {
  params: { escalationId: string };
};

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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const payload = mutationSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) throw new ValidationError("Choose a valid advisor case action.");

    const escalation = await updateAdvisorEscalation(session, params.escalationId, payload.data);

    return NextResponse.json({ escalation });
  } catch (error) {
    return errorResponse(error, "PATCH /api/advisor/escalations/[escalationId]");
  }
}
