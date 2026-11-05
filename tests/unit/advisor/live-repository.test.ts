import { beforeEach, describe, expect, it, vi } from "vitest";

// A small in-memory Firestore with subcollections, batches and transactions: just enough for the live chat.
const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  let clock = Date.now();
  let autoId = 0;
  const ts = () => {
    const at = ++clock;
    return { toMillis: () => at, __ts: true };
  };
  const inc = (n: number) => ({ __inc: n });

  const apply = (current: Record<string, unknown>, patch: Record<string, unknown>) => {
    const next = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === "object" && "__inc" in value) next[key] = ((next[key] as number) ?? 0) + (value as { __inc: number }).__inc;
      else next[key] = value;
    }
    return next;
  };

  // Every write bumps the version, so a write that names the version it read can be refused, as Firestore does.
  const versions = new Map<string, number>();
  const bump = (path: string) => versions.set(path, (versions.get(path) ?? 0) + 1);

  const snap = (path: string) => {
    const data = store.get(path);
    return { id: path.split("/").pop()!, exists: data !== undefined, data: () => (data ? { ...data } : undefined), get: (f: string) => data?.[f], updateTime: data ? { v: versions.get(path) ?? 0 } : undefined };
  };

  const docRef = (path: string): any => ({
    id: path.split("/").pop()!,
    path,
    get: async () => snap(path),
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => { bump(path); store.set(path, opts?.merge ? apply(store.get(path) ?? {}, data) : apply({}, data)); },
    update: async (patch: Record<string, unknown>, precondition?: { lastUpdateTime?: { v: number } }) => {
      if (precondition?.lastUpdateTime && (versions.get(path) ?? 0) !== precondition.lastUpdateTime.v) {
        throw Object.assign(new Error("9 FAILED_PRECONDITION: the document was changed"), { code: 9 });
      }
      bump(path);
      if (!store.has(path)) throw new Error(`No document to update: ${path}`);
      // Real Firestore refuses an empty update.
      if (Object.keys(patch).length === 0) throw new Error("At least one field must be updated.");
      store.set(path, apply(store.get(path)!, patch));
    },
    collection: (name: string) => colRef(`${path}/${name}`),
  });

  const query = (path: string, filters: [string, unknown][], order: string | null, max: number): any => ({
    where: (f: string, _op: string, v: unknown) => query(path, [...filters, [f, v]], order, max),
    orderBy: (f: string) => query(path, filters, f, max),
    limit: (n: number) => query(path, filters, order, n),
    select: () => query(path, filters, order, max),
    get: async () => {
      const depth = path.split("/").length + 1;
      let docs = Array.from(store.keys()).filter((k) => k.startsWith(`${path}/`) && k.split("/").length === depth).map((k) => snap(k));
      docs = docs.filter((d) => filters.every(([f, v]) => d.get(f) === v));
      if (order) {
        const val = (d: ReturnType<typeof snap>) => {
          const x = d.get(order) as { toMillis?: () => number } | undefined;
          return x?.toMillis ? x.toMillis() : 0;
        };
        docs.sort((a, b) => val(b) * 0 + (val(a) - val(b)));
      }
      const out = docs.slice(0, max).map((d) => ({ ...d, ref: docRef(`${path}/${d.id}`) }));
      return { docs: out, size: out.length, empty: out.length === 0 };
    },
  });

  const colRef = (path: string): any => ({
    doc: (id?: string) => docRef(`${path}/${id ?? `auto${++autoId}`}`),
    add: async (data: Record<string, unknown>) => docRef(`${path}/auto${++autoId}`).set(data),
    ...query(path, [], null, 1000),
  });

  const db = {
    collection: (name: string) => colRef(name),
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      const checks: (() => void)[] = [];
      return {
        set: (ref: any, data: any, opts?: any) => void ops.push(() => ref.set(data, opts)),
        update: (ref: any, patch: any, precondition?: any) => {
          if (precondition?.lastUpdateTime) checks.push(() => { if ((versions.get(ref.path) ?? 0) !== precondition.lastUpdateTime.v) throw Object.assign(new Error("9 FAILED_PRECONDITION"), { code: 9 }); });
          ops.push(() => ref.update(patch));
        },
        // Like Firestore, all or nothing: every precondition is checked before anything is written.
        // Atomic: nothing awaits between the checks and the writes, so no other commit can slip in.
        commit: async () => {
          checks.forEach((check) => check());
          await Promise.all(ops.map((op) => op()));
        },
      };
    },
    runTransaction: async (fn: (tx: any) => Promise<void>) =>
      fn({
        get: (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
        update: (ref: any, patch: any) => ref.update(patch),
      }),
  };
  return { store, db, ts, inc, notify: vi.fn(), notifyLive: vi.fn(), allowReopen: { value: true } };
});

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => h.ts(), increment: (n: number) => h.inc(n) } }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => h.db }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ ADVISOR_BUSINESS_TIMEZONE: "America/New_York", ADVISOR_ALLOW_REOPEN: h.allowReopen.value }) }));
vi.mock("@/server/email/advisor-escalation-notification", () => ({
  sendAdvisorEscalationNotification: (...a: unknown[]) => h.notify(...a),
  sendLiveReplyNotification: (...a: unknown[]) => h.notifyLive(...a),
}));

