import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { DEFAULT_TIME_ZONE, describeHours, hoursProblem, normalizeHours, type AdvisorHours } from "@/features/advisor/hours";
import { DEFAULT_FREE_TRIAL_DAYS, isValidTrialDays, normalizeTrialDays } from "@/features/advisor/trial";
import { ValidationError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env/server";
import { adminDb } from "@/lib/firebase/admin";
import type { AuthSession } from "@/types/auth";

const SETTINGS = "platform_settings";
const ADVISOR_DOC = "advisor";
const AUDIT = "platform_audit_log";
/** Short, so a change made in the console reaches every server instance within moments, but chat doesn't read it every time. */
const CACHE_MS = 15_000;

export type AdvisorSettings = {
  hours: AdvisorHours;
  /** Days of free use for a new workspace. 0 means no time limit. */
  freeTrialDays: number;
};

let cached: { at: number; value: AdvisorSettings } | null = null;

function envTimeZone(): string {
  try {
    return getServerEnv().ADVISOR_BUSINESS_TIMEZONE ?? DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Never throws: if the settings can't be read, the defaults apply, so a transfer or a message is never blocked by it. */
export async function getAdvisorSettings(nowMs = Date.now()): Promise<AdvisorSettings> {
  if (cached && nowMs - cached.at < CACHE_MS) return cached.value;
  let value: AdvisorSettings;
  try {
    const doc = await adminDb().collection(SETTINGS).doc(ADVISOR_DOC).get();
    const data = doc.exists ? doc.data() ?? {} : {};
    value = { hours: normalizeHours(data.hours, envTimeZone()), freeTrialDays: normalizeTrialDays(data.freeTrialDays) };
  } catch (error) {
    console.error("Could not read the advisor settings; using the defaults", error);
    value = { hours: normalizeHours(undefined, envTimeZone()), freeTrialDays: DEFAULT_FREE_TRIAL_DAYS };
  }
  cached = { at: nowMs, value };
  return value;
}

/** For tests, and so the person who just saved sees their change at once. */
export function clearAdvisorSettingsCache(): void {
  cached = null;
}

export async function saveAdvisorSettings(input: AdvisorSettings, actor: Pick<AuthSession, "uid" | "email">): Promise<AdvisorSettings> {
  const problem = hoursProblem(input.hours);
  if (problem) throw new ValidationError(problem);
  if (!isValidTrialDays(input.freeTrialDays)) throw new ValidationError("The free trial must be a whole number of days from 0 to 365.");

  const value: AdvisorSettings = {
    hours: { ...input.hours, workDays: [...input.hours.workDays].sort((a, b) => a - b) },
    freeTrialDays: input.freeTrialDays,
  };
  const db = adminDb();
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection(SETTINGS).doc(ADVISOR_DOC), { ...value, updatedAt: now, updatedBy: actor.uid, updatedByEmail: actor.email }, { merge: true });
  batch.set(db.collection(AUDIT).doc(), {
    action: "advisor_settings_update",
    kind: "workspace",
    companyId: null,
    userId: null,
    companyName: "HR advisor settings",
    actorUid: actor.uid,
    actorEmail: actor.email,
    reason: `Hours ${describeHours(value.hours)}; free trial ${value.freeTrialDays === 0 ? "no time limit" : `${value.freeTrialDays} days`}`,
    createdAt: now,
  });
  await batch.commit();
  cached = { at: Date.now(), value };
  return value;
}
