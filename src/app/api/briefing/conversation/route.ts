import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, ExternalServiceError, NotFoundError, toErrorResponse, ValidationError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env/server";
import { assertWithinRateLimit } from "@/server/ai/rate-limit";
import {
  buildEscalationNotice,
  toEscalationEvent,
  type ChatEscalationOutcome,
} from "@/features/briefing/chat-escalation";
import { FORWARDED_MESSAGE, transferMessage } from "@/features/advisor/live-chat";
import { escalateFromChat } from "@/server/ai/chat-escalation";
import { buildEmployeeFileContext } from "@/server/ai/employee-context";
import { streamSkylarConversation } from "@/server/ai/skylar-conversation";
import { requireSession } from "@/server/auth/require-session";
import { parseJsonBody } from "@/server/http/parse-json-body";
import {
  releaseAdvisorMessage,
  reserveAdvisorMessage,
  type AdvisorAllowance,
} from "@/server/repositories/billing.repository";
import { afterHoursNow, findLiveCaseForEmployee, sendUserLiveMessage } from "@/server/repositories/advisor-live.repository";
import {
  appendSkylarConversationTurn,
  listSkylarConversationMessages,
  listSkylarConversationPage,
} from "@/server/repositories/skylar-conversation.repository";

const conversationInputSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  employeeId: z.string().trim().max(120).optional(),
  employeeName: z.string().trim().max(120).optional(),
  cardTitle: z.string().trim().max(240).optional(),
  cardBody: z.string().trim().max(1200).optional(),
});

const conversationQuerySchema = z.object({
  employeeId: z.string().trim().max(120).optional(),
  employeeName: z.string().trim().max(120).optional(),
  cardTitle: z.string().trim().max(240).optional(),
  cardBody: z.string().trim().max(1200).optional(),
  page: z.coerce.number().int().min(0).max(20).default(0),
});

const SSE_HEADERS = {
  "Cache-Control": "no-cache, no-store, no-transform",
  Connection: "keep-alive",
  "Content-Type": "text/event-stream; charset=utf-8",
} as const;

/** A fixed reply streamed in the same shape as an AI answer, so the chat screen needs no special case. */
function fixedReply(events: Record<string, unknown>[]) {
  const encoder = new TextEncoder();
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(encoder.encode(body), { headers: SSE_HEADERS });
}

/** Earlier turns with this person that the manager chat remembers. */
const MANAGER_HISTORY_MESSAGES = 30;

function conversationError(error: unknown) {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : "";
  if (/authentication_error|api key is invalid|401/i.test(message)) {
    return new ExternalServiceError("Skylar is not connected. Check ANTHROPIC_API_KEY and restart the server.");
  }
  console.error("Skylar conversation failed", error);
  return new ExternalServiceError("Skylar could not reach the conversation service. Try again.");
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = conversationQuerySchema.safeParse(searchParams);
    if (!parsed.success) throw new ValidationError("Invalid saved conversation context.");
    const { page, ...context } = parsed.data;
    const { messages, hasMore } = await listSkylarConversationPage(session, context, page);
    // The advisor chat for this person, so a reload (or a reopen) finds the live thread again.
    const liveEnabled = getServerEnv().LIVE_ADVISOR_ENABLED;
    const liveCase = liveEnabled && session.role !== "employee" && context.employeeId ? await findLiveCaseForEmployee(session, context.employeeId) : null;

    return Response.json({ messages, hasMore, liveCaseId: liveCase?.id ?? null, liveAdvisorEnabled: liveEnabled });
  } catch (error) {
    const response = toErrorResponse(conversationError(error));
    return Response.json(response.body, { status: response.status });
  }
}

