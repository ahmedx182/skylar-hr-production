import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { purgeWorkspace, restoreWorkspace, softDeleteWorkspace } from "@/server/platform/workspace-lifecycle";
import { applyPlatformAction } from "@/server/repositories/platform.repository";

export const dynamic = "force-dynamic";

const reason = z.string().trim().max(500);
const confirmName = z.string().trim().min(1).max(200);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: reason.min(3, "Add a short reason for suspending this workspace.") }),
  z.object({ action: z.literal("unblock"), reason: reason.optional() }),
  z.object({ action: z.literal("grant_paid"), reason: reason.optional() }),
  z.object({ action: z.literal("revoke_paid"), reason: reason.optional() }),
  z.object({ action: z.literal("delete"), confirmName, reason: reason.min(3, "Add a short reason for deleting this workspace.") }),
  z.object({ action: z.literal("restore_workspace"), reason: reason.optional() }),
  z.object({ action: z.literal("purge"), confirmName }),
]);

export async function POST(request: Request, { params }: { params: { companyId: string } }) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const input = await parseJsonBody(request, actionSchema);
    const { companyId } = params;

    switch (input.action) {
      case "delete": {
        const result = await softDeleteWorkspace({ companyId, confirmName: input.confirmName, reason: input.reason, actor: session });
        return NextResponse.json({ ok: true, deleteAfterMs: result.deleteAfterMs });
      }
      case "restore_workspace":
        await restoreWorkspace({ companyId, actor: session, note: input.reason?.trim() || null });
        return NextResponse.json({ ok: true });
      case "purge":
        await purgeWorkspace({ companyId, actor: session, confirmName: input.confirmName });
        return NextResponse.json({ ok: true, purged: true });
      default:
        await applyPlatformAction({
          companyId,
          action: input.action,
          reason: input.reason?.trim() || null,
          actor: session,
        });
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return errorResponse(error, "POST /api/platform/workspaces/[companyId]");
  }
}
