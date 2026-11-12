import "server-only";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  canAdvisorReply,
  canClaimCase,
  canReopenCase,
  canTakeOverCase,
  canUserSend,
  cleanLiveMessage,
  isCaseOpen,
  liveChatPhase,
  shouldSendLiveNotification,
  transferMessage,
  type LiveChatMessage,
  type LiveChatPhase,
} from "@/features/advisor/live-chat";
import type { AdvisorEscalationRecord } from "@/features/advisor/escalation-queue";
import type { AdvisorActivityKind, CaseNotice } from "@/features/advisor/notices";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import type { LiveReplyAudience } from "@/features/advisor/escalation-email";
import { isWithinWorkingHours } from "@/features/advisor/hours";
import { friendlyName } from "@/lib/person-name";
import { getAdvisorSettings } from "./platform-settings.repository";
import { sendAdvisorEscalationNotification, sendLiveReplyNotification } from "@/server/email/advisor-escalation-notification";
import { listConversationForAdvisorCase } from "./skylar-conversation.repository";
import { isSoftDeleted } from "./soft-delete";
import type { AdvisorAuditAction as AdvisorAuditActionName } from "./platform.repository";
import type { AuthSession } from "@/types/auth";

const ESCALATIONS = "advisor_escalations";
const MESSAGES = "messages";
const COMPANIES = "companies";
const LEDGER = "employee_ledger_entries";
const EMPLOYEES = "employees";
const USERS = "users";
const AUDIT = "platform_audit_log";
const MESSAGES_LIMIT = 200;

type Status = AdvisorEscalationRecord["status"];

/** True when an advisor is not expected to answer within the hour: outside the working hours a super admin set. */
export async function afterHoursNow(nowMs = Date.now()): Promise<boolean> {
  const { hours } = await getAdvisorSettings(nowMs);
  return !isWithinWorkingHours(nowMs, hours);
}

export type LiveCaseSummary = {
  id: string;
  caseId: string;
  companyId: string;
  companyName: string;
  employeeName: string;
  question: string;
  escalationReason: string;
  status: Status;
  phase: LiveChatPhase;
  claimedByUid: string | null;
  claimedByName: string | null;
  reopenCount: number;
  createdAtMs: number | null;
  lastMessageAtMs: number | null;
  lastMessageSender: LiveChatMessage["sender"] | null;
};

/** What the user sees of their own case. */
export type UserLiveCase = {
  id: string;
  caseId: string;
  employeeId: string;
  employeeName: string;
  phase: LiveChatPhase;
  advisorName: string | null;
  /** Outside working hours the wait is up to 6 hours instead of 1, and the chat says so. */
  afterHours: boolean;
  reopenCount: number;
  /** Another admin in the workspace: they can read the conversation, but only the manager who opened it can write. */
  readOnly: boolean;
  canSend: boolean;
  canReopen: boolean;
  messages: LiveChatMessage[];
};

export type AdvisorLiveAction = "claim" | "take_over" | "release" | "reply" | "resolve" | "resolve_false_alarm" | "close_unclaimed";

type AdvisorAuditAction = AdvisorAuditActionName;

const ACTIVITY_FOR_ACTION: Record<AdvisorLiveAction, AdvisorActivityKind> = {
  claim: "joined",
  take_over: "joined",
  release: "released",
  reply: "reply",
  resolve: "closed",
  resolve_false_alarm: "closed",
  close_unclaimed: "closed",
};

const AUDIT_ACTION = {
  claim: "advisor_claim",
  take_over: "advisor_take_over",
  release: "advisor_release",
  resolve: "advisor_resolve",
  resolve_false_alarm: "advisor_false_alarm",
  close_unclaimed: "advisor_close_unclaimed",
} as const;

function ms(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return null;
}

function statusOf(value: unknown): Status {
  return value === "draft_response" || value === "responded" || value === "resolved" || value === "closed"
    ? value
    : "with_advisor";
}

