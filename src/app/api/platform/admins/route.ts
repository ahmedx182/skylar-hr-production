import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { applyPlatformAdminAction } from "@/server/platform/platform-admins";

export const dynamic = "force-dynamic";

const email = z.string().trim().email("Enter a valid email address.").max(320);
const reason = z.string().trim().max(500);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), email, reason: reason.min(3, "Add a short reason for granting super admin access.") }),
  z.object({ action: z.literal("revoke"), email, reason: reason.optional() }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const input = await parseJsonBody(request, actionSchema);

    await applyPlatformAdminAction({
      email: input.email,
      action: input.action,
      reason: input.reason?.trim() || null,
      actor: session,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "POST /api/platform/admins");
  }
}