import {
  applyAdvisorLiveAction,
  findLiveCaseForEmployee,
  getLiveCaseForAdvisor,
  resetViewAuditThrottle,
  getUserLiveCase,
  listLiveCases,
  reopenUserLiveCase,
  seedLiveThread,
  sendUserLiveMessage,
} from "@/server/repositories/advisor-live.repository";
import { TRANSFER_MESSAGE_AFTER_HOURS, TRANSFER_MESSAGE_IN_HOURS } from "@/features/advisor/live-chat";
import { clearAdvisorSettingsCache } from "@/server/repositories/platform-settings.repository";

const manager = { uid: "mgr1", email: "m@acme.com", displayName: "Maya", companyId: "acme", role: "admin" } as const;
const advisorA = { uid: "advA", email: "a@skylar.app", displayName: "Ana", companyId: "skylar-hr", role: "admin", isHrAdvisor: true } as const;
const advisorB = { uid: "advB", email: "b@skylar.app", displayName: "Ben", companyId: "skylar-hr", role: "admin", isHrAdvisor: true } as const;
const ESC = "advisor_escalations/esc1";

function seedCase(overrides: Record<string, unknown> = {}) {
  h.store.set("companies/acme", { name: "Acme Corp" });
  h.store.set(ESC, {
    companyId: "acme", createdBy: "mgr1", employeeId: "e1", employeeName: "Priya", caseId: "ADV-1",
    question: "Harassment concern", escalationReason: "Potential harassment", responseCommitment: "Reply soon",
    status: "with_advisor", createdAt: h.ts(), ...overrides,
  });
}
const thread = (id = "esc1") => Array.from(h.store.entries()).filter(([k]) => k.startsWith(`advisor_escalations/${id}/messages/`)).map(([, v]) => v);

