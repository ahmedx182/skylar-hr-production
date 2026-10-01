"use server";

import { revalidatePath } from "next/cache";
import { SETTINGS_PATH } from "@/constants/routes";
import { toErrorResponse } from "@/lib/errors";
import { requireSession } from "@/server/auth/require-session";
import { updateUserRole } from "@/server/repositories/user.repository";

export type UserRoleState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function updateUserRoleAction(
  targetUid: string,
  role: "admin" | "employee",
): Promise<UserRoleState> {
  try {
    const session = await requireSession();
    await updateUserRole(session, targetUid, role);
    revalidatePath(SETTINGS_PATH);
    return { ok: true, message: "Role updated." };
  } catch (error) {
    const response = toErrorResponse(error);
    return { ok: false, message: response.body.error.message };
  }
}
