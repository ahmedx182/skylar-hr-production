import type { Metadata } from "next";
import { BriefingRoomFrame } from "@/components/briefing/briefing-room-frame";
import { CreateRecordPage } from "@/components/briefing/create-record-page";
import { requirePageSession } from "@/server/auth/require-session";

export const metadata: Metadata = { title: "New Person" };

export default async function NewPersonPage() {
  const session = await requirePageSession();

  return (
    <BriefingRoomFrame session={session} active="People">
      <CreateRecordPage mode="person" role={session.role} />
    </BriefingRoomFrame>
  );
}
