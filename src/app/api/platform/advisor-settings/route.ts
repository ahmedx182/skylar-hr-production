import { NextResponse } from "next/server";
import { z } from "zod";
import { isWithinWorkingHours } from "@/features/advisor/hours";
import { requirePlatformAdmin } from "@/server/auth/platform-admin";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { getAdvisorSettings, saveAdvisorSettings } from "@/server/repositories/platform-settings.repository";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  timeZone: z.string().trim().min(1, "Choose a time zone.").max(64),
  startHour: z.number().int("The start hour must be a whole number."),
  endHour: z.number().int("The end hour must be a whole number."),
  workDays: z.array(z.number().int()).max(7),
  freeTrialDays: z.number().int("The free trial must be a whole number of days."),
});

const withNow = (settings: Awaited<ReturnType<typeof getAdvisorSettings>>) => ({ settings, withinHoursNow: isWithinWorkingHours(Date.now(), settings.hours) });

/** HR advisor working hours and the free-trial length. Super admins only. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    return NextResponse.json(withNow(await getAdvisorSettings()));
  } catch (error) {
    return errorResponse(error, "GET /api/platform/advisor-settings");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requirePlatformAdmin();
    const input = await parseJsonBody(request, settingsSchema);
    const saved = await saveAdvisorSettings(
      { hours: { timeZone: input.timeZone, startHour: input.startHour, endHour: input.endHour, workDays: input.workDays }, freeTrialDays: input.freeTrialDays },
      session,
    );
    return NextResponse.json(withNow(saved));
  } catch (error) {
    return errorResponse(error, "POST /api/platform/advisor-settings");
  }
}
