import { NextResponse } from "next/server";
import { loginSchema } from "@/schemas/auth.schema";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { findActiveUserByEmail } from "@/server/repositories/user.repository";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { findPendingInviteByEmail } from "@/server/repositories/invite.repository";
import { assertWorkspaceEmailAllowed } from "@/server/auth/workspace-domain";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = await parseJsonBody(request, loginSchema);
    const user = await findActiveUserByEmail(parsed.email);
    if (user?.role === "employee") await assertWorkspaceEmailAllowed(user.companyId, parsed.email);
    const invite = user ? null : await findPendingInviteByEmail(parsed.email);
    if (invite) await assertWorkspaceEmailAllowed(invite.companyId, parsed.email);

    return NextResponse.json({ allowed: Boolean(user || invite) });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/allowed-email");
  }
}
