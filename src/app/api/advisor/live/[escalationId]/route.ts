import { NextResponse } from "next/server";
import { z } from "zod";
import { LIVE_MESSAGE_MAX_LENGTH } from "@/features/advisor/live-chat";
import { requireAdvisor } from "@/server/auth/advisor-access";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { applyAdvisorLiveAction, getLiveCaseForAdvisor } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["claim", "take_over", "release", "reply", "resolve", "resolve_false_alarm", "close_unclaimed"]),
  text: z.string().max(LIVE_MESSAGE_MAX_LENGTH).optional(),
});

type RouteContext = { params: { escalationId: string } };

/** An advisor reading a case. The read is audited on the server, once per advisor and case in a while. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const advisor = await requireAdvisor();
    return NextResponse.json(await getLiveCaseForAdvisor(params.escalationId, advisor));
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/live/[escalationId]");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const advisor = await requireAdvisor();
    const input = await parseJsonBody(request, actionSchema);
    await applyAdvisorLiveAction(advisor, params.escalationId, input.action, input.text);
    return NextResponse.json(await getLiveCaseForAdvisor(params.escalationId, advisor, { audit: false }));
  } catch (error) {
    return errorResponse(error, "POST /api/advisor/live/[escalationId]");
  }
}
