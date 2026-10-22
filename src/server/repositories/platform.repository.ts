import "server-only";
import { FieldValue, type DocumentData, type Firestore } from "firebase-admin/firestore";
import {
  billingPlanForState,
  normalizeBillingStatus,
  type BillingPlan,
  type BillingStatus,
  type PlanOverride,
} from "@/features/billing/subscription-status";
import { isActiveEscalation, type AdvisorEscalationRecord } from "@/features/advisor/escalation-queue";
import { bucketIndex, type ResolvedRange } from "@/features/platform/range";
import { NotFoundError } from "@/lib/errors";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";
import { companyStatusFrom, type CompanyStatus } from "./user.repository";
import type { PackageAuditAction } from "./pricing.repository";

const COMPANIES = "companies";
const USERS = "users";
const EMPLOYEES = "employees";
const LEDGER = "employee_ledger_entries";
const SUBSCRIPTIONS = "subscriptions";
const ESCALATIONS = "advisor_escalations";
const AUDIT = "platform_audit_log";

export type WorkspaceRow = {
  id: string;
  name: string;
  createdAtMs: number | null;
  status: CompanyStatus;
  blockedReason: string | null;
  blockedAtMs: number | null;
  /** Set while a workspace is soft-deleted: when it will be permanently removed. */
  deleteAfterMs: number | null;
  deletedReason: string | null;
  ownerEmail: string | null;
  /** User id of whoever created the workspace. */
  ownerUid: string | null;
  userCount: number;
  adminCount: number;
  employeeRecordCount: number;
  recordCount: number;
  conversationCount: number;
  lastActivityMs: number | null;
  billingStatus: BillingStatus;
  plan: BillingPlan;
  planOverride: PlanOverride;
  planOverrideNote: string | null;
  /** Package the workspace subscribed to at checkout; null for free or older subscriptions. */
  packageId: string | null;
  payingViaStripe: boolean;
  freeMessagesUsed: number;
  openEscalations: number;
  totalEscalations: number;
};

export type PlatformAuditEntry = {
  id: string;
  action: PlatformAction;
  /** Null for package changes and for workspaces that have been permanently removed. */
  companyId: string | null;
  companyName: string;
  actorEmail: string | null;
  reason: string | null;
  createdAtMs: number | null;
};

export type WorkspaceAction = "block" | "unblock" | "grant_paid" | "revoke_paid";
export type UserAuditAction = "user_suspend" | "user_unsuspend" | "user_delete" | "user_restore" | "user_purge" | "platform_admin_grant" | "platform_admin_revoke";
export type PlatformAction = WorkspaceAction | "delete" | "restore_workspace" | "purge" | PackageAuditAction | UserAuditAction;

export type WorkspaceUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  createdAtMs: number | null;
};

