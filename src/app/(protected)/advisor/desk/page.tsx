import type { Metadata } from "next";
import { AdvisorDesk } from "@/components/advisor/advisor-desk";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { getSession } from "@/server/auth/get-session";
import { isAdvisor, requireAdvisorPage } from "@/server/auth/advisor-access";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  return { title: session && isAdvisor(session) ? "Advisor desk" : "Not found" };
}
export const dynamic = "force-dynamic";

export default async function AdvisorDeskPage() {
  const session = await requireAdvisorPage();

  return (
    <BriefingRoomFrame session={session} active="Advisor desk">
      <section className="grid content-start gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Advisor desk</h1>
          <p className="mt-1 text-sm text-paper-3">Chats escalated from every workspace. Claim one to reply; the first advisor to claim it owns it.</p>
        </div>
        <AdvisorDesk advisorUid={session.uid} />
      </section>
    </BriefingRoomFrame>
  );
}
