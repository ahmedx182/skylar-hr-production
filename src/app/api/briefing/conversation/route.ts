import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, ExternalServiceError, toErrorResponse, ValidationError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env/server";
import { assertWithinRateLimit } from "@/server/ai/rate-limit";
import { streamSkylarConversation } from "@/server/ai/skylar-conversation";
import { requireSession } from "@/server/auth/require-session";
import { parseJsonBody } from "@/server/http/parse-json-body";
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

    return Response.json({ messages, hasMore });
  } catch (error) {
    const response = toErrorResponse(conversationError(error));
    return Response.json(response.body, { status: response.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const env = getServerEnv();

    const input = await parseJsonBody(request, conversationInputSchema);
    assertWithinRateLimit({
      key: `${session.companyId}:${session.uid}:briefing-conversation`,
      maxRequests: env.AI_RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
    });
    const isEmployee = session.role === "employee";
    const history = isEmployee ? [] : await listSkylarConversationMessages(session, input);
    // Employees only send a prompt; their name comes from the session, never from the client.
    const chatInput = isEmployee ? { prompt: input.prompt, employeeName: session.displayName ?? undefined } : input;
    const stream = await streamSkylarConversation(env, { ...chatInput, history, callerRole: session.role }).catch((error: unknown) => {
      throw conversationError(error);
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        let assistantText = "";
        try {
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

    return new Response(body, {
      headers: {
        "Cache-Control": "no-cache, no-store, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    const response = toErrorResponse(conversationError(error));
    return Response.json(response.body, { status: response.status });
  }
}