function ms(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function bump(map: Map<string, number>, key: unknown, by = 1) {
  if (typeof key !== "string") return;
  map.set(key, (map.get(key) ?? 0) + by);
}

async function selectAll(db: Firestore, collection: string, fields: string[]) {
  const snapshot = await db.collection(collection).select(...fields).get();
  return snapshot.docs;
}

/**
 * Builds one row per workspace from field-limited reads of every collection. Reads scale with
 * total records, which is fine for the current size; move to stored counters if it grows large.
 */
export async function listWorkspaceRows(): Promise<WorkspaceRow[]> {
  const db = adminDb();
  const [companies, users, employees, ledger, subscriptions, escalations] = await Promise.all([
    selectAll(db, COMPANIES, ["name", "createdAt", "status", "blockedReason", "blockedAt", "createdBy"]),
    selectAll(db, USERS, ["companyId", "role", "email", "status"]),
    selectAll(db, EMPLOYEES, ["companyId"]),
    selectAll(db, LEDGER, ["companyId", "type", "date", "createdAt"]),
    db.collection(SUBSCRIPTIONS).get().then((snapshot) => snapshot.docs),
    selectAll(db, ESCALATIONS, ["companyId", "status"]),
  ]);

  const userCount = new Map<string, number>();
  const adminCount = new Map<string, number>();
  const userEmailById = new Map<string, string>();
  for (const doc of users) {
    const data = doc.data();
    if (data.status === "disabled") continue;
    bump(userCount, data.companyId);
    if (data.role === "admin") bump(adminCount, data.companyId);
    if (typeof data.email === "string") userEmailById.set(doc.id, data.email);
  }

  const employeeCount = new Map<string, number>();
  for (const doc of employees) bump(employeeCount, doc.get("companyId"));

  const recordCount = new Map<string, number>();
  const conversationCount = new Map<string, number>();
  const lastActivity = new Map<string, number>();
  for (const doc of ledger) {
    const data = doc.data();
    const companyId = data.companyId;
    if (typeof companyId !== "string") continue;
    bump(recordCount, companyId);
    if (data.type === "conversation") bump(conversationCount, companyId);
    const at = ms(data.date) ?? ms(data.createdAt);
    if (at && at > (lastActivity.get(companyId) ?? 0)) lastActivity.set(companyId, at);
  }

  const billing = new Map<string, DocumentData>();
  for (const doc of subscriptions) billing.set(doc.id, doc.data());

  const openEscalations = new Map<string, number>();
  const totalEscalations = new Map<string, number>();
  for (const doc of escalations) {
    const data = doc.data();
    bump(totalEscalations, data.companyId);
    if (isActiveEscalation(data.status as AdvisorEscalationRecord["status"])) bump(openEscalations, data.companyId);
  }

  return companies
    .map((doc): WorkspaceRow => {
      const data = doc.data();
      const sub = billing.get(doc.id) ?? {};
      const billingStatus = normalizeBillingStatus(sub.status ?? "free");
      const planOverride: PlanOverride = sub.planOverride === "paid" ? "paid" : null;
      const freeMessagesUsed = typeof sub.freeMessagesUsed === "number" ? Math.max(0, sub.freeMessagesUsed) : 0;
      return {
        id: doc.id,
        name: str(data.name) ?? "Untitled workspace",
        createdAtMs: ms(data.createdAt),
        status: companyStatusFrom(data.status),
        blockedReason: str(data.blockedReason),
        blockedAtMs: ms(data.blockedAt),
        deleteAfterMs: ms(data.deleteAfter),
        deletedReason: str(data.deletedReason),
        ownerEmail: (typeof data.createdBy === "string" && userEmailById.get(data.createdBy)) || null,
        ownerUid: str(data.createdBy),
        userCount: userCount.get(doc.id) ?? 0,
        adminCount: adminCount.get(doc.id) ?? 0,
        employeeRecordCount: employeeCount.get(doc.id) ?? 0,
        recordCount: recordCount.get(doc.id) ?? 0,
        conversationCount: conversationCount.get(doc.id) ?? 0,
        lastActivityMs: lastActivity.get(doc.id) ?? null,
        billingStatus,
        plan: billingPlanForState(billingStatus, ms(sub.trialEndsAt), Date.now(), planOverride),
        planOverride,
        planOverrideNote: str(sub.planOverrideNote),
        packageId: str(sub.packageId),
        payingViaStripe: billingStatus === "active" || billingStatus === "past_due",
        freeMessagesUsed,
        openEscalations: openEscalations.get(doc.id) ?? 0,
        totalEscalations: totalEscalations.get(doc.id) ?? 0,
      };
    })
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export type ActivityPoint = { startMs: number; workspaces: number; records: number };

/** Workspaces created and records saved per bucket across a range (oldest first), plus which workspaces were active in it. */
export async function platformActivity(range: ResolvedRange): Promise<{ points: ActivityPoint[]; activeCompanyIds: Set<string> }> {
  const db = adminDb();
  const [companies, ledger] = await Promise.all([
    selectAll(db, COMPANIES, ["createdAt"]),
    selectAll(db, LEDGER, ["companyId", "date", "createdAt"]),
  ]);
  const points: ActivityPoint[] = range.bucketStarts.map((startMs) => ({ startMs, workspaces: 0, records: 0 }));
  const activeCompanyIds = new Set<string>();

  for (const doc of companies) {
    const at = ms(doc.get("createdAt"));
    const index = at === null ? -1 : bucketIndex(range, at);
    if (index >= 0) points[index].workspaces += 1;
  }
  for (const doc of ledger) {
    const at = ms(doc.get("date")) ?? ms(doc.get("createdAt"));
    const index = at === null ? -1 : bucketIndex(range, at);
    if (index < 0) continue;
    points[index].records += 1;
    const companyId = doc.get("companyId");
    if (typeof companyId === "string") activeCompanyIds.add(companyId);
  }
  return { points, activeCompanyIds };
}

export type PlatformUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "employee";
  status: string;
  companyId: string;
  createdAtMs: number | null;
  /** Set while the account is soft-deleted: when it will be permanently erased. */
  deleteAfterMs: number | null;
  /** Why the account was suspended or deleted. */
  reason: string | null;
  deleted: boolean;
};

const AUTH_LOOKUP_BATCH = 100;

/**
 * Accounts created before the sign-up date was saved have none in Firestore, but Firebase Auth always
 * records when the login was created. Failures leave the date unknown rather than breaking the page.
 */
async function authCreationTimes(uids: string[]): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (let start = 0; start < uids.length; start += AUTH_LOOKUP_BATCH) {
    try {
      const { users } = await adminAuth().getUsers(uids.slice(start, start + AUTH_LOOKUP_BATCH).map((uid) => ({ uid })));
      for (const user of users) {
        const created = Date.parse(user.metadata.creationTime);
        if (!Number.isNaN(created)) found.set(user.uid, created);
      }
    } catch {
      /* leave these dates unknown */
    }
  }
  return found;
}

