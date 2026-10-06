"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { sendSignInLinkToEmail } from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { VERIFY_PATH } from "@/constants/routes";
import { saveMagicEmail, savePendingSignup } from "@/features/auth/magic-email";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signupSchema } from "@/schemas/auth.schema";

export function SignupForm() {
  const [error, setError] = useState<string>();
  const [sentEmail, setSentEmail] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });

  async function requestSignup(input: z.infer<typeof signupSchema>) {
    setError(undefined);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Could not check workspace signup. Try again.");
      }
      const url = new URL(VERIFY_PATH, process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
      // Carry setup through the email link even when opened on another device.
      // The server checks the verified email's domain again before provisioning.
      url.searchParams.set("companyName", input.companyName);
      await sendSignInLinkToEmail(getFirebaseAuth(), input.email, {
        url: url.toString(), handleCodeInApp: true,
      });
      saveMagicEmail(input.email);
      savePendingSignup(input);
      setSentEmail(input.email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your verification link. Try again.");
    }
  }

  if (sentEmail) return (
    <div role="status" className="mt-8 rounded-2xl border border-success/30 bg-success/10 p-4">
      <p className="font-semibold text-paper">Verify your email to create your workspace</p>
      <p className="mt-2 text-sm leading-6 text-paper-2">
        We sent a secure link to <span className="text-paper">{sentEmail}</span>.
        Open it to verify your email and continue to workspace setup. You can use another device.
      </p>
      <Button type="button" className="mt-4" onClick={() => setSentEmail(undefined)}>Use a different email or resend</Button>
    </div>
  );

  return (
    <form noValidate onSubmit={handleSubmit(requestSignup)} className="mt-8 flex flex-col gap-4">
      <Field label="Organization / workspace name" autoComplete="organization" placeholder="Your organization" error={errors.companyName?.message} {...register("companyName")} />
      <Field label="Your work email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" error={errors.email?.message} {...register("email")} />
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending verification link…" : "Create my workspace"}</Button>
      {error && <p role="alert" className="text-sm text-attention">{error}</p>}
    </form>
  );
}
