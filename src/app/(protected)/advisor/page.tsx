import type { Metadata } from "next";
import { AdvisorQueueClient } from "@/components/advisor/advisor-queue-client";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { requirePageSession } from "@/server/auth/require-session";
import { requireRole } from "@/server/auth/require-role";
import { getEscalationAnalytics } from "@/server/repositories/advisor-escalation.repository";

export const metadata: Metadata = { title: "Advisor Queue" };

export default async function AdvisorQueuePage() {
  const session = await requirePageSession();
  requireRole(session, ["admin"]);

  const analytics = await getEscalationAnalytics(session.companyId);

  return (
    <BriefingRoomFrame session={session} active="Advisor">
      <section className="grid content-start gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: analytics.total },
            { label: "Open", value: analytics.open },
            { label: "Responded", value: analytics.responded },
            { label: "Resolved", value: analytics.resolved },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[16px] bg-ink-2/70 p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.04)]"
            >
              <p className="font-mono text-xs uppercase text-paper-3">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-paper">{value}</p>
            </div>
          ))}
        </div>
        <AdvisorQueueClient />
      </section>
    </BriefingRoomFrame>
  );
}
