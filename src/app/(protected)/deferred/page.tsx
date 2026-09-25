import type { Metadata } from "next";
import { IndexAccessPage } from "@/components/briefing/index-access-page";
import { requirePageSession } from "@/server/auth/require-session";

export const metadata: Metadata = { title: "Deferred" };

export default async function DeferredPage() {
  const session = await requirePageSession();

  return <IndexAccessPage session={session} active="Deferred" items={[]} />;
}
