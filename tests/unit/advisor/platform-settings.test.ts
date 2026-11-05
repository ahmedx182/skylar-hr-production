import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const sets: { path: string; data: Record<string, unknown> }[] = [];
  const failRead = { value: false };
  const db = {
    collection: (name: string) => ({
      doc: (id?: string) => {
        const path = `${name}/${id ?? `auto${sets.length}`}`;
        return {
          path,
          get: async () => {
            if (failRead.value) throw new Error("firestore down");
            return { exists: store.has(path), data: () => store.get(path) };
          },
        };
      },
    }),
    batch: () => {
      const ops: (() => void)[] = [];
      return {
        set: (ref: { path: string }, data: Record<string, unknown>) => void ops.push(() => { sets.push({ path: ref.path, data }); store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data }); }),
        commit: async () => ops.forEach((op) => op()),
      };
    },
  };
  return { store, sets, failRead, db };
});

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: () => h.db }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ ADVISOR_BUSINESS_TIMEZONE: "Asia/Karachi" }) }));

import { clearAdvisorSettingsCache, getAdvisorSettings, saveAdvisorSettings } from "@/server/repositories/platform-settings.repository";

const actor = { uid: "boss", email: "boss@skylar.app" };
const good = { hours: { timeZone: "Europe/London", startHour: 8, endHour: 18, workDays: [5, 1, 3] }, freeTrialDays: 30 };

describe("advisor settings", () => {
  beforeEach(() => {
    h.store.clear();
    h.sets.length = 0;
    h.failRead.value = false;
    clearAdvisorSettingsCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("starts at Mon-Fri 9-5 in the configured zone with a 14-day trial", async () => {
    expect(await getAdvisorSettings()).toEqual({ hours: { timeZone: "Asia/Karachi", startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5] }, freeTrialDays: 14 });
  });

  it("saves, sorts the days, audits who changed what, and shows the change at once", async () => {
    const saved = await saveAdvisorSettings(good, actor);
    expect(saved.hours.workDays).toEqual([1, 3, 5]);
    expect(h.store.get("platform_settings/advisor")).toMatchObject({ freeTrialDays: 30, updatedBy: "boss", updatedByEmail: "boss@skylar.app" });
    const audit = h.sets.find((entry) => entry.path.startsWith("platform_audit_log/"));
    expect(audit?.data).toMatchObject({ action: "advisor_settings_update", actorEmail: "boss@skylar.app" });
    expect(String(audit?.data.reason)).toContain("Mon, Wed, Fri, 08:00–18:00 Europe/London");
    expect(String(audit?.data.reason)).toContain("30 days");
    expect(await getAdvisorSettings()).toEqual({ hours: { timeZone: "Europe/London", startHour: 8, endHour: 18, workDays: [1, 3, 5] }, freeTrialDays: 30 });
  });

  it("describes a trial with no time limit in the audit entry", async () => {
    await saveAdvisorSettings({ ...good, freeTrialDays: 0 }, actor);
    expect(String(h.sets.find((entry) => entry.path.startsWith("platform_audit_log/"))?.data.reason)).toContain("no time limit");
  });

  it.each([
    [{ hours: { ...good.hours, timeZone: "Mars/Base" } }, "time zone"],
    [{ hours: { ...good.hours, startHour: 18, endHour: 8 } }, "end after they start"],
    [{ hours: { ...good.hours, workDays: [] } }, "at least one"],
    [{ freeTrialDays: -1 }, "free trial"],
    [{ freeTrialDays: 400 }, "free trial"],
    [{ freeTrialDays: 2.5 }, "free trial"],
  ])("refuses to save %j", async (change, message) => {
    await expect(saveAdvisorSettings({ ...good, ...change }, actor)).rejects.toThrow(message);
    expect(h.sets).toHaveLength(0);
  });

  it("reads what was saved, after the short cache has passed", async () => {
    h.store.set("platform_settings/advisor", { hours: { timeZone: "Europe/Berlin", startHour: 10, endHour: 16, workDays: [2, 4] }, freeTrialDays: 7 });
    expect(await getAdvisorSettings(1_000)).toMatchObject({ hours: { timeZone: "Europe/Berlin", startHour: 10, endHour: 16, workDays: [2, 4] }, freeTrialDays: 7 });
    h.store.set("platform_settings/advisor", { hours: { timeZone: "Europe/Berlin", startHour: 11, endHour: 16, workDays: [2, 4] }, freeTrialDays: 7 });
    expect((await getAdvisorSettings(5_000)).hours.startHour).toBe(10); // cached
    expect((await getAdvisorSettings(20_000)).hours.startHour).toBe(11); // refreshed
  });

  it("falls back to the defaults for a damaged record, and when the database can't be read", async () => {
    h.store.set("platform_settings/advisor", { hours: { timeZone: "nope", startHour: 20, endHour: 3, workDays: [] }, freeTrialDays: "lots" });
    expect(await getAdvisorSettings()).toEqual({ hours: { timeZone: "Asia/Karachi", startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5] }, freeTrialDays: 14 });
    clearAdvisorSettingsCache();
    h.failRead.value = true;
    expect(await getAdvisorSettings()).toMatchObject({ freeTrialDays: 14, hours: { startHour: 9, endHour: 17 } });
  });
});
