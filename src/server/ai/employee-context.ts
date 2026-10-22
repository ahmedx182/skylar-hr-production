import "server-only";
import { NotFoundError } from "@/lib/errors";
import { getCompanyEmployee, listEmployeeLedger } from "@/server/repositories/briefing-read.repository";

/** Room for every note on a normal file; only very long histories lose their oldest entries. */
const MAX_FILE_CHARS = 24_000;

/**
 * The selected person's full file as plain text for the manager chat: who they are and
 * every saved note, newest first. Chat transcripts are left out because the conversation
 * history already carries them. Scoped to the caller's workspace; null when the person
 * isn't in it, so the chat still answers without a file.
 */
export async function buildEmployeeFileContext(companyId: string, employeeId: string): Promise<{ name: string; file: string } | null> {
  try {
    const [employee, entries] = await Promise.all([
      getCompanyEmployee(companyId, employeeId),
      listEmployeeLedger(companyId, employeeId),
    ]);

    const profile = [
      `Name: ${employee.name}`,
      employee.jobTitle && `Role: ${employee.jobTitle}`,
      employee.location && `Location: ${employee.location}`,
      employee.email && `Email: ${employee.email}`,
      employee.summary && `File summary: ${employee.summary}`,
    ].filter(Boolean).join("\n");

    const notes = entries.filter((entry) => entry.type !== "conversation");
    const noteLines: string[] = [];
    let used = profile.length;
    for (const note of notes) {
      const date = note.dateMs ? new Date(note.dateMs).toISOString().slice(0, 10) : "undated";
      const flags = [note.statusDot === "red" && "high risk", note.isEscalated && "escalated to advisor"].filter(Boolean).join(", ");
      const line = `[${date}, ${note.type}${flags ? `, ${flags}` : ""}]\n${note.description.trim()}`;
      if (used + line.length > MAX_FILE_CHARS) break;
      noteLines.push(line);
      used += line.length;
    }
    const omitted = notes.length - noteLines.length;

    const file = [
      profile,
      noteLines.length
        ? `All saved notes (${notes.length}), newest first:\n\n${noteLines.join("\n\n")}${omitted ? `\n\n(${omitted} older notes not shown.)` : ""}`
        : "Saved notes: none yet.",
    ].join("\n\n");

    return { name: employee.name, file };
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}
