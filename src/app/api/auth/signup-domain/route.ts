import { NextResponse } from "next/server";
import { signupSchema } from "@/schemas/auth.schema";
import { assertSignupDomainAllowed } from "@/server/auth/signup-domain";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseJsonBody(request, signupSchema);
    assertSignupDomainAllowed(input.email);

    return NextResponse.json({ allowed: true });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/signup-domain");
  }
}