function senderOf(value: unknown): LiveChatMessage["sender"] | null {
  return value === "user" || value === "advisor" || value === "system" ? value : null;
}

function summaryFrom(id: string, data: DocumentData, companyName: string): LiveCaseSummary {
  const status = statusOf(data.status);
  const claimedByUid = typeof data.claimedByUid === "string" ? data.claimedByUid : null;
  return {
    id,
    caseId: String(data.caseId ?? id),
    companyId: String(data.companyId ?? ""),
    companyName,
    employeeName: String(data.employeeName ?? "Employee"),
    question: String(data.question ?? ""),
    escalationReason: String(data.escalationReason ?? ""),
    status,
    phase: liveChatPhase(status, claimedByUid),
    claimedByUid,
    claimedByName: typeof data.claimedByName === "string" ? data.claimedByName : null,
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : 0,
    createdAtMs: ms(data.createdAt),
    lastMessageAtMs: ms(data.lastMessageAt),
    lastMessageSender: senderOf(data.lastMessageSender),
  };
}

function messageFrom(id: string, data: DocumentData): LiveChatMessage | null {
  const sender = senderOf(data.sender);
  if (!sender || typeof data.text !== "string" || !data.text.trim()) return null;
  return {
    id,
    sender,
    text: data.text,
    authorName: typeof data.authorName === "string" ? data.authorName : null,
    createdAtMs: ms(data.createdAt) ?? 0,
  };
}

/**
 * Messages written in one batch share a server timestamp, so `seq` keeps their order.
 * Seeded messages repeat what the user already sees in the chat; they are for the advisor.
 */
async function listMessages(escalationId: string, { includeSeeded }: { includeSeeded: boolean }): Promise<LiveChatMessage[]> {
  const snapshot = await adminDb()
    .collection(ESCALATIONS)
    .doc(escalationId)
    .collection(MESSAGES)
    .orderBy("createdAt", "asc")
    .limit(MESSAGES_LIMIT)
    .get();
  const seqOf = (value: unknown) => (typeof value === "number" ? value : 0);
  return snapshot.docs
    .filter((doc) => includeSeeded || doc.get("seeded") !== true)
    .map((doc) => ({ message: messageFrom(doc.id, doc.data()), seq: seqOf(doc.get("seq")) }))
    .filter((row): row is { message: LiveChatMessage; seq: number } => row.message !== null)
    .sort((a, b) => a.message.createdAtMs - b.message.createdAtMs || a.seq - b.seq)
    .map((row) => row.message);
}

async function loadDocs(collection: string, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const docs = await Promise.all(unique.map((id) => adminDb().collection(collection).doc(id).get()));
  return new Map(unique.map((id, i) => [id, docs[i]]));
}

async function companyNames(ids: string[]): Promise<Map<string, string>> {
  const docs = await loadDocs(COMPANIES, ids);
  return new Map(Array.from(docs.entries()).map(([id, doc]) => [id, String(doc.get("name") ?? "Workspace")]));
}

type MessageInput = {
  sender: LiveChatMessage["sender"];
  text: string;
  authorName: string | null;
  authorUid: string | null;
  seq?: number;
  seeded?: boolean;
};

/** Writes a message and keeps the case's last-message markers in step. Caller adds it to a batch. */
function stageMessage(batch: FirebaseFirestore.WriteBatch, escalationId: string, input: MessageInput) {
  const ref = adminDb().collection(ESCALATIONS).doc(escalationId);
  const now = FieldValue.serverTimestamp();
  batch.set(ref.collection(MESSAGES).doc(), { ...input, createdAt: now });
  return { lastMessageAt: now, lastMessageSender: input.sender, updatedAt: now };
}

/** Every open case across all workspaces plus recently closed ones, for the advisor console. */
/** Company and employee documents already fetched, so a long-lived stream reads each of them only once. */
export type LookupCache = { companies: Map<string, FirebaseFirestore.DocumentSnapshot>; employees: Map<string, FirebaseFirestore.DocumentSnapshot> };
export const newLookupCache = (): LookupCache => ({ companies: new Map(), employees: new Map() });

