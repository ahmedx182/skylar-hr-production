import "server-only";
import { Resend } from "resend";
import { BILLING_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";

type SubscriptionEmailInput = {
  toEmail: string;
  companyName: string;
  planName: string;
  /** "$149 / month", or null when the plan can't be looked up. */
  priceLabel: string | null;
  /** The first invoice, when Stripe has one for this checkout. */
  invoice: { number: string | null; amountLabel: string; url: string | null } | null;
  appUrl: string;
};

let resendClient: Resend | undefined;

function resend(apiKey: string): Resend {
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSubscriptionEmail(input: SubscriptionEmailInput) {
  const billingUrl = `${input.appUrl}${BILLING_PATH}`;
  const plan = input.priceLabel ? `${input.planName} (${input.priceLabel})` : input.planName;
  const subject = `You're on Skylar ${input.planName}`;
  const invoice = input.invoice;
  const invoiceLine = invoice ? `Invoice ${invoice.number ?? ""} for ${invoice.amountLabel}`.replace("  ", " ") : null;

  const text = [
    `Thanks for upgrading. ${input.companyName} is now on the ${plan} plan.`,
    "",
    "You now have unlimited chat with Skylar AI and more human HR escalations each month.",
    "",
    ...(invoiceLine ? [invoiceLine + (invoice?.url ? `: ${invoice.url}` : ""), ""] : []),
    "View your invoices and manage your subscription:",
    billingUrl,
    "",
    "Stripe will email your payment receipt separately.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#111;">
  <h2 style="margin:0 0 8px;">You're on Skylar ${escapeHtml(input.planName)}</h2>
  <p style="margin:0 0 24px;color:#555;">Thanks for upgrading. <strong>${escapeHtml(input.companyName)}</strong> is now on the ${escapeHtml(plan)} plan.</p>
  <p style="margin:0 0 24px;color:#555;">You now have unlimited chat with Skylar AI and more human HR escalations each month.</p>
  ${invoiceLine ? `<p style="margin:0 0 24px;color:#555;">${escapeHtml(invoiceLine)}</p>` : ""}
  <div>
    ${
      invoice?.url
        ? `<a href="${escapeHtml(invoice.url)}"
     style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:24px;font-weight:600;font-size:14px;margin:0 8px 8px 0;">
    View invoice
  </a>`
        : ""
    }
    <a href="${billingUrl}"
       style="display:inline-block;${invoice?.url ? "background:#fff;color:#111;border:1px solid #111;" : "background:#111;color:#fff;"}text-decoration:none;padding:${invoice?.url ? "11px 23px" : "12px 24px"};border-radius:24px;font-weight:600;font-size:14px;margin:0 8px 8px 0;">
      View billing
    </a>
  </div>
  <p style="margin:32px 0 0;font-size:13px;color:#888;">Stripe will email your payment receipt separately.</p>
</body>
</html>`;

  return { subject, text, html };
}

export type SubscriptionEmailResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export async function sendSubscriptionConfirmationEmail(input: SubscriptionEmailInput): Promise<SubscriptionEmailResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    return { status: "skipped", reason: "RESEND_API_KEY is not configured." };
  }

  const email = buildSubscriptionEmail(input);

  try {
    const response = await resend(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL ?? "Skylar <onboarding@resend.dev>",
      to: input.toEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    // Resend reports API failures in the response rather than throwing.
    if (response.error) return { status: "failed", reason: response.error.message };

    return { status: "sent", messageId: response.data?.id ?? null };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Failed to send subscription email.",
    };
  }
}
