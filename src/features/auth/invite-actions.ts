"use server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env/server";
import { requireSession } from "@/server/auth/require-session";
import { sendInviteEmail } from "@/server/email/invite-notification";
import { createInvite } from "@/server/repositories/invite.repository";

const inviteInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["admin", "employee"]),
  linkedEmployeeId: z.string().trim().optional(),
});

export type InviteState = { ok: true; message: string } | { ok: false; message: string };

export async function createInviteAction(_prev: InviteState | null, formData: FormData): Promise<InviteState> {
  try {
    const session = await requireSession();
    if (!session) return { ok: false, message: "You must be signed in." };
    if (session.role !== "admin") return { ok: false, message: "Only admins can invite team members." };

    const parsed = inviteInputSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
      linkedEmployeeId: formData.get("linkedEmployeeId") || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, message: first?.message ?? "Invalid input." };
    }

    const { email, role, linkedEmployeeId } = parsed.data;
    await createInvite(session, email, role, linkedEmployeeId ?? null);

    const env = getServerEnv();
    await sendInviteEmail({
      toEmail: email,
      companyName: session.companyName ?? "your workspace",
      role,
      appUrl: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
    });

    return { ok: true, message: `Invite sent to ${email}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invite.";
    return { ok: false, message };
  }
}
