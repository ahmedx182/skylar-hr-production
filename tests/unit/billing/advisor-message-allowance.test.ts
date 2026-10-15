import { beforeEach, describe, expect, it, vi } from "vitest";

type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();

type Increment = { __increment: number };

function applyWrite(id: string, data: Doc) {
  const next: Doc = { ...(store.get(id) ?? {}) };
  for (const [key, value] of Object.entries(data)) {
    const increment = (value as Increment | undefined)?.__increment;
    next[key] = typeof increment === "number" ? Number(next[key] ?? 0) + increment : value;
  }
  store.set(id, next);
}

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => "server-time",
  },
  Timestamp: class {
    static fromMillis(ms: number) {
      return { toMillis: () => ms };
    }
  },
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({
        id,
        set: async (data: Doc) => applyWrite(id, data),
      }),
    }),
    runTransaction: async (fn: (transaction: unknown) => Promise<unknown>) =>
      fn({
        get: async (ref: { id: string }) => ({
          exists: store.has(ref.id),
          data: () => store.get(ref.id),
        }),
        set: (ref: { id: string }, data: Doc) => applyWrite(ref.id, data),
      }),
  }),
}));

import { PaymentRequiredError } from "@/lib/errors";
import {
  releaseAdvisorMessage,
  reserveAdvisorMessage,
} from "@/server/repositories/billing.repository";

const session = { companyId: "acme" };

describe("reserveAdvisorMessage", () => {
  beforeEach(() => store.clear());

  it("lets a brand-new workspace send five messages, then asks for payment", async () => {
    for (let sent = 1; sent <= 5; sent += 1) {
      await expect(reserveAdvisorMessage(session)).resolves.toEqual({ reserved: true });
      expect(store.get("acme")?.freeMessagesUsed).toBe(sent);
    }

    await expect(reserveAdvisorMessage(session)).rejects.toBeInstanceOf(PaymentRequiredError);
    expect(store.get("acme")?.freeMessagesUsed).toBe(5);
  });

  it("answers with a 402 payment_required error", async () => {
    store.set("acme", { status: "free", freeMessagesUsed: 5 });

    await expect(reserveAdvisorMessage(session)).rejects.toMatchObject({
      status: 402,
      code: "payment_required",
    });
  });

  it("never limits or counts a paid workspace", async () => {
    store.set("acme", { status: "active", freeMessagesUsed: 5 });

    await expect(reserveAdvisorMessage(session)).resolves.toEqual({ reserved: false });
    expect(store.get("acme")?.freeMessagesUsed).toBe(5);
  });

  it("lets a canceled subscription fall back to the free allowance", async () => {
    store.set("acme", { status: "canceled", freeMessagesUsed: 5 });

    await expect(reserveAdvisorMessage(session)).rejects.toBeInstanceOf(PaymentRequiredError);
  });

  it("gives a message back when it was never answered", async () => {
    await reserveAdvisorMessage(session);
    await releaseAdvisorMessage(session);

    expect(store.get("acme")?.freeMessagesUsed).toBe(0);
  });
});
