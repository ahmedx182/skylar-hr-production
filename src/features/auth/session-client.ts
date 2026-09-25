/** Browser calls to the session endpoints. The server cookie is the only session; nothing is stored here. */

export async function createServerSession(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error(`Session request failed (${response.status})`);
}

export async function endServerSession(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Logout request failed (${response.status})`);
}
