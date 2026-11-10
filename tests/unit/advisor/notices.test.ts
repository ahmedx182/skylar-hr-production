import { describe, expect, it } from "vitest";
import {
  deskAlerts,
  deskAttentionCount,
  freshActivity,
  noticeText,
  unreadNotices,
  type CaseNotice,
  type DeskCaseState,
} from "@/features/advisor/notices";

const notice = (over: Partial<CaseNotice> = {}): CaseNotice => ({
  escalationId: "e1", caseId: "ADV-1", employeeId: "emp1", employeeName: "Priya Shah", phase: "connected",
  advisorName: "Ana", activityAtMs: 1000, activityKind: "reply", ...over,
});

describe("manager notifications", () => {
  it("counts only activity newer than what they've seen and than when they started", () => {
    const list = [notice({ escalationId: "a", activityAtMs: 500 }), notice({ escalationId: "b", activityAtMs: 2000 }), notice({ escalationId: "c", activityAtMs: null })];
    expect(unreadNotices(list, {}, 1000).map((n) => n.escalationId)).toEqual(["b"]);
    expect(unreadNotices(list, { b: 2000 }, 1000)).toEqual([]);
    expect(unreadNotices(list, { b: 1500 }, 0).map((n) => n.escalationId)).toEqual(["a", "b"]);
  });

  it("alerts only on activity that is new compared with the previous list", () => {
    const before = [notice({ activityAtMs: 1000 })];
    expect(freshActivity(null, before)).toEqual([]);
    expect(freshActivity(before, before)).toEqual([]);
    expect(freshActivity(before, [notice({ activityAtMs: 3000 })])).toHaveLength(1);
    expect(freshActivity([], before)).toHaveLength(1);
  });

  it("says what happened, in plain words", () => {
    expect(noticeText(notice({ activityKind: "joined" })).title).toBe("Ana has read your case");
    expect(noticeText(notice({ activityKind: "reply" })).title).toBe("Ana replied");
    expect(noticeText(notice({ activityKind: "closed" })).body).toContain("new chat");
    expect(noticeText(notice({ activityKind: "closed" })).body).not.toContain("reopen");
    expect(noticeText(notice({ activityKind: "released", advisorName: null })).title).toContain("back in the queue");
    expect(noticeText(notice({ advisorName: null })).title).toBe("An HR advisor replied");
  });
});

const desk = (over: Partial<DeskCaseState> = {}): DeskCaseState => ({
  id: "c1", phase: "waiting", claimedByUid: null, lastMessageAtMs: 1000, lastMessageSender: "system", employeeName: "Priya", companyName: "Acme", ...over,
});

describe("HR desk alerts", () => {
  it("alerts on a chat that newly needs an advisor, not on the first list", () => {
    expect(deskAlerts(null, [desk()], "me")).toEqual([]);
    expect(deskAlerts([], [desk()], "me")).toEqual([expect.objectContaining({ kind: "new_case", id: "c1" })]);
    expect(deskAlerts([desk()], [desk()], "me")).toEqual([]);
  });

  it("alerts when the chat goes back to waiting, for example after a release or a reopen", () => {
    expect(deskAlerts([desk({ phase: "connected", claimedByUid: "me" })], [desk()], "me")).toHaveLength(1);
    expect(deskAlerts([desk({ phase: "closed" })], [desk()], "me")).toHaveLength(1);
  });

  it("alerts when the manager writes on a chat this advisor owns, but not on someone else's", () => {
    const mine = desk({ phase: "connected", claimedByUid: "me", lastMessageSender: "user", lastMessageAtMs: 2000 });
    expect(deskAlerts([{ ...mine, lastMessageAtMs: 1000, lastMessageSender: "advisor" }], [mine], "me")).toEqual([expect.objectContaining({ kind: "user_message" })]);
    expect(deskAlerts([{ ...mine, lastMessageAtMs: 1000 }], [{ ...mine, claimedByUid: "someone-else" }], "me")).toEqual([]);
    expect(deskAlerts([mine], [mine], "me")).toEqual([]);
  });

  it("stays quiet about closed chats", () => {
    expect(deskAlerts([], [desk({ phase: "closed" })], "me")).toEqual([]);
  });

  it("counts the chats that need this advisor", () => {
    const items = [
      desk({ id: "1" }),
      desk({ id: "2", phase: "connected", claimedByUid: "me", lastMessageSender: "user" }),
      desk({ id: "3", phase: "connected", claimedByUid: "me", lastMessageSender: "advisor" }),
      desk({ id: "4", phase: "connected", claimedByUid: "other", lastMessageSender: "user" }),
      desk({ id: "5", phase: "closed" }),
    ];
    expect(deskAttentionCount(items, "me")).toBe(2);
  });
});
