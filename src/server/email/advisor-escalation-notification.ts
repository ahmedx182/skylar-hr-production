import "server-only";
import { Resend } from "resend";
import { ADVISOR_DESK_PATH, ADVISOR_PATH } from "@/constants/routes";
import { buildAdvisorEscalationEmail, buildLiveReplyEmail, type LiveReplyAudience } from "@/features/advisor/escalation-email";
import { getServerEnv } from "@/lib/env/server";
import { listHrAdvisorEmails } from "@/server/auth/hr-advisor-email";

type AdvisorNotificationInput = {
  caseId: string;
  employeeName: string;
  question: string;
  escalationReason: string;
  responseCommitment: string;
  reopened?: boolean;
};

export type AdvisorNotificationResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

let resendClient: Resend | undefined;

function resend(apiKey: string): Resend {
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export async function sendAdvisorEscalationNotification(
  input: AdvisorNotificationInput,
): Promise<AdvisorNotificationResult> {
  const env = getServerEnv();
  // Every HR advisor is told, plus the team address if one is set. A failed lookup must not lose the alert.
  const advisorEmails = await listHrAdvisorEmails().catch((error: unknown) => {
    console.error("Could not list HR advisors for the escalation email", error);
    return [] as string[];
  });
  const recipients = Array.from(new Set([...advisorEmails, ...(env.SKYLAR_TEAM_EMAIL ? [env.SKYLAR_TEAM_EMAIL.trim().toLowerCase()] : [])]));
  if (!env.RESEND_API_KEY || recipients.length === 0) {
    return { status: "skipped", reason: "No HR advisors or team email to notify, or Resend is not configured." };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const email = buildAdvisorEscalationEmail({
    ...input,
    advisorUrl: `${appUrl}${ADVISOR_DESK_PATH}`,
  });

  try {
    const response = await resend(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL ?? "Skylar <onboarding@resend.dev>",
      to: recipients,
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
      reason: error instanceof Error ? error.message : "Resend notification failed.",
    };
  }
}

/** Tells the other side of a live chat they have a new message, for when they aren't looking at it. */
export async function sendLiveReplyNotification(input: {
  toEmail: string;
  caseId: string;
  audience: LiveReplyAudience;
  kind?: "reply" | "reviewed";
}): Promise<AdvisorNotificationResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) return { status: "skipped", reason: "Resend is not configured." };

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const email = buildLiveReplyEmail({
    caseId: input.caseId,
    audience: input.audience,
    kind: input.kind,
    url: `${appUrl}${input.audience === "user" ? ADVISOR_PATH : ADVISOR_DESK_PATH}`,
  });

  try {
    const response = await resend(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL ?? "Skylar <onboarding@resend.dev>",
      to: input.toEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    if (response.error) return { status: "failed", reason: response.error.message };
    return { status: "sent", messageId: response.data?.id ?? null };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : "Resend notification failed." };
  }
}
