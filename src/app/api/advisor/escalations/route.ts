import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/server/http/error-response";
import { requireSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";
import {
  createAdvisorEscalationFromLedger,
  listCompanyAdvisorEscalations,
} from "@/server/repositories/advisor-escalation.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const escalations = await listCompanyAdvisorEscalations(session.companyId);

    return NextResponse.json({ escalations });
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/escalations");
  }
}

const createEscalationSchema = z.object({
  ledgerEntryId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const input = createEscalationSchema.parse(await request.json());
    const escalation = await createAdvisorEscalationFromLedger(session, input.ledgerEntryId);

    return NextResponse.json({ escalation }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/advisor/escalations");
  }
}
