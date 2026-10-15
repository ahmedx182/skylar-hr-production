import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env/server";

export type SignInEmailPurpose = "login" | "signup";

let resendClient: Resend | undefined;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildSignInEmail({
  purpose,
  link,
  toEmail,
  appUrl,
  companyName,
}: {
  purpose: SignInEmailPurpose;
  link: string;
  toEmail: string;
  appUrl: string;
  companyName?: string;
}) {
  const isSignup = purpose === "signup";
  const workspace = companyName?.trim();
  const subject = isSignup ? "Confirm your email to create your Skylar workspace" : "Your Skylar sign-in link";
  const heading = isSignup ? "Confirm your email" : "Sign in to Skylar";
  const intro = isSignup
    ? `Click the button below to verify ${toEmail} and finish creating ${workspace ? `the ${workspace} workspace` : "your workspace"}.`
    : `Click the button below to sign in as ${toEmail}. No password needed.`;
  const cta = isSignup ? "Verify email and continue" : "Sign in to Skylar";

  const text = [
    heading,
    "",
    intro,
    "",
    link,
    "",
    "This link can be used once. If you didn't request it, you can safely ignore this email; no one can sign in without access to your inbox.",
    "",
    "Skylar · Briefing Room",
  ].join("\n");

  const logoUrl = `${appUrl}/brand/logo.png`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0E;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0E;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding:0 4px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${escapeHtml(logoUrl)}" width="30" height="28" alt="" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;font-size:17px;font-weight:700;color:#F2EFE8;">
                    Skylar <span style="font-weight:400;color:#7E7B74;font-size:14px;">Briefing Room</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#15151B;border-radius:20px;border:1px solid #26262E;padding:36px 32px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#F5AD44;">${isSignup ? "Verify your email" : "Passwordless sign-in"}</p>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;color:#F2EFE8;">${escapeHtml(heading)}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#B4B0A6;">${escapeHtml(intro)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:#F2EFE8;">
                    <a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#0B0B0E;text-decoration:none;border-radius:999px;">${escapeHtml(cta)} &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 6px;font-size:12.5px;color:#7E7B74;">Button not working? Paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(link)}" style="color:#B4B0A6;text-decoration:underline;">${escapeHtml(link)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 8px 0;font-size:12.5px;line-height:1.6;color:#7E7B74;">
              This link can be used once. If you didn't request it, you can safely ignore this email; no one can sign in without access to your inbox.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/** Returns false when branded email isn't configured, so the caller can fall back to Firebase's default sender. */
export async function sendSignInEmail(input: Parameters<typeof buildSignInEmail>[0]): Promise<boolean> {
  const env = getServerEnv();
  // Resend's shared test sender only delivers to the account owner, so a real From address is required.
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;

  resendClient ??= new Resend(env.RESEND_API_KEY);
  const email = buildSignInEmail(input);
  const { error } = await resendClient.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.toEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  if (error) {
    console.error(JSON.stringify({ level: "error", event: "sign_in_email_failed", error: error.message }));
    return false;
  }
  return true;
}