async function fillCache(map: Map<string, FirebaseFirestore.DocumentSnapshot>, collection: string, ids: string[]) {
  const missing = Array.from(new Set(ids.filter((id) => id && !map.has(id))));
  if (!missing.length) return;
  const loaded = await loadDocs(collection, missing);
  loaded.forEach((doc, id) => map.set(id, doc));
}

/** Turns case documents into desk rows, hiding cases whose workspace or employee file is deleted. */
async function casesFromDocs(docs: FirebaseFirestore.QueryDocumentSnapshot[], cache: LookupCache): Promise<LiveCaseSummary[]> {
  await Promise.all([
    fillCache(cache.companies, COMPANIES, docs.map((doc) => String(doc.get("companyId") ?? ""))),
    fillCache(cache.employees, EMPLOYEES, docs.map((doc) => String(doc.get("employeeId") ?? ""))),
  ]);
  return docs
    .filter((doc) => {
      // A deleted workspace or employee file takes its cases with it until it is restored.
      const company = cache.companies.get(String(doc.get("companyId") ?? ""));
      const employee = cache.employees.get(String(doc.get("employeeId") ?? ""));
      return company?.get("status") !== "deleted" && !(employee && isSoftDeleted(employee));
    })
    .map((doc) => summaryFrom(doc.id, doc.data(), String(cache.companies.get(String(doc.get("companyId")))?.get("name") ?? "Workspace")));
}

const DESK_LIMIT = 200;

/** Every open case across all workspaces plus recently closed ones, for the advisor console. */
export async function listLiveCases(cache: LookupCache = newLookupCache()): Promise<LiveCaseSummary[]> {
  const snapshot = await adminDb().collection(ESCALATIONS).orderBy("createdAt", "desc").limit(DESK_LIMIT).get();
  return casesFromDocs(snapshot.docs, cache);
}

type Unsubscribe = () => void;

/** Calls `onChange` whenever this case, or anything written with it (messages, claim, status), changes. */
export function watchCase(escalationId: string, onChange: () => void, onError: (error: Error) => void): Unsubscribe {
  return adminDb().collection(ESCALATIONS).doc(escalationId).onSnapshot(() => onChange(), onError);
}

/** Calls `onChange` with the desk list each time any case changes. Lookups are cached for the life of the stream. */
export function watchLiveCases(onChange: (cases: LiveCaseSummary[]) => void, onError: (error: Error) => void): Unsubscribe {
  const cache = newLookupCache();
  let busy = false;
  let again = false;
  let latest: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const flush = async () => {
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      do {
        again = false;
        onChange(await casesFromDocs(latest, cache));
      } while (again);
    } catch (error) {
      onError(error as Error);
    } finally {
      busy = false;
    }
  };
  return adminDb()
    .collection(ESCALATIONS)
    .orderBy("createdAt", "desc")
    .limit(DESK_LIMIT)
    .onSnapshot((snapshot) => {
      latest = snapshot.docs;
      void flush();
    }, onError);
}

const NOTICE_WINDOW_MS = 14 * 24 * 60 * 60_000;

function noticeFromDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): CaseNotice {
  const data = doc.data();
  const status = statusOf(data.status);
  const claimedByUid = typeof data.claimedByUid === "string" ? data.claimedByUid : null;
  const kind = data.lastAdvisorActivityKind;
  return {
    escalationId: doc.id,
    caseId: String(data.caseId ?? doc.id),
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? "Employee"),
    phase: liveChatPhase(status, claimedByUid),
    advisorName: typeof data.claimedByName === "string" ? data.claimedByName : typeof data.firstReplyByName === "string" ? data.firstReplyByName : null,
    activityAtMs: ms(data.lastAdvisorActivityAt),
    activityKind: kind === "joined" || kind === "reply" || kind === "closed" || kind === "released" ? kind : null,
  };
}

