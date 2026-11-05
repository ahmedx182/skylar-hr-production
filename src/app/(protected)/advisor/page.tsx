import type { Metadata } from "next";
import { AdvisorCases } from "@/components/advisor/advisor-cases";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";

export const metadata: Metadata = { title: "Advisor" };

export default async function AdvisorPage() {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);

  return (
    <BriefingRoomFrame session={session} active="Advisor">
      <AdvisorCases />
    </BriefingRoomFrame>
  );
}
