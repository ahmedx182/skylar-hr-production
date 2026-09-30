"use server";

import { revalidatePath } from "next/cache";
import { BRIEFING_PATH, DOCUMENTS_PATH, PEOPLE_PATH } from "@/constants/routes";
import { AuthorizationError, toErrorResponse } from "@/lib/errors";
import {
  createEmployeeSchema,
  createNoteSchema,
  recordIdSchema,
  updateNoteSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type CreateNoteInput,
  type UpdateNoteInput,
  type UpdateEmployeeInput,
} from "@/schemas/briefing-write.schema";
import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import {
  createEmployeeNoteRecord,
  createEmployeeRecord,
  deleteEmployeeNoteRecord,
  deleteEmployeeRecord,
  updateEmployeeNoteRecord,
  updateEmployeeRecord,
} from "@/server/repositories/briefing-write.repository";

export type CreateActionState =
  | { ok: true; message: string; id?: string }
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
  options: { revalidateBriefing?: boolean } = {},
): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createEmployeeSchema.parse(input);
    const employee = await createEmployeeRecord(session, parsed);
    revalidatePath(PEOPLE_PATH);
    if (options.revalidateBriefing !== false) revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Employee file created.", id: employee.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createNoteAction(
  input: CreateNoteInput,
  options: { revalidateBriefing?: boolean } = {},
): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createNoteSchema.parse(input);
    await createEmployeeNoteRecord(session, parsed);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(DOCUMENTS_PATH);
    if (options.revalidateBriefing !== false) revalidatePath(BRIEFING_PATH);
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

export async function updateNoteAction(input: UpdateNoteInput): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = updateNoteSchema.parse(input);
    const result = await updateEmployeeNoteRecord(session, parsed);
    revalidatePath(DOCUMENTS_PATH);
    revalidatePath(`${DOCUMENTS_PATH}/${parsed.ledgerEntryId}`);
    revalidatePath(`${PEOPLE_PATH}/${result.employeeId}`);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Note updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteNoteAction(ledgerEntryId: string): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = recordIdSchema.parse({ id: ledgerEntryId });
    const result = await deleteEmployeeNoteRecord(session, parsed.id);
    revalidatePath(DOCUMENTS_PATH);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(`${PEOPLE_PATH}/${result.employeeId}`);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Note deleted." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<CreateActionState> {
  try {
    const session = await requireAdmin();
    const parsed = recordIdSchema.parse({ id: employeeId });
    await deleteEmployeeRecord(session, parsed.id);
    revalidatePath(PEOPLE_PATH);
    revalidatePath(DOCUMENTS_PATH);
    revalidatePath(BRIEFING_PATH);
    return { ok: true, message: "Employee file deleted." };
  } catch (error) {
    return actionError(error);
  }
}
