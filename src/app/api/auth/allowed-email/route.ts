import { NextResponse } from "next/server";
import { loginSchema } from "@/schemas/auth.schema";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { findActiveUserByEmail } from "@/server/repositories/user.repository";
import { errorResponse } from "@/server/http/error-response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = loginSchema.parse(await request.json());
    const user = await findActiveUserByEmail(parsed.email);

    return NextResponse.json({ allowed: Boolean(user) });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/allowed-email");
  }
}
