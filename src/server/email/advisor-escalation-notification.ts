import "server-only";
import { Resend } from "resend";
import { ADVISOR_PATH } from "@/constants/routes";
import { buildAdvisorEscalationEmail } from "@/features/advisor/escalation-email";
import { getServerEnv } from "@/lib/env/server";

type AdvisorNotificationInput = {
  caseId: string;
  employeeName: string;
  question: string;
  escalationReason: string;
  responseCommitment: string;
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
  if (!env.RESEND_API_KEY || !env.SKYLAR_TEAM_EMAIL) {
    return { status: "skipped", reason: "Resend recipient or API key is not configured." };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const email = buildAdvisorEscalationEmail({
    ...input,
    advisorUrl: `${appUrl}${ADVISOR_PATH}`,
  });

  try {
    const response = await resend(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL ?? "Skylar <onboarding@resend.dev>",
      to: env.SKYLAR_TEAM_EMAIL,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return { status: "sent", messageId: response.data?.id ?? null };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Resend notification failed.",
    };
  }
}