export async function POST(request: NextRequest) {
  let refund: (() => Promise<void>) | null = null;
  try {
    const session = await requireSession();
    const env = getServerEnv();

    const input = await parseJsonBody(request, conversationInputSchema);
    assertWithinRateLimit({
      key: `${session.companyId}:${session.uid}:briefing-conversation`,
      maxRequests: env.AI_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
    });
    // Free workspaces get FREE_MESSAGE_LIMIT advisor messages; throws a 402 once they're used up. Messages to a human
    // advisor count against that limit just like messages to the assistant.
    const allowance: AdvisorAllowance = env.DEMO_DISABLE_PAYMENT_GATE ? { reserved: false } : await reserveAdvisorMessage(session);
    if (allowance.reserved) refund = () => releaseAdvisorMessage(session, allowance.counter);
    // A person already owns this chat: pass the message to them and keep the assistant out of it.
    if (env.LIVE_ADVISOR_ENABLED && session.role !== "employee" && input.employeeId) {
      const liveCase = await findLiveCaseForEmployee(session, input.employeeId);
      if (liveCase?.isOpen) {
        await sendUserLiveMessage(session, liveCase.id, input.prompt);
        refund = null; // delivered, so it counts
        // Delivered already; a failed history write must not make the user send it twice.
        await appendSkylarConversationTurn(session, input, input.prompt, FORWARDED_MESSAGE).catch((appendError: unknown) => console.error("Could not save the forwarded message to chat history", appendError));
        return fixedReply([{ text: FORWARDED_MESSAGE }, { liveCaseId: liveCase.id }]);
      }
    }
    const isEmployee = session.role === "employee";
    const history = isEmployee ? [] : await listSkylarConversationMessages(session, input, MANAGER_HISTORY_MESSAGES);
    // Managers: the selected person's notes are loaded here, so the chat sees them wherever it was opened.
    const employeeContext = !isEmployee && input.employeeId ? await buildEmployeeFileContext(session.companyId, input.employeeId) : null;
    // A person outside this workspace (or deleted) is refused before Skylar is asked anything.
    if (!isEmployee && input.employeeId && !employeeContext) throw new NotFoundError("Employee not found.");
    // Employees only send a prompt; their name comes from the session, never from the client.
    const chatInput = isEmployee
      ? { prompt: input.prompt, employeeName: session.displayName ?? undefined }
      : { ...input, employeeName: employeeContext?.name ?? input.employeeName, employeeFile: employeeContext?.file };
    // Managers: high-risk messages are escalated server-side and the bot is told what happened.
    const escalation: ChatEscalationOutcome = isEmployee
      ? { kind: "none" }
      : await escalateFromChat(session, { prompt: input.prompt, employeeId: input.employeeId, history, liveEnabled: env.LIVE_ADVISOR_ENABLED, allowReopen: env.ADVISOR_ALLOW_REOPEN, enforceAllowance: !env.DEMO_DISABLE_PAYMENT_GATE });
    // A new escalation moves the chat to a person: one fixed message and no AI answer. The message that triggered it
    // was sent to a human, so it counts.
    if (env.LIVE_ADVISOR_ENABLED && escalation.kind === "escalated") {
      refund = null;
      const notice = transferMessage(await afterHoursNow());
      // The case exists by now; a failed history write must not tell the user it didn't work.
      await appendSkylarConversationTurn(session, input, input.prompt, notice).catch((appendError: unknown) => console.error("Could not save the transfer to chat history", appendError));
      return fixedReply([{ escalation: toEscalationEvent(escalation) }, { text: notice }, { liveCaseId: escalation.escalationId }]);
    }
    const escalationNotice = buildEscalationNotice(escalation) ?? undefined;
    const escalationEvent = toEscalationEvent(escalation);
    const stream = await streamSkylarConversation(env, { ...chatInput, history, callerRole: session.role, escalationNotice }).catch((error: unknown) => {
      throw conversationError(error);
    });
    // The reply is on its way, so the message now counts.
    refund = null;

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        let assistantText = "";
        try {
          if (escalationEvent) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ escalation: escalationEvent })}\n\n`));
          }
          if (escalation.kind === "offer") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ offer: { reason: escalation.reason } })}\n\n`));
          }
          for await (const text of stream) {
            assistantText += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
          if (assistantText.trim() && !isEmployee) {
            await appendSkylarConversationTurn(session, input, input.prompt, assistantText);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: toErrorResponse(conversationError(error)).body.error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(body, { headers: SSE_HEADERS });
  } catch (error) {
    // The message never got an answer, so don't charge it against the free allowance.
    await refund?.().catch((refundError: unknown) => console.error("Could not refund free message", refundError));
    const response = toErrorResponse(conversationError(error));
    return Response.json(response.body, { status: response.status });
  }
}
