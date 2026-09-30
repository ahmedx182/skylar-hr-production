import type { Metadata } from "next";
import { AdvisorQueueClient } from "@/components/advisor/advisor-queue-client";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";

export const metadata: Metadata = { title: "Advisor Queue" };

export default async function AdvisorQueuePage() {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);

  return (
    <BriefingRoomFrame session={session} active="Advisor">
      <AdvisorQueueClient />
    </BriefingRoomFrame>
  );
}
