import "server-only";
import { NotFoundError } from "@/lib/errors";
import { getCompanyEmployee, listEmployeeLedger } from "@/server/repositories/briefing-read.repository";

const MAX_NOTES = 8;
const MAX_NOTE_CHARS = 1200;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/**
 * The selected person's file as plain text for the manager chat: who they are and their
 * latest saved notes, newest first. Scoped to the caller's workspace; null when the
 * person isn't in it, so the chat still answers without a file.
 */
export async function buildEmployeeFileContext(companyId: string, employeeId: string): Promise<{ name: string; file: string } | null> {
  try {
    const [employee, notes] = await Promise.all([
      getCompanyEmployee(companyId, employeeId),
      listEmployeeLedger(companyId, employeeId),
    ]);

    const profile = [
      `Name: ${employee.name}`,
      employee.jobTitle && `Role: ${employee.jobTitle}`,
      employee.location && `Location: ${employee.location}`,
      employee.summary && `Summary: ${clip(employee.summary, MAX_NOTE_CHARS)}`,
    ].filter(Boolean);

    const noteLines = notes.slice(0, MAX_NOTES).map((note) => {
      const date = note.dateMs ? new Date(note.dateMs).toISOString().slice(0, 10) : "undated";
      return `[${date}, ${note.type}] ${clip(note.description, MAX_NOTE_CHARS)}`;
    });

    const file = [
      profile.join("\n"),
      noteLines.length ? `Saved notes, newest first:\n${noteLines.join("\n\n")}` : "Saved notes: none yet.",
    ].join("\n\n");

    return { name: employee.name, file };
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}
