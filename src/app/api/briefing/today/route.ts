import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDailyBriefingDeck } from "@/features/briefing/daily-deck";
import { requireSession } from "@/server/auth/require-session";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import {
  listHiddenBriefingCardIds,
  resetBriefingCardActions,
  saveBriefingCardAction,
} from "@/server/repositories/briefing-action.repository";
import {
  listCompanyEmployees,
  listCompanyLedger,
} from "@/server/repositories/briefing-read.repository";

const briefingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({
    cardId: z.string().trim().min(1),
    action: z.enum(["next", "not_now"]),
  }),
]);

export async function GET() {
  try {
    const session = await requireSession();
    const [employees, ledger, hiddenCardIds] = await Promise.all([
      listCompanyEmployees(session.companyId),
      listCompanyLedger(session.companyId),
      listHiddenBriefingCardIds(session),
    ]);

    return NextResponse.json({
      cards: buildDailyBriefingDeck(session, { employees, ledger }, hiddenCardIds),
      hasHiddenCards: hiddenCardIds.size > 0,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/briefing/today");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const input = await parseJsonBody(request, briefingActionSchema);

    if (input.action === "reset") {
      await resetBriefingCardActions(session);
    } else {
      await saveBriefingCardAction(session, input);
    }

    const [employees, ledger, hiddenCardIds] = await Promise.all([
      listCompanyEmployees(session.companyId),
      listCompanyLedger(session.companyId),
      listHiddenBriefingCardIds(session),
    ]);

    return NextResponse.json({
      cards: buildDailyBriefingDeck(session, { employees, ledger }, hiddenCardIds),
      hasHiddenCards: hiddenCardIds.size > 0,
    });
  } catch (error) {
    return errorResponse(error, "POST /api/briefing/today");
  }
}
