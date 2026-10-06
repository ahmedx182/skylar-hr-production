import { NextResponse } from "next/server";
import { signupSchema } from "@/schemas/auth.schema";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";

/** Preflight only: workspace creation requires a verified Firebase token. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await parseJsonBody(request, signupSchema);
    return NextResponse.json({ allowed: true });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/signup");
  }
}
