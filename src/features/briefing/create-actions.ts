"use server";

import { revalidatePath } from "next/cache";
import { BRIEFING_PATH, DOCUMENTS_PATH, PEOPLE_PATH } from "@/constants/routes";
import { AuthorizationError, toErrorResponse } from "@/lib/errors";
import {
  createEmployeeSchema,
  createNoteSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type CreateNoteInput,
  type UpdateEmployeeInput,
} from "@/schemas/briefing-write.schema";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import {
  createEmployeeNoteRecord,
  createEmployeeRecord,
  updateEmployeeRecord,
} from "@/server/repositories/briefing-write.repository";

export type CreateActionState =
  | { ok: true; message: string }
  | { ok: false; message: string };

function actionError(error: unknown): CreateActionState {
  const response = toErrorResponse(error);
  return { ok: false, message: response.body.error.message };
}

async function requireAdmin() {
  const session = await requireSession();
  try {
    requireRole(session, ["admin"]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new AuthorizationError("Only an admin can manage employee records.");
    }
    throw error;
  }
  return session;
}

export async function createEmployeeAction(
  input: CreateEmployeeInput,
): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createEmployeeSchema.parse(input);
    await createEmployeeRecord(session, parsed);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Employee file created." };
  } catch (error) {
    return actionError(error);
  }
}

export async function createNoteAction(input: CreateNoteInput): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createNoteSchema.parse(input);
    await createEmployeeNoteRecord(session, parsed);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(DOCUMENTS_PATH);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Note saved to the employee ledger." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput,
): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = updateEmployeeSchema.parse(input);
    await updateEmployeeRecord(session, parsed);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(`${PEOPLE_PATH}/${parsed.employeeId}`);
    revalidatePath(DOCUMENTS_PATH);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Employee profile updated." };
  } catch (error) {
    return actionError(error);
  }
}
