import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      body="Skylar's Privacy Policy page is available at this route for release wiring and approval."
      status="Final privacy copy is pending owner/legal approval before production launch."
    />
  );
}
