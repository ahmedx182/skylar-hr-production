import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env/server";
import { errorResponse } from "@/server/http/error-response";
import { purgeExpiredWorkspaces } from "@/server/platform/workspace-lifecycle";
import { purgeExpiredUsers } from "@/server/platform/user-lifecycle";
import { purgeExpiredRecords } from "@/server/repositories/recently-deleted.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) return false;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called daily by the scheduler. Permanently removes workspaces, user accounts, employee files and notes deleted more than 30 days ago. */
export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
    const workspaces = await purgeExpiredWorkspaces();
    const records = await purgeExpiredRecords();
    const users = await purgeExpiredUsers();
    return NextResponse.json({ workspaces, records, users });
  } catch (error) {
    return errorResponse(error, "GET /api/cron/purge-deleted");
  }
}
