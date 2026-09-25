import type { Metadata } from "next";
import Image from "next/image";
import { VerifyEmailLink } from "@/components/auth/verify-email-link";

// The URL carries a single-use sign-in code; never leak it through Referer.
export const metadata: Metadata = { title: "Signing in", referrer: "no-referrer" };

export default function VerifyPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-paper/10 bg-paper/[0.055] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        <Image src="/brand/logo.png" alt="Skylar" width={42} height={38} priority className="mb-10" />
        <VerifyEmailLink />
      </section>
    </div>
  );
}
