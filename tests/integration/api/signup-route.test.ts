import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/signup/route";

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("owner signup preflight", () => {
  beforeEach(() => vi.resetAllMocks());

  it("checks the normalized work email without creating a session", async () => {
    const response = await POST(request({ email: " Owner@Example.com ", companyName: "Example" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowed: true });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("allows owner signup from any email domain", async () => {
    const response = await POST(request({ email: "owner@example.com", companyName: "Example" }));
    expect(response.status).toBe(200);
  });

  it("rejects incomplete workspace details", async () => {
    const response = await POST(request({ email: "owner@example.com", companyName: "" }));
    expect(response.status).toBe(400);
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(request({ email: "owner@example.com", companyName: "Example" }, "https://other.test"));
    expect(response.status).toBe(403);
  });
});
