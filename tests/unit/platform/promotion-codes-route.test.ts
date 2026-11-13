import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  setPromotionCodeActive: vi.fn(),
  createPromotionCode: vi.fn(),
  replacePromotionCode: vi.fn(),
  recordPromotionCodeChange: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/auth/require-session", () => ({ requireSession: () => mocks.requireSession(), requirePageSession: () => mocks.requireSession() }));
vi.mock("@/server/stripe/promotion-codes", () => ({ setPromotionCodeActive: (...args: unknown[]) => mocks.setPromotionCodeActive(...args),
  createPromotionCode: (...args: unknown[]) => mocks.createPromotionCode(...args),
  replacePromotionCode: (...args: unknown[]) => mocks.replacePromotionCode(...args),
}));
vi.mock("@/server/repositories/pricing.repository", () => ({ recordPromotionCodeChange: (...args: unknown[]) => mocks.recordPromotionCodeChange(...args) }));

import { POST } from "@/app/api/platform/promotion-codes/route";
import { PATCH, PUT } from "@/app/api/platform/promotion-codes/[promotionCodeId]/route";
import { describeDiscount, promotionCodeState, type PromotionCodeSummary } from "@/features/pricing/promotion-code";

const staff = { uid: "staff-1", email: "ops@skylar.app", companyId: "skylar", role: "admin", isPlatformAdmin: true };
const context = { params: { promotionCodeId: "promo_123" } };

function req(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/platform/promotion-codes/promo_123", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", origin, host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("platform promotion code route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.setPromotionCodeActive.mockResolvedValue({ id: "promo_123", code: "FREE30", active: false });
  });

  it("switches the code in Stripe and records who did it", async () => {
    const response = await PATCH(req({ active: false }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "promo_123", code: "FREE30", active: false });
    expect(mocks.setPromotionCodeActive).toHaveBeenCalledWith("promo_123", false);
    expect(mocks.recordPromotionCodeChange).toHaveBeenCalledWith({ id: "promo_123", code: "FREE30", active: false }, "deactivate", staff);
  });

  it("rejects a malformed id and a non-boolean body before touching Stripe", async () => {
    expect((await PATCH(req({ active: false }), { params: { promotionCodeId: "../coupons/x" } })).status).toBe(400);
    expect((await PATCH(req({ active: "no" }), context)).status).toBe(400);
    expect(mocks.setPromotionCodeActive).not.toHaveBeenCalled();
  });

  it("is closed to workspace admins and cross-origin requests", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await PATCH(req({ active: true }), context)).status).toBe(403);

    mocks.requireSession.mockResolvedValue(staff);
    expect((await PATCH(req({ active: true }, "https://evil.example"), context)).status).toBe(403);
    expect(mocks.setPromotionCodeActive).not.toHaveBeenCalled();
  });
});

describe("platform promotion code creation", () => {
  const body = { code: "free30", percentOff: 100, duration: "repeating", durationInMonths: 1, expiresAtMs: Date.now() + 86_400_000, maxRedemptions: null };
  const created = { id: "promo_9", code: "FREE30", percentOff: 100, duration: "repeating", durationInMonths: 1, amountOffCents: null, currency: null };

  function post(payload: unknown, origin = "http://localhost") {
    return new Request("http://localhost/api/platform/promotion-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin, host: "localhost" },
      body: JSON.stringify(payload),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.createPromotionCode.mockResolvedValue(created);
  });

  it("creates the code with its expiry, upper-cased, and records it", async () => {
    const response = await POST(post(body));

    expect(response.status).toBe(201);
    expect(mocks.createPromotionCode).toHaveBeenCalledWith(expect.objectContaining({ code: "FREE30", expiresAtMs: body.expiresAtMs }));
    expect(mocks.recordPromotionCodeChange).toHaveBeenCalledWith(created, "create", staff, "100% off for 1 month");
  });

  it("rejects a past expiry, a missing month count and a bad code", async () => {
    expect((await POST(post({ ...body, expiresAtMs: Date.now() - 1000 }))).status).toBe(400);
    expect((await POST(post({ ...body, durationInMonths: null }))).status).toBe(400);
    expect((await POST(post({ ...body, code: "no spaces" }))).status).toBe(400);
    expect(mocks.createPromotionCode).not.toHaveBeenCalled();
  });

  it("is closed to workspace admins and cross-origin requests", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await POST(post(body))).status).toBe(403);
    mocks.requireSession.mockResolvedValue(staff);
    expect((await POST(post(body, "https://evil.example"))).status).toBe(403);
    expect(mocks.createPromotionCode).not.toHaveBeenCalled();
  });
});

