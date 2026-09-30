import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { LiveInFive } from "@/components/briefing/live-in-five";
import { requirePageSession } from "@/server/auth/require-session";

export const metadata: Metadata = { title: "Live in 5" };

export default async function OnboardingPage() {
  const session = await requirePageSession();

  return (
    <BriefingRoomFrame session={session} active="Today">
      <LiveInFive session={session} />
    </BriefingRoomFrame>
  );
}