/** Every account across every workspace. */
export async function listPlatformUsers(): Promise<PlatformUser[]> {
  const docs = await selectAll(adminDb(), USERS, ["email", "displayName", "role", "status", "companyId", "createdAt", "deletedAt", "deleteAfter", "deletedReason", "suspendedReason"]);
  const fromAuth = await authCreationTimes(docs.filter((doc) => ms(doc.get("createdAt")) === null).map((doc) => doc.id));
  return docs.map((doc) => ({
    id: doc.id,
    email: str(doc.get("email")) ?? "",
    displayName: str(doc.get("displayName")),
    role: doc.get("role") === "admin" ? "admin" : "employee",
    status: str(doc.get("status")) ?? "active",
    companyId: str(doc.get("companyId")) ?? "",
    createdAtMs: ms(doc.get("createdAt")) ?? fromAuth.get(doc.id) ?? null,
    deleteAfterMs: ms(doc.get("deleteAfter")),
    reason: str(doc.get("deletedReason")) ?? str(doc.get("suspendedReason")),
    deleted: doc.get("deletedAt") != null,
  }));
}

export async function listWorkspaceUsers(companyId: string): Promise<WorkspaceUser[]> {
  const snapshot = await adminDb()
    .collection(USERS)
    .where("companyId", "==", companyId)
    .select("email", "displayName", "role", "status", "createdAt")
    .get();
  const fromAuth = await authCreationTimes(snapshot.docs.filter((doc) => ms(doc.get("createdAt")) === null).map((doc) => doc.id));
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      email: str(doc.get("email")) ?? "",
      displayName: str(doc.get("displayName")),
      role: str(doc.get("role")) ?? "employee",
      status: str(doc.get("status")) ?? "active",
      createdAtMs: ms(doc.get("createdAt")) ?? fromAuth.get(doc.id) ?? null,
    }))
    .sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "admin" ? -1 : 1));
}

export async function listPlatformAudit({ companyId, limit = 100 }: { companyId?: string; limit?: number } = {}) {
  // Per-workspace history is small; filtering + ordering in one query would need a composite index.
  const snapshot = companyId
    ? await adminDb().collection(AUDIT).where("companyId", "==", companyId).get()
    : await adminDb().collection(AUDIT).orderBy("createdAt", "desc").limit(limit).get();
  const entries = snapshot.docs.map(
    (doc): PlatformAuditEntry => ({
      id: doc.id,
      action: doc.get("action"),
      companyId: doc.get("action") === "purge" ? null : (str(doc.get("companyId")) ?? null),
      companyName: str(doc.get("companyName")) ?? "Workspace",
      actorEmail: str(doc.get("actorEmail")),
      reason: str(doc.get("reason")),
      createdAtMs: ms(doc.get("createdAt")),
    }),
  );
  return entries.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)).slice(0, limit);
}

/** Applies a platform action and records who did it, in one transaction. */
export async function applyPlatformAction({
  companyId,
  action,
  reason,
  actor,
}: {
  companyId: string;
  action: WorkspaceAction;
  reason: string | null;
  actor: Pick<AuthSession, "uid" | "email">;
}) {
  const db = adminDb();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const subscriptionRef = db.collection(SUBSCRIPTIONS).doc(companyId);
  const auditRef = db.collection(AUDIT).doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const company = await transaction.get(companyRef);
    if (!company.exists) throw new NotFoundError("Workspace not found.");

    if (action === "block" || action === "unblock") {
      transaction.set(
        companyRef,
        action === "block"
          ? { status: "blocked", blockedReason: reason, blockedAt: now, blockedBy: actor.uid }
          : {
              status: "active",
              blockedReason: FieldValue.delete(),
              blockedAt: FieldValue.delete(),
              blockedBy: FieldValue.delete(),
              unblockedAt: now,
            },
        { merge: true },
      );
    } else {
      transaction.set(
        subscriptionRef,
        action === "grant_paid"
          ? { companyId, planOverride: "paid", planOverrideNote: reason, planOverrideBy: actor.uid, planOverrideAt: now, updatedAt: now }
          : {
              companyId,
              planOverride: FieldValue.delete(),
              planOverrideNote: FieldValue.delete(),
              planOverrideBy: FieldValue.delete(),
              planOverrideAt: FieldValue.delete(),
              updatedAt: now,
            },
        { merge: true },
      );
    }

    transaction.set(auditRef, {
      action,
      companyId,
      companyName: str(company.get("name")) ?? "Workspace",
      actorUid: actor.uid,
      actorEmail: actor.email,
      reason,
      createdAt: now,
    });
  });
}
