import { NextResponse } from "next/server";
import { loginSchema } from "@/schemas/auth.schema";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { findAccountBlockByEmail, findActiveUserByEmail } from "@/server/repositories/user.repository";
import { assertWithinRateLimit } from "@/server/ai/rate-limit";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { findPendingInviteByEmail } from "@/server/repositories/invite.repository";
import { assertWorkspaceEmailAllowed } from "@/server/auth/workspace-domain";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = await parseJsonBody(request, loginSchema);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    assertWithinRateLimit({ key: `allowed-email:ip:${ip}`, maxRequests: 30, windowMs: 10 * 60 * 1000 });
    const user = await findActiveUserByEmail(parsed.email);
    // Suspended and deleted accounts get an explanation page instead of a vague "not added" message.
    const accountState = user ? null : await findAccountBlockByEmail(parsed.email);
    if (accountState) return NextResponse.json({ allowed: false, accountState });
    if (user?.role === "employee") await assertWorkspaceEmailAllowed(user.companyId, parsed.email);
    const invite = user ? null : await findPendingInviteByEmail(parsed.email);
    if (invite) await assertWorkspaceEmailAllowed(invite.companyId, parsed.email);

    return NextResponse.json({ allowed: Boolean(user || invite) });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/allowed-email");
  }
}
