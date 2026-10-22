import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({ getCompanyEmployee: vi.fn(), listEmployeeLedger: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/briefing-read.repository", () => mocks);

import { buildEmployeeFileContext } from "@/server/ai/employee-context";

const employee = { id: "e1", name: "topg", jobTitle: "Engineer", location: null, summary: null };

describe("buildEmployeeFileContext", () => {
  beforeEach(() => vi.resetAllMocks());

  it("includes the person's saved notes, newest first", async () => {
    mocks.getCompanyEmployee.mockResolvedValue(employee);
    mocks.listEmployeeLedger.mockResolvedValue([
      { type: "note", description: "Situation: I need to have a hard performance conversation", dateMs: Date.UTC(2026, 9, 22) },
      { type: "note", description: "Older note", dateMs: Date.UTC(2026, 9, 1) },
    ]);

    const context = await buildEmployeeFileContext("tenant-a", "e1");

    expect(mocks.getCompanyEmployee).toHaveBeenCalledWith("tenant-a", "e1");
    expect(context?.name).toBe("topg");
    expect(context?.file).toContain("Role: Engineer");
    expect(context?.file).toContain("[2026-10-22, note] Situation: I need to have a hard performance conversation");
    expect(context!.file.indexOf("hard performance")).toBeLessThan(context!.file.indexOf("Older note"));
  });

  it("says when there are no notes yet", async () => {
    mocks.getCompanyEmployee.mockResolvedValue(employee);
    mocks.listEmployeeLedger.mockResolvedValue([]);

    expect((await buildEmployeeFileContext("tenant-a", "e1"))?.file).toContain("Saved notes: none yet.");
  });

  it("returns null for someone outside the caller's workspace", async () => {
    mocks.getCompanyEmployee.mockRejectedValue(new NotFoundError("Employee not found."));
    mocks.listEmployeeLedger.mockRejectedValue(new NotFoundError("Employee not found."));

    expect(await buildEmployeeFileContext("tenant-a", "foreign")).toBeNull();
  });
});
