import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";
import { AccountBlockedPage } from "@/components/auth/account-blocked-page";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false, follow: false } };
// Reads SUPPORT_EMAIL, so it must render per request rather than at build time.
export const dynamic = "force-dynamic";

export default function AccountSuspendedPage() {
  return (
    <AccountBlockedPage
      icon={ShieldOff}
      title="Your account has been suspended"
      lead="Your Skylar account was suspended for a violation of our Terms of Use. You can't sign in while the suspension is in place."
      showTerms
    />
  );
}
