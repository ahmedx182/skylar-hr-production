import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { applyUserAction } from "@/server/platform/user-lifecycle";

export const dynamic = "force-dynamic";

const reason = z.string().trim().max(500);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: reason.min(3, "Add a short reason for suspending this account.") }),
  z.object({ action: z.literal("unsuspend"), reason: reason.optional() }),
  z.object({
    action: z.literal("delete"),
    confirmEmail: z.string().trim().min(1).max(320),
    reason: reason.min(3, "Add a short reason for deleting this account."),
  }),
  z.object({ action: z.literal("restore"), reason: reason.optional() }),
]);

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const input = await parseJsonBody(request, actionSchema);

    await applyUserAction({
      userId: params.userId,
      action: input.action,
      reason: input.reason?.trim() || null,
      confirmEmail: input.action === "delete" ? input.confirmEmail : undefined,
      actor: session,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "POST /api/platform/users/[userId]");
  }
}
