import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env/server";

type InviteEmailInput = {
  toEmail: string;
  companyName: string;
  role: "admin" | "employee";
  appUrl: string;
};

let resendClient: Resend | undefined;

function resend(apiKey: string): Resend {
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function buildInviteEmail(input: InviteEmailInput) {
  const roleLabel = input.role === "admin" ? "admin" : "team member";
  const signInUrl = `${input.appUrl}/sign-in`;

  const subject = `You've been invited to ${input.companyName} on Skylar`;

  const text = [
    `You've been invited to join ${input.companyName} on Skylar as a ${roleLabel}.`,
    "",
    "To accept your invitation, sign in with this email address at:",
    signInUrl,
    "",
    "Skylar will recognize your invitation automatically when you sign in.",
    "",
    "If you weren't expecting this invitation, you can safely ignore this email.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#111;">
  <h2 style="margin:0 0 8px;">You've been invited to ${input.companyName}</h2>
  <p style="margin:0 0 24px;color:#555;">You've been added as a <strong>${roleLabel}</strong> on Skylar.</p>
  <a href="${signInUrl}"
     style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:24px;font-weight:600;font-size:14px;">
    Sign in to accept
  </a>
  <p style="margin:32px 0 0;font-size:13px;color:#888;">
    Sign in with <strong>${input.toEmail}</strong> and Skylar will recognize your invitation automatically.
  </p>
  <p style="margin:16px 0 0;font-size:13px;color:#bbb;">If you weren't expecting this, you can ignore this email.</p>
</body>
</html>`;

  return { subject, text, html };
}

export type InviteEmailResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export async function sendInviteEmail(input: InviteEmailInput): Promise<InviteEmailResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    return { status: "skipped", reason: "RESEND_API_KEY is not configured." };
  }

  const email = buildInviteEmail(input);

  try {
    const response = await resend(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL ?? "Skylar <onboarding@resend.dev>",
      to: input.toEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return { status: "sent", messageId: response.data?.id ?? null };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Failed to send invite email.",
    };
  }
}