describe("platform promotion code editing", () => {
  const body = { code: "free30", percentOff: 100, duration: "repeating", durationInMonths: 2, expiresAtMs: Date.now() + 86_400_000, maxRedemptions: 20 };
  const created = { id: "promo_new", code: "FREE30", percentOff: 100, duration: "repeating", durationInMonths: 2, amountOffCents: null, currency: null };

  function put(payload: unknown, origin = "http://localhost") {
    return new Request("http://localhost/api/platform/promotion-codes/promo_123", {
      method: "PUT",
      headers: { "Content-Type": "application/json", origin, host: "localhost" },
      body: JSON.stringify(payload),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(staff);
    mocks.replacePromotionCode.mockResolvedValue({ created, replacedCode: "FREE30" });
  });

  it("replaces the code in Stripe and records what it replaced", async () => {
    const response = await PUT(put(body), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "promo_new", code: "FREE30" });
    expect(mocks.replacePromotionCode).toHaveBeenCalledWith("promo_123", expect.objectContaining({ code: "FREE30", durationInMonths: 2, maxRedemptions: 20 }));
    expect(mocks.recordPromotionCodeChange).toHaveBeenCalledWith(created, "replace", staff, "Replaces FREE30: 100% off for 2 months");
  });

  it("rejects a malformed id, a past expiry and a missing month count before touching Stripe", async () => {
    expect((await PUT(put(body), { params: { promotionCodeId: "../x" } })).status).toBe(400);
    expect((await PUT(put({ ...body, expiresAtMs: Date.now() - 1000 }), context)).status).toBe(400);
    expect((await PUT(put({ ...body, durationInMonths: null }), context)).status).toBe(400);
    expect(mocks.replacePromotionCode).not.toHaveBeenCalled();
  });

  it("is closed to workspace admins and cross-origin requests", async () => {
    mocks.requireSession.mockResolvedValue({ ...staff, isPlatformAdmin: false });
    expect((await PUT(put(body), context)).status).toBe(403);
    mocks.requireSession.mockResolvedValue(staff);
    expect((await PUT(put(body, "https://evil.example"), context)).status).toBe(403);
    expect(mocks.replacePromotionCode).not.toHaveBeenCalled();
  });
});

const base: PromotionCodeSummary = {
  id: "promo_1",
  code: "FREE30",
  active: true,
  couponValid: true,
  couponName: null,
  percentOff: 100,
  amountOffCents: null,
  currency: null,
  duration: "repeating",
  durationInMonths: 1,
  timesRedeemed: 0,
  maxRedemptions: null,
  expiresAtMs: null,
};

describe("promotion code helpers", () => {
  it("describes the discount", () => {
    expect(describeDiscount(base)).toBe("100% off for 1 month");
    expect(describeDiscount({ ...base, percentOff: null, amountOffCents: 2000, currency: "usd", duration: "once" })).toBe("$20 off on the first payment");
    expect(describeDiscount({ ...base, percentOff: 25, duration: "forever" })).toBe("25% off forever");
  });

  it("treats an invalid coupon or past expiry as expired, otherwise follows the switch", () => {
    expect(promotionCodeState(base)).toBe("active");
    expect(promotionCodeState({ ...base, active: false })).toBe("off");
    expect(promotionCodeState({ ...base, couponValid: false })).toBe("expired");
    expect(promotionCodeState({ ...base, expiresAtMs: 1000 }, 2000)).toBe("expired");
  });
});