/** This manager's cases as notifications. It needs no reads beyond the documents themselves. */
export function watchUserNotices(session: AuthSession, onChange: (notices: CaseNotice[]) => void, onError: (error: Error) => void): Unsubscribe {
  return adminDb()
    .collection(ESCALATIONS)
    .where("companyId", "==", session.companyId)
    .where("createdBy", "==", session.uid)
    .onSnapshot((snapshot) => {
      const now = Date.now();
      onChange(
        snapshot.docs
          .map(noticeFromDoc)
          // Old closed chats aren't news.
          .filter((notice) => notice.phase !== "closed" || (notice.activityAtMs ?? 0) > now - NOTICE_WINDOW_MS),
      );
    }, onError);
}

/** With live chat switched off, a case can be read but not written to. */
export function applyLivePause<T extends { canSend: boolean; canReopen: boolean }>(chat: T): T {
  const env = getServerEnv();
  const canReopen = chat.canReopen && Boolean(env.ADVISOR_ALLOW_REOPEN);
  return env.LIVE_ADVISOR_ENABLED ? { ...chat, canReopen } : { ...chat, canSend: false, canReopen: false };
}

export type LiveCaseDetail = { case: LiveCaseSummary; messages: LiveChatMessage[]; earlierChat: SkylarConversationMessage[] };

