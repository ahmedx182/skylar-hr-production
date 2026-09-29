"use server";

import { revalidatePath } from "next/cache";
import { SETTINGS_PATH } from "@/constants/routes";
import { toErrorResponse } from "@/lib/errors";
import {
  accountSettingsSchema,
  type AccountSettingsInput,
} from "@/schemas/auth.schema";
import { requireSession } from "@/server/auth/require-session";
import { updateAccountSettings } from "@/server/repositories/user.repository";

export type AccountSettingsState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function updateAccountSettingsAction(
  input: AccountSettingsInput,
): Promise<AccountSettingsState> {
  try {
    const session = await requireSession();
    const parsed = accountSettingsSchema.parse(input);
    await updateAccountSettings(session, parsed);
    revalidatePath(SETTINGS_PATH);
    return { ok: true, message: "Account settings saved." };
  } catch (error) {
    const response = toErrorResponse(error);
    return { ok: false, message: response.body.error.message };
  }
}
