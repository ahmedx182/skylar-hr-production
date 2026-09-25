import { NextResponse } from "next/server";
import { loginSchema } from "@/schemas/auth.schema";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { findActiveUserByEmail } from "@/server/repositories/user.repository";
import { toErrorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = loginSchema.parse(await request.json());
    const user = await findActiveUserByEmail(parsed.email);

    return NextResponse.json({ allowed: Boolean(user) });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
