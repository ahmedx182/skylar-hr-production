import type { AdvisorEscalationRecord } from "./escalation-queue";

type Status = AdvisorEscalationRecord["status"];

/** What the person in the chat sees about their case. */
export type LiveChatPhase = "waiting" | "connected" | "closed";

export type LiveChatMessage = {
  id: string;
  sender: "user" | "advisor" | "system";
  text: string;
  authorName: string | null;
  createdAtMs: number;
};

export const LIVE_MESSAGE_MAX_LENGTH = 2000;

/**
 * The fixed message the assistant gives when a chat moves to a person, worded by Skylar. It never advises on the
 * matter itself, only on what is safe to do while waiting. Outside working hours the wait is longer, and it says so.
 */
export const TRANSFER_MESSAGE_IN_HOURS =
  "We believe that this issue requires an escalation to one of our Live (Human) HR Advisors. We are transferring this now to your advisor. It may take up to an hour for the advisor to respond. You may leave the app and you will be notified when your advisor has read the case. In the meantime, hold off acting, write down all the facts and dates, keep it confidential.";

export const TRANSFER_MESSAGE_AFTER_HOURS =
  "We believe that this issue requires an escalation to one of our Live (Human) HR Advisors. We are transferring this now to your advisor. Your advisor has been notified and may take up to 6 hours to respond. You can close the app and we will notify you when your advisor has reviewed. In the meantime, hold off acting, write down all the facts and dates, keep it confidential.";

export function transferMessage(afterHours: boolean): string {
  return afterHours ? TRANSFER_MESSAGE_AFTER_HOURS : TRANSFER_MESSAGE_IN_HOURS;
}

/** What the manager reads while their chat waits for an advisor to join. */
export function waitingNote(afterHours: boolean): string {
  return afterHours
    ? "Your advisor has been notified and may take up to 6 hours to respond. You can close the app and we will notify you when your advisor has reviewed."
    : "It may take up to an hour for an advisor to respond. You can leave the app and you will be notified when your advisor has read the case.";
}

/** Stored on every case, and shown to the advisor. */
export const RESPONSE_COMMITMENT = "Reply within 1 hour in working hours, up to 6 hours outside them";

/** Shown instead of an AI answer while a person owns the chat. */
export const FORWARDED_MESSAGE = "Your message has been sent to your HR advisor. Their reply will appear here in this chat.";

/** A case is live while it has not been resolved or closed. */
export function isCaseOpen(status: Status): boolean {
  return status === "with_advisor" || status === "draft_response" || status === "responded";
}

export function liveChatPhase(status: Status, claimedByUid: string | null): LiveChatPhase {
  if (!isCaseOpen(status)) return "closed";
  return claimedByUid ? "connected" : "waiting";
}

/** The first advisor to claim wins; the owner can re-claim harmlessly. */
export function canClaimCase(status: Status, claimedByUid: string | null, advisorUid: string): boolean {
  return isCaseOpen(status) && (claimedByUid === null || claimedByUid === advisorUid);
}

/** Taking over a case that another advisor owns, for example at a shift change. */
export function canTakeOverCase(status: Status, claimedByUid: string | null, advisorUid: string): boolean {
  return isCaseOpen(status) && claimedByUid !== null && claimedByUid !== advisorUid;
}

export function canAdvisorReply(status: Status, claimedByUid: string | null, advisorUid: string): boolean {
  return isCaseOpen(status) && claimedByUid === advisorUid;
}

/** The user can write while the case is open; a closed case must be reopened first. */
export function canUserSend(status: Status): boolean {
  return isCaseOpen(status);
}

/** Reopening has no time limit, but only a closed case can be reopened. */
export function canReopenCase(status: Status): boolean {
  return status === "resolved" || status === "closed";
}

export function cleanLiveMessage(text: string): string {
  return text.trim().slice(0, LIVE_MESSAGE_MAX_LENGTH);
}

/**
 * A new escalation about the same employee within this long of the manager's last case closing continues that
 * case (reopened) instead of opening a second one, so HR sees one thread and one alert for one matter.
 */
export const REOPEN_INSTEAD_OF_NEW_MS = 7 * 24 * 60 * 60_000;

export function shouldReopenInsteadOfNew(latest: { isOpen: boolean; closedAtMs: number | null } | null, nowMs = Date.now()): boolean {
  return Boolean(latest && !latest.isOpen && latest.closedAtMs !== null && nowMs - latest.closedAtMs < REOPEN_INSTEAD_OF_NEW_MS);
}

/** At most one "you have a new message" email per case and direction in this window. */
export const LIVE_NOTIFY_THROTTLE_MS = 10 * 60_000;

export function shouldSendLiveNotification(lastSentMs: number | null, nowMs = Date.now()): boolean {
  return lastSentMs === null || nowMs - lastSentMs >= LIVE_NOTIFY_THROTTLE_MS;
}
