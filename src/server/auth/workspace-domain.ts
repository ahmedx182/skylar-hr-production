import "server-only";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { adminDb } from "@/lib/firebase/admin";
import { emailMatchesDomains, workspaceDomainsSchema } from "@/schemas/workspace-domain.schema";

export async function getWorkspaceDomains(companyId: string): Promise<string[]> {
  const snapshot = await adminDb().collection("companies").doc(companyId).get();
  if (!snapshot.exists) throw new NotFoundError("Workspace not found.");
  return workspaceDomainsSchema.parse(snapshot.get("allowedEmailDomains") ?? []);
}

export async function assertWorkspaceEmailAllowed(companyId: string, email: string): Promise<void> {
  const domains = await getWorkspaceDomains(companyId);
  if (!emailMatchesDomains(email, domains)) {
    throw new AuthorizationError("This email domain is not allowed by your workspace. Update allowed domains in Settings first.");
  }
}