/** Best effort: an audit failure must not stop an advisor working a case. */
async function auditAdvisorAction(advisor: AuthSession, action: AdvisorAuditAction, escalationId: string, data: DocumentData): Promise<void> {
  try {
    const companyId = String(data.companyId ?? "");
    const names = await companyNames([companyId]);
    await adminDb().collection(AUDIT).add({
      action,
      kind: "workspace",
      companyId,
      userId: null,
      companyName: names.get(companyId) ?? "Workspace",
      actorUid: advisor.uid,
      actorEmail: advisor.email,
      reason: `Case ${String(data.caseId ?? escalationId)}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Could not audit an advisor action", error);
  }
}

/** One audit entry per advisor and case in this window, so polling or a reconnecting stream can't flood the log. */
const VIEW_AUDIT_THROTTLE_MS = 10 * 60_000;
const recentViews = new Map<string, number>();

function shouldAuditView(advisorUid: string, escalationId: string, now = Date.now()): boolean {
  Array.from(recentViews.entries()).forEach(([key, at]) => {
    if (now - at >= VIEW_AUDIT_THROTTLE_MS) recentViews.delete(key);
  });
  const key = `${advisorUid}:${escalationId}`;
  if (recentViews.has(key)) return false;
  recentViews.set(key, now);
  return true;
}

/** For tests: forget which cases have been audited. */
export function resetViewAuditThrottle(): void {
  recentViews.clear();
}

/**
 * An advisor reading a case, which may belong to another company. The read is audited here on the server, whichever
 * endpoint asked, so it can't be skipped. Re-reads after the advisor's own action or on a stream update pass
 * `audit: false`, because the first read was already logged.
 */
export async function getLiveCaseForAdvisor(escalationId: string, viewer: AuthSession, options: { audit?: boolean } = {}): Promise<LiveCaseDetail> {
  const doc = await adminDb().collection(ESCALATIONS).doc(escalationId).get();
  const data = doc.data();
  if (!doc.exists || !data) throw new NotFoundError("Advisor case not found.");
  const names = await companyNames([String(data.companyId ?? "")]);
  const summary = summaryFrom(doc.id, data, names.get(String(data.companyId)) ?? "Workspace");
  if (options.audit !== false && shouldAuditView(viewer.uid, doc.id)) await auditAdvisorAction(viewer, "advisor_view_case", doc.id, data);
  const [messages, earlierChat] = await Promise.all([
    listMessages(doc.id, { includeSeeded: true }),
    typeof data.createdBy === "string" && data.employeeId
      ? listConversationForAdvisorCase(String(data.companyId), data.createdBy, String(data.employeeId))
      : Promise.resolve([]),
  ]);
  return { case: summary, messages, earlierChat };
}

type CaseWriter = {
  get(ref: FirebaseFirestore.DocumentReference): Promise<FirebaseFirestore.DocumentSnapshot>;
  set(ref: FirebaseFirestore.DocumentReference, data: DocumentData): void;
  update(ref: FirebaseFirestore.DocumentReference, patch: DocumentData): void;
};

/** gRPC FAILED_PRECONDITION (the case changed under us) or ABORTED. */
function isCaseChanged(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 9 || code === 10 || code === "failed-precondition" || code === "aborted";
}

const CASE_WRITE_ATTEMPTS = 4;

/**
 * Reads the case, lets `fn` decide and stage writes, then commits them only if the case is still exactly as it
 * was read. A Firestore transaction is the obvious tool, but two advisors acting on the same case at once would
 * each hold a read lock and wait on the other until the lock timeout (about 30 seconds). This fails instantly
 * instead and runs `fn` again against the new state, so the loser gets "already taken by …" straight away.
 */
async function runWithCaseCheck(
  db: FirebaseFirestore.Firestore,
  caseRef: FirebaseFirestore.DocumentReference,
  fn: (writer: CaseWriter) => Promise<void>,
  /** Stamped on the case so the manager's notifications can say what the advisor just did. */
  activity?: AdvisorActivityKind,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const snapshot = await caseRef.get();
    const batch = db.batch();
    let writes = 0;
    const writer: CaseWriter = {
      get: async () => snapshot,
      set: (ref, data) => {
        writes++;
        batch.set(ref, data);
      },
      update: (ref, patch) => {
        writes++;
        if (ref.path === caseRef.path && snapshot.exists) {
          const stamped = activity ? { ...patch, lastAdvisorActivityAt: FieldValue.serverTimestamp(), lastAdvisorActivityKind: activity } : patch;
          batch.update(ref, stamped, { lastUpdateTime: snapshot.updateTime! });
        } else batch.update(ref, patch);
      },
    };
    await fn(writer);
    if (writes === 0) return;
    try {
      await batch.commit();
      return;
    } catch (error) {
      if (!isCaseChanged(error) || attempt >= CASE_WRITE_ATTEMPTS) throw error;
    }
  }
}

export async function applyAdvisorLiveAction(
  advisor: AuthSession,
  escalationId: string,
  action: AdvisorLiveAction,
  rawText?: string,
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(ESCALATIONS).doc(escalationId);
  const advisorName = friendlyName(advisor.displayName?.trim() || advisor.email);
  const text = cleanLiveMessage(rawText ?? "");
  let caseData: DocumentData | null = null;
  let changed = true;

  await runWithCaseCheck(db, ref, async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    if (!snapshot.exists || !data) throw new NotFoundError("Advisor case not found.");
    caseData = data;
    const status = statusOf(data.status);
    const claimedByUid = typeof data.claimedByUid === "string" ? data.claimedByUid : null;
    const now = FieldValue.serverTimestamp();
    const messageRef = ref.collection(MESSAGES).doc();
    const writeMessage = (sender: LiveChatMessage["sender"], body: string, author: string | null, uid: string | null) => {
      tx.set(messageRef, { sender, text: body, authorName: author, authorUid: uid, createdAt: now });
      return { lastMessageAt: now, lastMessageSender: sender };
    };

    if (action === "claim" || action === "take_over") {
      // Already theirs, for example a double click: don't announce them joining again.
      if (action === "claim" && claimedByUid === advisor.uid && isCaseOpen(status)) {
        changed = false;
        return;
      }
      const allowed =
        action === "claim"
          ? canClaimCase(status, claimedByUid, advisor.uid)
          : canTakeOverCase(status, claimedByUid, advisor.uid);
      if (!allowed) {
        if (!isCaseOpen(status)) throw new ConflictError("This case is closed.");
        throw new ConflictError(`Already taken by ${data.claimedByName ?? "another advisor"}.`);
      }
      const joined = writeMessage("system", `${advisorName} joined the chat.`, null, null);
      tx.update(ref, {
        ...joined,
        claimedByUid: advisor.uid,
        claimedByName: advisorName,
        claimedAt: now,
        advisorName,
        updatedAt: now,
        updatedBy: advisor.uid,
      });
      return;
    }

    if (action === "release") {
      if (!isCaseOpen(status) || claimedByUid !== advisor.uid) throw new ConflictError("You don't own this case.");
      const left = writeMessage("system", "The advisor released this chat. Another advisor will pick it up.", null, null);
      tx.update(ref, { ...left, claimedByUid: null, claimedByName: null, updatedAt: now, updatedBy: advisor.uid });
      return;
    }

    if (action === "reply") {
      if (!canAdvisorReply(status, claimedByUid, advisor.uid)) throw new ConflictError("Claim this case before replying.");
      if (!text) throw new ValidationError("Write a reply first.");
      const sent = writeMessage("advisor", text, advisorName, advisor.uid);
      tx.update(ref, {
        ...sent,
        status: "responded",
        responseText: text,
        respondedAt: now,
        ...(data.firstAdvisorReplyAt ? {} : { firstAdvisorReplyAt: now, firstReplyByName: advisorName }),
        updatedAt: now,
        updatedBy: advisor.uid,
      });
      return;
    }

    // resolve, or close an unclaimed case (duplicates, spam)
    if (!isCaseOpen(status)) throw new ConflictError("This case is already closed.");
    const isResolve = action === "resolve" || action === "resolve_false_alarm";
    if (isResolve && claimedByUid !== advisor.uid) throw new ConflictError("Claim this case before resolving it.");
    if (action === "close_unclaimed" && claimedByUid !== null) throw new ConflictError("This case has an advisor.");
    const closed = writeMessage("system", "HR closed this chat. If you need more help, start a new chat.", null, null);
    tx.update(ref, {
      ...closed,
      status: isResolve ? "resolved" : "closed",
      falseAlarm: action === "resolve_false_alarm",
      resolvedAt: now,
      resolvedByUid: advisor.uid,
      updatedAt: now,
      updatedBy: advisor.uid,
    });
    if (isResolve) {
      tx.set(db.collection(LEDGER).doc(), {
        companyId: data.companyId,
        employeeId: data.employeeId,
        type: "advisor_resolution",
        date: now,
        description: `Advisor case ${data.caseId ?? escalationId} resolved.`,
        statusDot: "green",
        reference: data.caseId ?? escalationId,
        conversationId: null,
        documentId: null,
        advisorEscalationId: escalationId,
        createdAt: now,
        createdBy: advisor.uid,
      });
    }
  }, ACTIVITY_FOR_ACTION[action]);

  if (!caseData || !changed) return;
  if (action === "reply") await notifyOtherSide(ref, caseData, "user", "reply");
  else {
    // The manager is told as soon as an advisor has read the case, not only once they answer.
    if (action === "claim" || action === "take_over") await notifyOtherSide(ref, caseData, "user", "reviewed");
    await auditAdvisorAction(advisor, AUDIT_ACTION[action], escalationId, caseData);
  }
}

/** Emails the person who isn't looking at the chat, at most once in the throttle window. Never throws. */
async function notifyOtherSide(
  ref: FirebaseFirestore.DocumentReference,
  data: DocumentData,
  audience: LiveReplyAudience,
  kind: "reply" | "reviewed" = "reply",
): Promise<void> {
  try {
    const field = audience === "advisor" ? "advisorNotifiedAt" : kind === "reviewed" ? "userReviewedNotifiedAt" : "userNotifiedAt";
    if (!shouldSendLiveNotification(ms(data[field]))) return;
    const uid = audience === "user" ? data.createdBy : data.claimedByUid;
    if (typeof uid !== "string" || !uid) return;
    const email = (await adminDb().collection(USERS).doc(uid).get()).get("email");
    if (typeof email !== "string" || !email) return;

    const result = await sendLiveReplyNotification({ toEmail: email, caseId: String(data.caseId ?? ref.id), audience, kind });
    if (result.status === "sent") await ref.update({ [field]: FieldValue.serverTimestamp() });
    else if (result.status === "failed") console.error("Could not email about a live chat message", result.reason);
  } catch (error) {
    console.error("Could not email about a live chat message", error);
  }
}

/** Any admin in the workspace can see a case exists; another workspace's looks the same as a missing one. */
async function loadWorkspaceCase(session: AuthSession, escalationId: string) {
  const ref = adminDb().collection(ESCALATIONS).doc(escalationId);
  const doc = await ref.get();
  const data = doc.data();
  if (!doc.exists || !data || data.companyId !== session.companyId) {
    throw new NotFoundError("Advisor case not found.");
  }
  return { ref, data };
}

/**
 * Who may write to a case's conversation: the manager who opened it. If that person is gone (deleted,
 * suspended, no longer an admin of this workspace) or the case was never opened by a real account, such as a
 * seeded demo case, it belongs to the workspace's current admins, so a conversation can't be stranded with nobody.
 * Any other admin of the workspace can read it (Skylar's answer) but not reply, claim or reopen.
 */
async function isCaseOwner(session: AuthSession, data: DocumentData): Promise<boolean> {
  if (data.createdBy === session.uid) return true;
  if (session.role !== "admin" || data.companyId !== session.companyId) return false;
  const opener = typeof data.createdBy === "string" && data.createdBy ? await adminDb().collection(USERS).doc(data.createdBy).get() : null;
  const stillHere =
    opener?.exists === true &&
    opener.get("companyId") === session.companyId &&
    opener.get("role") === "admin" &&
    opener.get("status") === "active" &&
    !isSoftDeleted(opener);
  return !stillHere;
}

async function loadOwnCase(session: AuthSession, escalationId: string) {
  const loaded = await loadWorkspaceCase(session, escalationId);
  if (!(await isCaseOwner(session, loaded.data))) throw new AuthorizationError("Only the manager who opened this case can do that.");
  return loaded;
}

export async function getUserLiveCase(session: AuthSession, escalationId: string): Promise<UserLiveCase> {
  const { ref, data } = await loadWorkspaceCase(session, escalationId);
  const status = statusOf(data.status);
  const claimedByUid = typeof data.claimedByUid === "string" ? data.claimedByUid : null;
  const isOwner = await isCaseOwner(session, data);
  return {
    id: ref.id,
    caseId: String(data.caseId ?? ref.id),
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? "Employee"),
    phase: liveChatPhase(status, claimedByUid),
    afterHours: await afterHoursNow(),
    advisorName: typeof data.claimedByName === "string" ? data.claimedByName : null,
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : 0,
    readOnly: !isOwner,
    canSend: isOwner && canUserSend(status),
    canReopen: isOwner && canReopenCase(status),
    // Every admin of the workspace can read the conversation; readOnly stops them writing to it.
    messages: await listMessages(ref.id, { includeSeeded: false }),
  };
}

export async function sendUserLiveMessage(session: AuthSession, escalationId: string, rawText: string): Promise<void> {
  const text = cleanLiveMessage(rawText);
  if (!text) throw new ValidationError("Write a message first.");
  const { ref, data } = await loadOwnCase(session, escalationId);
  if (!canUserSend(statusOf(data.status))) throw new ConflictError("This chat is closed. Reopen it to keep talking.");

  const batch = adminDb().batch();
  const markers = stageMessage(batch, escalationId, {
    sender: "user",
    text,
    authorName: session.displayName ?? null,
    authorUid: session.uid,
  });
  batch.update(ref, markers);
  await batch.commit();
  await notifyOtherSide(ref, data, "advisor");
}

/** Back to the waiting queue; the previous advisor is named in the system message so the next one has context. */
export async function reopenUserLiveCase(session: AuthSession, escalationId: string): Promise<void> {
  // Skylar's answer is that a manager starts a new chat; reopening is switched on with ADVISOR_ALLOW_REOPEN.
  if (!getServerEnv().ADVISOR_ALLOW_REOPEN) throw new ConflictError("Start a new chat with HR instead.");
  const { ref, data } = await loadOwnCase(session, escalationId);
  if (!canReopenCase(statusOf(data.status))) throw new ConflictError("This case is still open.");

  const previous = typeof data.claimedByName === "string" ? data.claimedByName : null;
  const batch = adminDb().batch();
  const markers = stageMessage(batch, escalationId, {
    sender: "system",
    text: previous ? `Chat reopened. Previously handled by ${previous}.` : "Chat reopened.",
    authorName: null,
    authorUid: null,
  });
  batch.update(ref, {
    ...markers,
    status: "with_advisor",
    claimedByUid: null,
    claimedByName: null,
    resolvedAt: null,
    falseAlarm: false,
    reopenCount: FieldValue.increment(1),
    reopenedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  });
  await batch.commit();

  // Tell the HR advisors the user is back. A failed email must not undo the reopen.
  await sendAdvisorEscalationNotification({
    caseId: String(data.caseId ?? ref.id),
    employeeName: String(data.employeeName ?? "Employee"),
    question: String(data.question ?? ""),
    escalationReason: String(data.escalationReason ?? ""),
    responseCommitment: String(data.responseCommitment ?? ""),
    reopened: true,
  }).catch((error: unknown) => console.error("Could not email advisors about a reopened chat", error));
}

/** Opens the live thread for a new case: the transfer notice, then what the user wrote so the advisor has context. */
export async function seedLiveThread(
  escalationId: string,
  openingMessage?: { text: string; authorName: string | null; authorUid: string },
): Promise<void> {
  const batch = adminDb().batch();
  const ref = adminDb().collection(ESCALATIONS).doc(escalationId);
  let markers = stageMessage(batch, escalationId, { sender: "system", text: transferMessage(await afterHoursNow()), authorName: null, authorUid: null, seq: 0, seeded: true });
  if (openingMessage?.text.trim()) {
    markers = stageMessage(batch, escalationId, {
      sender: "user",
      text: cleanLiveMessage(openingMessage.text),
      authorName: openingMessage.authorName,
      authorUid: openingMessage.authorUid,
      seq: 1,
      seeded: true,
    });
  }
  batch.update(ref, markers);
  await batch.commit();
}

/**
 * This manager's most recent advisor case about one employee, open or closed.
 * Open means a person owns the chat, so the assistant stays out of it.
 */
export async function findLiveCaseForEmployee(
  session: AuthSession,
  employeeId: string,
): Promise<{ id: string; caseId: string; isOpen: boolean; closedAtMs: number | null } | null> {
  const snapshot = await adminDb()
    .collection(ESCALATIONS)
    .where("companyId", "==", session.companyId)
    .where("createdBy", "==", session.uid)
    .where("employeeId", "==", employeeId)
    .get();
  const latest = snapshot.docs
    .map((doc) => ({ doc, at: ms(doc.get("createdAt")) ?? 0, reopenedAt: ms(doc.get("reopenedAt")) ?? 0 }))
    .sort((a, b) => Math.max(b.at, b.reopenedAt) - Math.max(a.at, a.reopenedAt))[0];
  if (!latest) return null;
  return {
    id: latest.doc.id,
    caseId: String(latest.doc.get("caseId") ?? latest.doc.id),
    isOpen: isCaseOpen(statusOf(latest.doc.get("status"))),
    closedAtMs: ms(latest.doc.get("resolvedAt")),
  };
}
