import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      body="Skylar's Terms of Service page is available at this route for release wiring and approval."
      status="Final legal copy is pending owner/legal approval before production launch."
    />
  );
}
