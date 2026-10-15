import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createPackage: vi.fn(),
  updatePackage: vi.fn(),
  setPackageArchived: vi.fn(),
  getPackage: vi.fn(),
  syncPackageToStripe: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => mocks.requireSession(), requirePageSession: () => mocks.requireSession() }));
vi.mock("@/server/repositories/pricing.repository", () => ({
  createPackage: (...args: unknown[]) => mocks.createPackage(...args),
  updatePackage: (...args: unknown[]) => mocks.updatePackage(...args),
  setPackageArchived: (...args: unknown[]) => mocks.setPackageArchived(...args),
  getPackage: (...args: unknown[]) => mocks.getPackage(...args),
}));
vi.mock("@/server/stripe/pricing-sync", () => ({ syncPackageToStripe: (...args: unknown[]) => mocks.syncPackageToStripe(...args) }));

import { POST as create } from "@/app/api/platform/pricing/route";
import { POST as act, PUT as update } from "@/app/api/platform/pricing/[packageId]/route";

const staff = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const synced = { status: "synced", stripePriceId: "price_new", createdNewPrice: true };
const valid = { name: "Team", priceUsd: 99, interval: "month", features: ["Everything"], highlighted: false, published: true, sortOrder: 2 };

function req(method: string, body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/platform/pricing", {
    method,
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("platform pricing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.createPackage.mockResolvedValue({ id: "pkg_1", name: "Team" });
    mocks.updatePackage.mockResolvedValue({ id: "pkg_1", name: "Team" });
    mocks.getPackage.mockResolvedValue({ id: "pkg_1", name: "Team" });
    mocks.setPackageArchived.mockResolvedValue({ id: "pkg_1", name: "Team" });
    mocks.syncPackageToStripe.mockResolvedValue(synced);
  });

  it("creates a package in cents and syncs it to Stripe", async () => {
    const response = await create(req("POST", valid));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ packageId: "pkg_1", stripe: synced });
    expect(mocks.createPackage).toHaveBeenCalledWith(expect.objectContaining({ name: "Team", priceCents: 9900, advisorMessageLimit: null }), staff);
    expect(mocks.syncPackageToStripe).toHaveBeenCalled();
  });

  it("keeps the package when Stripe fails and reports it", async () => {
    mocks.syncPackageToStripe.mockResolvedValue({ status: "failed", message: "Stripe is down" });

    const response = await create(req("POST", valid));

    expect(response.status).toBe(201);
    expect((await response.json()).stripe).toEqual({ status: "failed", message: "Stripe is down" });
  });

  it("rejects a paid package under 50 cents", async () => {
    const response = await create(req("POST", { ...valid, priceUsd: 0.1 }));

    expect(response.status).toBe(400);
    expect(mocks.createPackage).not.toHaveBeenCalled();
  });

  it("updates a package and forces the Free package to stay $0", async () => {
    const response = await update(req("PUT", { ...valid, name: "Free", priceUsd: 25, advisorMessageLimit: 7 }), { params: { packageId: "free" } });

    expect(response.status).toBe(200);
    expect(mocks.updatePackage).toHaveBeenCalledWith("free", expect.objectContaining({ priceCents: 0, advisorMessageLimit: 7 }), staff);
  });

  it("archives, restores and re-syncs", async () => {
    const context = { params: { packageId: "pkg_1" } };

    await act(req("POST", { action: "archive" }), context);
    await act(req("POST", { action: "restore" }), context);
    const sync = await act(req("POST", { action: "sync" }), context);

    expect(mocks.setPackageArchived).toHaveBeenNthCalledWith(1, "pkg_1", true, staff);
    expect(mocks.setPackageArchived).toHaveBeenNthCalledWith(2, "pkg_1", false, staff);
    expect((await sync.json()).stripe).toEqual(synced);
  });

  it("rejects unknown actions", async () => {
    expect((await act(req("POST", { action: "explode" }), { params: { packageId: "pkg_1" } })).status).toBe(400);
  });

  it("is closed to workspace admins and cross-origin requests", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await create(req("POST", valid))).status).toBe(403);
    expect((await update(req("PUT", valid), { params: { packageId: "pkg_1" } })).status).toBe(403);

    mocks.requireSession.mockResolvedValue(staff);
    expect((await create(req("POST", valid, "https://evil.example"))).status).toBe(403);
    expect(mocks.createPackage).not.toHaveBeenCalled();
    expect(mocks.updatePackage).not.toHaveBeenCalled();
  });
});
