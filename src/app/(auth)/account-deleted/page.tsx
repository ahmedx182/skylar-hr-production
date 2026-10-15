import type { Metadata } from "next";
import { UserX } from "lucide-react";
import { AccountBlockedPage } from "@/components/auth/account-blocked-page";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false, follow: false } };
// Reads SUPPORT_EMAIL, so it must render per request rather than at build time.
export const dynamic = "force-dynamic";

export default function AccountDeletedPage() {
  return (
    <AccountBlockedPage
      icon={UserX}
      title="This account has been deleted"
      lead="This Skylar account has been deleted, so you can no longer sign in with it."
    />
  );
}
