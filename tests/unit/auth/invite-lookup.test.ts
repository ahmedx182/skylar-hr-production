import { describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const query: Record<string, unknown> = {};
for (const method of ["where", "limit"]) query[method] = (...args: unknown[]) => (calls.push(`${method}:${args.join(",")}`), query);
// Production Firestore needs a composite index for any orderBy next to these filters, and the project has none.
query.orderBy = () => { throw new Error("orderBy would need a composite index"); };
query.get = async () => ({ docs: [] });

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => ({ collection: () => query }) }));

import { findPendingInviteByEmail } from "@/server/repositories/invite.repository";

describe("findPendingInviteByEmail", () => {
  it("looks up by equality filters only, so it works without a composite index", async () => {
    await expect(findPendingInviteByEmail("  Ahmed@Gmail.com ")).resolves.toBeNull();
    expect(calls).toEqual(["where:email,==,ahmed@gmail.com", "where:status,==,pending", "limit:2"]);
  });
});
