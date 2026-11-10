import { friendlyName } from "@/lib/person-name";

/** What an HR advisor last did on a case, shown to the manager as a notification. */
export type AdvisorActivityKind = "joined" | "reply" | "closed" | "released";

/** One case, as the manager's notification stream sees it. */
export type CaseNotice = {
  escalationId: string;
  caseId: string;
  employeeId: string;
  employeeName: string;
  phase: "waiting" | "connected" | "closed";
  advisorName: string | null;
  /** When the advisor last did something the manager should hear about. */
  activityAtMs: number | null;
  activityKind: AdvisorActivityKind | null;
};

export type SeenMap = Record<string, number>;

/** Cases with advisor activity the manager hasn't looked at. `since` hides anything from before they started using this. */
export function unreadNotices(notices: CaseNotice[], seen: SeenMap, since: number): CaseNotice[] {
  return notices.filter((notice) => notice.activityAtMs !== null && notice.activityAtMs > Math.max(seen[notice.escalationId] ?? 0, since));
}

/** Activity that is new compared with the last list we had, for pop-up alerts. Nothing on the first list. */
export function freshActivity(previous: CaseNotice[] | null, next: CaseNotice[]): CaseNotice[] {
  if (previous === null) return [];
  const before = new Map(previous.map((notice) => [notice.escalationId, notice.activityAtMs ?? 0]));
  return next.filter((notice) => notice.activityAtMs !== null && notice.activityAtMs > (before.get(notice.escalationId) ?? 0));
}

export function noticeText(notice: CaseNotice): { title: string; body: string } {
  const who = notice.advisorName ? friendlyName(notice.advisorName) : "An HR advisor";
  const about = notice.employeeName;
  switch (notice.activityKind) {
    case "joined":
      return { title: `${who} has read your case`, body: `Skylar HR is reviewing the case about ${about}.` };
    case "closed":
      return { title: `${who} closed the chat`, body: `Your HR chat about ${about} was closed. Start a new chat if you need more help.` };
    case "released":
      return { title: "Your chat is back in the queue", body: `${who} handed over the chat about ${about}. Another advisor will pick it up.` };
    default:
      return { title: `${who} replied`, body: `New message from Skylar HR about ${about}.` };
  }
}

/** The state of one case on the HR desk, for deciding what needs an alert. */
export type DeskCaseState = {
  id: string;
  phase: "waiting" | "connected" | "closed";
  claimedByUid: string | null;
  lastMessageAtMs: number | null;
  lastMessageSender: "user" | "advisor" | "system" | null;
  employeeName: string;
  companyName: string;
};

export type DeskAlert = { id: string; title: string; body: string; kind: "new_case" | "user_message" };

/**
 * What an HR advisor should be alerted about when the desk list changes: a chat nobody has claimed, or the manager
 * writing on a chat this advisor owns. Nothing on the first list, and nothing for chats someone else owns.
 */
export function deskAlerts(previous: DeskCaseState[] | null, next: DeskCaseState[], advisorUid: string): DeskAlert[] {
  if (previous === null) return [];
  const before = new Map(previous.map((item) => [item.id, item]));
  const alerts: DeskAlert[] = [];
  for (const item of next) {
    if (item.phase === "closed") continue;
    const old = before.get(item.id);
    const becameWaiting = item.phase === "waiting" && (!old || old.phase !== "waiting");
    if (becameWaiting) {
      alerts.push({ id: item.id, kind: "new_case", title: "New chat waiting", body: `${item.employeeName} at ${item.companyName} needs an HR advisor.` });
      continue;
    }
    const wroteAgain =
      item.claimedByUid === advisorUid &&
      item.lastMessageSender === "user" &&
      (item.lastMessageAtMs ?? 0) > (old?.lastMessageAtMs ?? 0);
    if (wroteAgain) alerts.push({ id: item.id, kind: "user_message", title: "New message", body: `${item.employeeName} at ${item.companyName} replied.` });
  }
  return alerts;
}

/** How many chats need this advisor: unclaimed, or owned by them with the manager's message last. */
export function deskAttentionCount(items: DeskCaseState[], advisorUid: string): number {
  return items.filter((item) => item.phase === "waiting" || (item.phase === "connected" && item.claimedByUid === advisorUid && item.lastMessageSender === "user")).length;
}
