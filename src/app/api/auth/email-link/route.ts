import { NextResponse } from "next/server";
import { z } from "zod";
import { VERIFY_PATH } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";
import { AccountBlockedError, AuthorizationError } from "@/lib/errors";
import { adminAuth } from "@/lib/firebase/admin";
import { loginSchema, signupSchema } from "@/schemas/auth.schema";
import { assertWithinRateLimit } from "@/server/ai/rate-limit";
import { assertWorkspaceEmailAllowed } from "@/server/auth/workspace-domain";
import { sendSignInEmail } from "@/server/email/sign-in-link-email";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";
import { parseJsonBody } from "@/server/http/parse-json-body";
import { findPendingInviteByEmail } from "@/server/repositories/invite.repository";
import { findAccountBlockByEmail, findActiveUserByEmail } from "@/server/repositories/user.repository";

export const dynamic = "force-dynamic";

const emailLinkSchema = z.discriminatedUnion("purpose", [
  loginSchema.extend({ purpose: z.literal("login") }),
  signupSchema.extend({ purpose: z.literal("signup") }),
]);

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Sends the passwordless sign-in email with Skylar branding. Responds `{ delivery: "client" }`
 * when branded email is unavailable, telling the browser to fall back to Firebase's default sender.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseJsonBody(request, emailLinkSchema);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    assertWithinRateLimit({ key: `email-link:ip:${ip}`, maxRequests: 10, windowMs: TEN_MINUTES });
    assertWithinRateLimit({ key: `email-link:to:${input.email}`, maxRequests: 3, windowMs: TEN_MINUTES });

    // A suspended or deleted account can't get a link, whether it is trying to sign in or to sign up again.
    const accountBlock = await findAccountBlockByEmail(input.email);
    if (accountBlock) throw new AccountBlockedError(accountBlock);

    if (input.purpose === "login") {
      const user = await findActiveUserByEmail(input.email);
      if (user?.role === "employee") await assertWorkspaceEmailAllowed(user.companyId, input.email);
      const invite = user ? null : await findPendingInviteByEmail(input.email);
      if (invite) await assertWorkspaceEmailAllowed(invite.companyId, input.email);
      if (!user && !invite) {
        throw new AuthorizationError("This email has not been added to Skylar. Ask an admin to add it first.");
      }
    }

    const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    // Built server-side so the emailed link can only ever land on this app.
    const continueUrl = new URL(`${appUrl}${VERIFY_PATH}`);
    if (input.purpose === "signup") continueUrl.searchParams.set("companyName", input.companyName);

    let link: string;
    try {
      link = await adminAuth().generateSignInWithEmailLink(input.email, {
        url: continueUrl.toString(),
        handleCodeInApp: true,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "sign_in_link_generation_failed",
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
      return NextResponse.json({ delivery: "client" });
    }

    const sent = await sendSignInEmail({
      purpose: input.purpose,
      link,
      toEmail: input.email,
      appUrl,
      companyName: input.purpose === "signup" ? input.companyName : undefined,
    });

    return NextResponse.json({ delivery: sent ? "sent" : "client" });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/email-link");
  }
}
