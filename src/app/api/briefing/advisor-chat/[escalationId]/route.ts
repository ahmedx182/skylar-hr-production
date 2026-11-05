import { NextResponse } from "next/server";
import { z } from "zod";
import { LIVE_MESSAGE_MAX_LENGTH } from "@/features/advisor/live-chat";
import { getServerEnv } from "@/lib/env/server";
import { ConflictError } from "@/lib/errors";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { releaseAdvisorMessage, reserveAdvisorMessage } from "@/server/repositories/billing.repository";
import {
  applyLivePause as paused,
  getUserLiveCase,
  reopenUserLiveCase,
  sendUserLiveMessage,
} from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), text: z.string().max(LIVE_MESSAGE_MAX_LENGTH) }),
  z.object({ action: z.literal("reopen") }),
]);

type RouteContext = { params: { escalationId: string } };

/** Polled by the chat window while a live advisor case is open. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    return NextResponse.json({ chat: paused(await getUserLiveCase(session, params.escalationId)) });
  } catch (error) {
    return errorResponse(error, "GET /api/briefing/advisor-chat/[escalationId]");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const input = await parseJsonBody(request, actionSchema);
    if (!getServerEnv().LIVE_ADVISOR_ENABLED) throw new ConflictError("Live advisor chat is paused right now.");
    if (input.action === "send") {
      // A message to a human advisor counts against the free-message limit, like one to the assistant (402 when used up).
      const env = getServerEnv();
      const allowance = env.DEMO_DISABLE_PAYMENT_GATE ? { reserved: false as const } : await reserveAdvisorMessage(session);
      try {
        await sendUserLiveMessage(session, params.escalationId, input.text);
      } catch (error) {
        if (allowance.reserved) await releaseAdvisorMessage(session, allowance.counter).catch((refundError: unknown) => console.error("Could not refund free message", refundError));
        throw error;
      }
    } else {
      // Skylar's answer: start a new chat instead. Reopening is only available when it is switched on.
      if (!getServerEnv().ADVISOR_ALLOW_REOPEN) throw new ConflictError("Start a new chat with HR instead.");
      await reopenUserLiveCase(session, params.escalationId);
    }
    return NextResponse.json({ chat: await getUserLiveCase(session, params.escalationId) });
  } catch (error) {
    return errorResponse(error, "POST /api/briefing/advisor-chat/[escalationId]");
  }
}
