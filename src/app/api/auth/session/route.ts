import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/constants/auth";
import { sessionRequestSchema } from "@/schemas/auth.schema";
import { createSession } from "@/server/auth/create-session";
import { sessionCookieOptions } from "@/server/auth/session-cookie";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { idToken } = await parseJsonBody(request, sessionRequestSchema);
    const { cookie, maxAgeMs } = await createSession(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, cookie, sessionCookieOptions(maxAgeMs));
    return response;
  } catch (error) {
    return errorResponse(error, "POST /api/auth/session");
  }
}