describe("live advisor chat repository", () => {
  beforeEach(() => {
    h.store.clear();
    h.notify.mockReset().mockResolvedValue({ status: "sent", messageId: "m1" });
    h.notifyLive.mockReset().mockResolvedValue({ status: "sent", messageId: "m2" });
    seedCase();
    h.allowReopen.value = true;
    clearAdvisorSettingsCache();
    vi.useRealTimers();
    // The manager who opened the case is a real, active admin of the workspace.
    h.store.set("users/mgr1", { companyId: "acme", role: "admin", status: "active", email: "m@acme.com" });
  });

  it("opens the thread with the transfer notice and the user's own message", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T15:00:00Z")); // Wednesday 10:00 in New York
    await seedLiveThread("esc1", { text: "He keeps harassing a coworker", authorName: "Maya", authorUid: "mgr1" });
    const messages = thread();
    expect(messages.map((m) => m.sender)).toEqual(["system", "user"]);
    expect(messages[0].text).toBe(TRANSFER_MESSAGE_IN_HOURS);
    expect(messages[1].text).toBe("He keeps harassing a coworker");
  });

  it("uses the working hours a super admin set, not just the defaults", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T15:00:00Z")); // Wednesday 10:00 in New York: inside the default 9-5
    h.store.set("platform_settings/advisor", { hours: { timeZone: "America/New_York", startHour: 18, endHour: 22, workDays: [1, 2, 3, 4, 5] }, freeTrialDays: 14 });
    expect((await getUserLiveCase(manager, "esc1")).afterHours).toBe(true); // now outside the evening shift
    clearAdvisorSettingsCache();
    h.store.set("platform_settings/advisor", { hours: { timeZone: "America/New_York", startHour: 6, endHour: 12, workDays: [3] }, freeTrialDays: 14 });
    expect((await getUserLiveCase(manager, "esc1")).afterHours).toBe(false); // Wednesday morning shift
    clearAdvisorSettingsCache();
    h.store.set("platform_settings/advisor", { hours: { timeZone: "America/New_York", startHour: 6, endHour: 12, workDays: [4] }, freeTrialDays: 14 });
    await seedLiveThread("esc1");
    expect(thread()[0].text).toBe(TRANSFER_MESSAGE_AFTER_HOURS); // Wednesday isn't a working day any more
  });

  it("promises the longer wait when the chat opens outside working hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T15:00:00Z")); // a Saturday
    await seedLiveThread("esc1");
    expect(thread()[0].text).toBe(TRANSFER_MESSAGE_AFTER_HOURS);
    expect((await getUserLiveCase(manager, "esc1")).afterHours).toBe(true);
    vi.setSystemTime(new Date("2026-11-04T15:00:00Z"));
    expect((await getUserLiveCase(manager, "esc1")).afterHours).toBe(false);
  });

  it("lets the first advisor claim, and tells the second it is already taken", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    expect(h.store.get(ESC)).toMatchObject({ claimedByUid: "advA", claimedByName: "Ana" });
    await expect(applyAdvisorLiveAction(advisorB, "esc1", "claim")).rejects.toThrow("Already taken by Ana");
    expect(h.store.get(ESC)).toMatchObject({ claimedByUid: "advA" });
  });

  it("two advisors claiming at once: exactly one wins and the other is told straight away", async () => {
    const results = await Promise.allSettled([applyAdvisorLiveAction(advisorA, "esc1", "claim"), applyAdvisorLiveAction(advisorB, "esc1", "claim")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(loser.reason.message)).toMatch(/Already taken by (Ana|Ben)/);
    expect(thread().filter((m) => /joined the chat/.test(String(m.text)))).toHaveLength(1);
    expect(h.store.get(ESC)!.claimedByUid).toMatch(/^adv[AB]$/);
  });

  it("a double-click reply is two replies, never a lost write", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await Promise.all([applyAdvisorLiveAction(advisorA, "esc1", "reply", "One"), applyAdvisorLiveAction(advisorA, "esc1", "reply", "Two")]);
    expect(thread().filter((m) => m.sender === "advisor").map((m) => m.text).sort()).toEqual(["One", "Two"]);
  });

  it("lets another advisor take over, and the owner release back to the queue", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorB, "esc1", "take_over");
    expect(h.store.get(ESC)).toMatchObject({ claimedByUid: "advB" });
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "release")).rejects.toThrow("don't own");
    await applyAdvisorLiveAction(advisorB, "esc1", "release");
    expect(h.store.get(ESC)).toMatchObject({ claimedByUid: null });
  });

  it("only the owning advisor can reply, and the first reply time is recorded once", async () => {
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hi")).rejects.toThrow("Claim this case");
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await expect(applyAdvisorLiveAction(advisorB, "esc1", "reply", "Hi")).rejects.toThrow("Claim this case");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello Maya, I'm here to help.");
    const first = (h.store.get(ESC)!.firstAdvisorReplyAt as { toMillis(): number }).toMillis();
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "One more thing.");
    expect((h.store.get(ESC)!.firstAdvisorReplyAt as { toMillis(): number }).toMillis()).toBe(first);
    expect(thread().filter((m) => m.sender === "advisor")).toHaveLength(2);
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "reply", "   ")).rejects.toThrow("Write a reply");
  });

  it("the user sees the advisor's reply and who is connected", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello Maya.");
    const chat = await getUserLiveCase(manager, "esc1");
    expect(chat).toMatchObject({ phase: "connected", advisorName: "Ana", canSend: true, canReopen: false });
    expect(chat.messages.map((m) => m.text)).toContain("Hello Maya.");
  });

  it("a user message reaches the thread and the case markers", async () => {
    await sendUserLiveMessage(manager, "esc1", "  Thanks, one more detail  ");
    expect(thread().at(-1)).toMatchObject({ sender: "user", text: "Thanks, one more detail" });
    expect(h.store.get(ESC)).toMatchObject({ lastMessageSender: "user" });
    await expect(sendUserLiveMessage(manager, "esc1", "   ")).rejects.toThrow("Write a message");
  });

  it("resolving closes the chat, logs it to the employee file, and blocks further messages", async () => {
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "resolve")).rejects.toThrow("Claim this case");
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve");
    expect(h.store.get(ESC)).toMatchObject({ status: "resolved", resolvedByUid: "advA" });
    const ledger = Array.from(h.store.entries()).filter(([k]) => k.startsWith("employee_ledger_entries/"));
    expect(ledger).toHaveLength(1);
    expect(ledger[0][1]).toMatchObject({ companyId: "acme", employeeId: "e1", type: "advisor_resolution" });
    await expect(sendUserLiveMessage(manager, "esc1", "Hello?")).rejects.toThrow("closed");
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "claim")).rejects.toThrow("closed");
    expect(await getUserLiveCase(manager, "esc1")).toMatchObject({ phase: "closed", canReopen: true, canSend: false });
  });

  it("closes an unclaimed case, but not one that has an advisor", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await expect(applyAdvisorLiveAction(advisorB, "esc1", "close_unclaimed")).rejects.toThrow("has an advisor");
    await applyAdvisorLiveAction(advisorA, "esc1", "release");
    await applyAdvisorLiveAction(advisorB, "esc1", "close_unclaimed");
    expect(h.store.get(ESC)).toMatchObject({ status: "closed" });
  });

  it("lets the user reopen a closed case at any time: back to the queue, counted, advisors emailed", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve");
    await reopenUserLiveCase(manager, "esc1");

    expect(h.store.get(ESC)).toMatchObject({ status: "with_advisor", claimedByUid: null, reopenCount: 1, resolvedAt: null });
    expect(thread().at(-1)?.text).toBe("Chat reopened. Previously handled by Ana.");
    expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({ caseId: "ADV-1", reopened: true }));
    expect(await getUserLiveCase(manager, "esc1")).toMatchObject({ phase: "waiting", canSend: true });
    // A case that is already open can't be reopened again.
    await expect(reopenUserLiveCase(manager, "esc1")).rejects.toThrow("still open");
    // And it can be claimed and closed again, then reopened a second time.
    await applyAdvisorLiveAction(advisorB, "esc1", "claim");
    await applyAdvisorLiveAction(advisorB, "esc1", "resolve");
    await reopenUserLiveCase(manager, "esc1");
    expect(h.store.get(ESC)).toMatchObject({ reopenCount: 2 });
  });

  it("a failed email does not stop the reopen from being saved", async () => {
    h.notify.mockRejectedValue(new Error("resend down"));
    h.store.set(ESC, { ...h.store.get(ESC)!, status: "resolved" });
    await expect(reopenUserLiveCase(manager, "esc1")).resolves.toBeUndefined();
    expect(h.store.get(ESC)).toMatchObject({ status: "with_advisor" });
  });

  it("keeps another workspace's case invisible", async () => {
    const other = { ...manager, companyId: "globex" };
    await expect(getUserLiveCase(other, "esc1")).rejects.toThrow("not found");
    await expect(sendUserLiveMessage(other, "esc1", "hi")).rejects.toThrow("not found");
    await expect(reopenUserLiveCase(other, "esc1")).rejects.toThrow("not found");
    expect(thread()).toHaveLength(0);
  });

  it("lets another admin in the workspace read the live transcript, read-only", async () => {
    const colleague = { ...manager, uid: "mgr2" };
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "This is what HR said.");
    const seen = await getUserLiveCase(colleague, "esc1");
    expect(seen).toMatchObject({ readOnly: true, canSend: false, canReopen: false, phase: "connected" });
    expect(seen.messages.map((m) => m.text)).toContain("This is what HR said.");
    expect(await getUserLiveCase(manager, "esc1")).toMatchObject({ readOnly: false, canSend: true });
    await expect(sendUserLiveMessage(colleague, "esc1", "hi")).rejects.toThrow("Only the manager");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve");
    await expect(reopenUserLiveCase(colleague, "esc1")).rejects.toThrow("Only the manager");
    expect(h.store.get(ESC)).toMatchObject({ status: "resolved" });
  });

  it("hands a case to the workspace's admins when the manager who opened it is gone, so it is never stranded", async () => {
    const colleague = { ...manager, uid: "mgr2" };
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello from HR.");

    for (const gone of [undefined, { companyId: "acme", role: "admin", status: "suspended" }, { companyId: "acme", role: "employee", status: "active" }, { companyId: "globex", role: "admin", status: "active" }, { companyId: "acme", role: "admin", status: "active", deletedAt: { toMillis: () => 1 } }]) {
      if (gone) h.store.set("users/mgr1", gone); else h.store.delete("users/mgr1");
      const chat = await getUserLiveCase(colleague, "esc1");
      expect(chat.readOnly).toBe(false);
      expect(chat.messages.map((m) => m.text)).toContain("Hello from HR.");
    }
    await expect(sendUserLiveMessage(colleague, "esc1", "I'll take this one")).resolves.toBeUndefined();
    expect(thread().some((m) => m.text === "I'll take this one")).toBe(true);
  });

  it("never gives a case to another workspace's admin, an employee, or a colleague while the opener is still an admin here", async () => {
    h.store.delete("users/mgr1");
    await expect(getUserLiveCase({ ...manager, uid: "x", companyId: "globex" }, "esc1")).rejects.toThrow("not found");
    expect((await getUserLiveCase({ ...manager, uid: "emp", role: "employee" }, "esc1")).readOnly).toBe(true);
    h.store.set("users/mgr1", { companyId: "acme", role: "admin", status: "active" });
    expect((await getUserLiveCase({ ...manager, uid: "mgr2" }, "esc1")).readOnly).toBe(true);
  });

  it("opens the thread from Hold to escalate too, with no opening message", async () => {
    await seedLiveThread("esc1");
    expect(thread().map((m) => m.sender)).toEqual(["system"]);
    expect(h.store.get(ESC)).toMatchObject({ lastMessageSender: "system" });
  });

  it("keeps messages from one batch in order even with the same timestamp", async () => {
    const at = { toMillis: () => 5 };
    h.store.set(`${ESC}/messages/zzz`, { sender: "system", text: "first", createdAt: at, seq: 0 });
    h.store.set(`${ESC}/messages/aaa`, { sender: "user", text: "second", createdAt: at, seq: 1 });
    expect((await getLiveCaseForAdvisor("esc1", advisorA, { audit: false })).messages.map((m) => m.text)).toEqual(["first", "second"]);
  });

  it("shows the advisor the opening messages but doesn't repeat them to the user", async () => {
    await seedLiveThread("esc1", { text: "He keeps harassing a coworker", authorName: "Maya", authorUid: "mgr1" });
    expect((await getLiveCaseForAdvisor("esc1", advisorA, { audit: false })).messages).toHaveLength(2);
    expect((await getUserLiveCase(manager, "esc1")).messages).toHaveLength(0);
  });

  it("doesn't announce an advisor joining twice on a double click", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    expect(thread().filter((m) => m.sender === "system")).toHaveLength(1);
  });

  it("emails the other side when they get a message, at most once in the window", async () => {
    h.store.set("users/mgr1", { email: "m@acme.com" });
    h.store.set("users/advA", { email: "a@skylar.app" });
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "One more thing");
    // One "your advisor has read the case" when they join, one "replied" for the first reply, none for the second.
    expect(h.notifyLive.mock.calls.map(([call]) => call)).toEqual([
      { toEmail: "m@acme.com", caseId: "ADV-1", audience: "user", kind: "reviewed" },
      { toEmail: "m@acme.com", caseId: "ADV-1", audience: "user", kind: "reply" },
    ]);
    expect(h.store.get(ESC)!.userNotifiedAt).toBeTruthy();

    h.notifyLive.mockClear();
    await sendUserLiveMessage(manager, "esc1", "Thanks");
    expect(h.notifyLive).toHaveBeenCalledWith({ toEmail: "a@skylar.app", caseId: "ADV-1", audience: "advisor", kind: "reply" });
  });

  it("a failed email doesn't lose the reply", async () => {
    h.store.set("users/mgr1", { email: "m@acme.com" });
    h.notifyLive.mockRejectedValue(new Error("resend down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await expect(applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello")).resolves.toBeUndefined();
    expect(thread().filter((m) => m.sender === "advisor")).toHaveLength(1);
  });

  it("audits advisors opening and working a case from another workspace", async () => {
    resetViewAuditThrottle();
    await getLiveCaseForAdvisor("esc1", advisorA);
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello");
    await getLiveCaseForAdvisor("esc1", advisorA, { audit: false });
    const audit = Array.from(h.store.entries()).filter(([k]) => k.startsWith("platform_audit_log/")).map(([, v]) => v);
    expect(audit.map((entry) => entry.action)).toEqual(["advisor_view_case", "advisor_claim"]);
    expect(audit[1]).toMatchObject({ companyId: "acme", companyName: "Acme Corp", actorUid: "advA", reason: "Case ADV-1" });
  });

  it("audits every advisor's read on the server, once per case in a while, whichever way it was asked for", async () => {
    resetViewAuditThrottle();
    const audits = () => Array.from(h.store.entries()).filter(([k, v]) => k.startsWith("platform_audit_log/") && v.action === "advisor_view_case").length;
    await getLiveCaseForAdvisor("esc1", advisorA);
    await getLiveCaseForAdvisor("esc1", advisorA);
    await getLiveCaseForAdvisor("esc1", advisorA);
    expect(audits()).toBe(1); // polling or a reconnecting stream doesn't flood the log
    await getLiveCaseForAdvisor("esc1", advisorB);
    expect(audits()).toBe(2); // a different advisor reading it is a different entry
    await getLiveCaseForAdvisor("esc1", advisorB, { audit: false });
    expect(audits()).toBe(2); // the advisor's own follow-up re-read isn't
  });

  it("hides cases from the desk while the workspace or employee file is deleted", async () => {
    h.store.set("companies/globex", { name: "Globex", status: "deleted" });
    h.store.set("advisor_escalations/gone", { ...h.store.get(ESC)!, companyId: "globex", caseId: "ADV-2" });
    h.store.set("employees/e9", { deletedAt: { toMillis: () => 1 } });
    h.store.set("advisor_escalations/firedFile", { ...h.store.get(ESC)!, employeeId: "e9", caseId: "ADV-3" });
    expect((await listLiveCases()).map((c) => c.caseId)).toEqual(["ADV-1"]);
  });

  it("gives the advisor the earlier chat with Skylar for that employee only", async () => {
    h.store.set("skylar_conversations/acme__mgr1__employee:e1", {
      companyId: "acme",
      userId: "mgr1",
      messages: [{ role: "user", text: "How do I raise this?", createdAtMs: 1 }, { role: "assistant", text: "Start with facts.", createdAtMs: 2 }],
    });
    expect((await getLiveCaseForAdvisor("esc1", advisorA, { audit: false })).earlierChat.map((m) => m.text)).toEqual(["How do I raise this?", "Start with facts."]);
  });

  it("records a false alarm on resolve, and clears it if the case is reopened", async () => {
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await expect(applyAdvisorLiveAction(advisorB, "esc1", "resolve_false_alarm")).rejects.toThrow("Claim this case");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve_false_alarm");
    expect(h.store.get(ESC)).toMatchObject({ status: "resolved", falseAlarm: true });
    await reopenUserLiveCase(manager, "esc1");
    expect(h.store.get(ESC)).toMatchObject({ falseAlarm: false });
  });

  it("does not let a manager reopen a closed case unless it is switched on: they start a new chat", async () => {
    h.allowReopen.value = false;
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve");
    await expect(reopenUserLiveCase(manager, "esc1")).rejects.toThrow("Start a new chat with HR instead");
    expect(h.store.get(ESC)).toMatchObject({ status: "resolved" });
  });

  it("emails the manager as soon as an advisor has read the case, separately from replies", async () => {
    h.store.set("users/mgr1", { companyId: "acme", role: "admin", status: "active", email: "m@acme.com" });
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    expect(h.notifyLive).toHaveBeenCalledWith({ toEmail: "m@acme.com", caseId: "ADV-1", audience: "user", kind: "reviewed" });
    await applyAdvisorLiveAction(advisorA, "esc1", "reply", "Hello");
    expect(h.notifyLive).toHaveBeenLastCalledWith({ toEmail: "m@acme.com", caseId: "ADV-1", audience: "user", kind: "reply" });
  });

  it("finds this manager's latest case for an employee, and whether a person owns it", async () => {
    h.store.set("advisor_escalations/old", { ...h.store.get(ESC)!, status: "resolved", createdAt: { toMillis: () => 1 } });
    h.store.set("advisor_escalations/other", { ...h.store.get(ESC)!, createdBy: "mgr2", createdAt: { toMillis: () => 99999 } });
    h.store.set("advisor_escalations/otherEmp", { ...h.store.get(ESC)!, employeeId: "e2", createdAt: { toMillis: () => 99999 } });
    expect(await findLiveCaseForEmployee(manager, "e1")).toEqual({ id: "esc1", caseId: "ADV-1", isOpen: true, closedAtMs: null });
    await applyAdvisorLiveAction(advisorA, "esc1", "claim");
    await applyAdvisorLiveAction(advisorA, "esc1", "resolve");
    expect(await findLiveCaseForEmployee(manager, "e1")).toMatchObject({ id: "esc1", isOpen: false, closedAtMs: expect.any(Number) });
    expect(await findLiveCaseForEmployee(manager, "nobody")).toBeNull();
  });

  it("shows advisors cases from every workspace with the company name and first-reply time", async () => {
    h.store.set("companies/globex", { name: "Globex" });
    h.store.set("advisor_escalations/esc2", { ...h.store.get(ESC)!, companyId: "globex", caseId: "ADV-2", createdBy: "mgr9" });
    const cases = await listLiveCases();
    expect(cases.map((c) => [c.caseId, c.companyName, c.phase]).sort()).toEqual([["ADV-1", "Acme Corp", "waiting"], ["ADV-2", "Globex", "waiting"]]);
    const detail = await getLiveCaseForAdvisor("esc1", advisorA, { audit: false });
    expect(detail.case.companyName).toBe("Acme Corp");
    await expect(getLiveCaseForAdvisor("missing", advisorA)).rejects.toThrow("not found");
  });
});
