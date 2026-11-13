"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { describeDiscount, promotionCodeState, type PromotionCodeState, type PromotionCodeSummary } from "@/features/pricing/promotion-code";
import { formatDate } from "@/features/platform/format";
import { cn } from "@/lib/utils/cn";

type Notice = { tone: "success" | "error"; text: string } | null;

type Draft = {
  /** Set when editing: the code being replaced. */
  replacesId: string | null;
  code: string;
  percentOff: string;
  duration: "once" | "repeating" | "forever";
  months: string;
  expiresOn: string;
  maxRedemptions: string;
};

const emptyDraft: Draft = { replacesId: null, code: "", percentOff: "100", duration: "repeating", months: "1", expiresOn: "", maxRedemptions: "" };

const inputClass =
  "h-10 w-full rounded-lg border border-paper/10 bg-ink px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/30 disabled:opacity-50";
const labelClass = "grid gap-1.5 text-xs font-semibold text-paper-3";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateInputValue(ms: number | null): string {
  if (ms === null) return "";
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function draftFrom(code: PromotionCodeSummary): Draft {
  return {
    replacesId: code.id,
    code: code.code,
    percentOff: String(code.percentOff ?? 100),
    duration: code.duration,
    months: String(code.durationInMonths ?? 1),
    expiresOn: dateInputValue(code.expiresAtMs),
    maxRedemptions: code.maxRedemptions === null ? "" : String(code.maxRedemptions),
  };
}

/** The last moment of the chosen day in the admin's own timezone, so "ends 31 Dec" means the whole of 31 Dec. */
function endOfDayMs(value: string): number | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

const stateLabel: Record<PromotionCodeState, string> = { active: "On", off: "Off", expired: "Expired" };

function usage(code: PromotionCodeSummary): string {
  return code.maxRedemptions === null ? `${code.timesRedeemed} used` : `${code.timesRedeemed} of ${code.maxRedemptions} used`;
}

export function PromotionCodesPanel({ codes, loadError }: { codes: PromotionCodeSummary[]; loadError: string | null }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const editorOpen = draft !== null;

  useEffect(() => {
    if (!editorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) setDraft(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen, isSaving]);

  const onCount = codes.filter((code) => promotionCodeState(code) === "active").length;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!draft) return;
    const expiresAtMs = endOfDayMs(draft.expiresOn);
    const percentOff = Number.parseFloat(draft.percentOff);
    if (!/^[A-Za-z0-9-]{3,32}$/.test(draft.code.trim())) return setFormError("Use 3 to 32 letters, numbers or dashes for the code.");
    if (!(percentOff >= 1 && percentOff <= 100)) return setFormError("Percent off must be between 1 and 100.");
    if (draft.duration === "repeating" && !(Number.parseInt(draft.months, 10) >= 1)) return setFormError("Enter how many months the discount lasts.");
    if (expiresAtMs !== null && expiresAtMs <= Date.now()) return setFormError("The expiry date must be in the future.");

    const editing = draft.replacesId !== null;
    setIsSaving(true);
    setFormError("");
    try {
      const response = await fetch(editing ? `/api/platform/promotion-codes/${encodeURIComponent(draft.replacesId as string)}` : "/api/platform/promotion-codes", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: draft.code,
          percentOff,
          duration: draft.duration,
          durationInMonths: draft.duration === "repeating" ? Number.parseInt(draft.months, 10) : null,
          expiresAtMs,
          maxRedemptions: draft.maxRedemptions.trim() ? Number.parseInt(draft.maxRedemptions, 10) : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "That promo code could not be saved.");
      const name = draft.code.trim().toUpperCase();
      setNotice({
        tone: "success",
        text: editing ? `${name} updated. The previous version is turned off and anyone who already used it keeps their discount.` : `${name} created. Customers can enter it at checkout.`,
      });
      setDraft(null);
      startRefresh(() => router.refresh());
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "That promo code could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(code: PromotionCodeSummary) {
    const next = !code.active;
    setBusyId(code.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/platform/promotion-codes/${encodeURIComponent(code.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "That promo code could not be changed.");
      setNotice({
        tone: "success",
        text: next ? `${code.code} is on. Customers can enter it at checkout.` : `${code.code} is off. Customers who already used it keep their discount.`,
      });
      startRefresh(() => router.refresh());
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "That promo code could not be changed." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="promo-codes-heading" className="grid content-start gap-5">
      <h2 id="promo-codes-heading" className="sr-only">
        Promo codes
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-paper-3">
          {loadError ? "Promo codes" : `${codes.length} ${codes.length === 1 ? "code" : "codes"}, ${onCount} on. Customers enter them on the Stripe checkout page.`}
        </p>
        {!draft && !loadError && (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setFormError("");
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New promo code
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className={cn("rounded-2xl px-4 py-3 text-sm leading-6 text-paper", notice.tone === "success" ? "bg-success/10" : "bg-risk/10")}>
          {notice.text}
        </p>
      )}

      {draft &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex justify-center overflow-y-auto p-4 [@media(max-height:520px)]:p-2"
            role="dialog"
            aria-modal="true"
            aria-label={draft.replacesId ? `Edit ${draft.code}` : "New promo code"}
          >
            <button
              type="button"
              aria-label="Close editor"
              tabIndex={-1}
              onClick={() => !isSaving && setDraft(null)}
              className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
            />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
              className="relative my-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-paper/[0.08]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-paper/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-paper">{draft.replacesId ? `Edit ${draft.code}` : "New promo code"}</p>
                  <p className="mt-0.5 text-xs text-paper-3">
                    {draft.replacesId ? "Saving creates an updated code and turns this one off." : "Customers can enter it on the Stripe checkout page."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close editor"
                  onClick={() => setDraft(null)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-paper-3 transition-colors hover:bg-paper/[0.06] hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto overscroll-contain px-5 py-5">
                {draft.replacesId && (
                  <p className="rounded-xl bg-sun/10 px-3.5 py-3 text-xs leading-5 text-paper-2">
                    Stripe fixes a code&apos;s discount, expiry and limit when it is created, so an edit replaces the code. Anyone who already used it keeps their discount, and the
                    use count starts again at zero.
                  </p>
                )}
                <label className={labelClass}>
                  Code
                  <input
                    className={cn(inputClass, "font-mono uppercase")}
                    value={draft.code}
                    onChange={(event) => update("code", event.target.value)}
                    placeholder="FREE30"
                    maxLength={32}
                    autoComplete="off"
                    autoFocus
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Percent off
                    <input className={inputClass} type="number" min={1} max={100} step="any" value={draft.percentOff} onChange={(event) => update("percentOff", event.target.value)} required />
                  </label>
                  <label className={labelClass}>
                    Lasts
                    <select className={inputClass} value={draft.duration} onChange={(event) => update("duration", event.target.value as Draft["duration"])}>
                      <option value="repeating">A number of months</option>
                      <option value="once">First payment only</option>
                      <option value="forever">Forever</option>
                    </select>
                  </label>
                  {draft.duration === "repeating" && (
                    <label className={cn(labelClass, "sm:col-span-2")}>
                      Months
                      <input className={cn(inputClass, "sm:max-w-40")} type="number" min={1} max={36} step={1} value={draft.months} onChange={(event) => update("months", event.target.value)} required />
                    </label>
                  )}
                  <label className={labelClass}>
                    Code expires (optional)
                    <input className={inputClass} type="date" value={draft.expiresOn} onChange={(event) => update("expiresOn", event.target.value)} />
                  </label>
                  <label className={labelClass}>
                    Max uses (optional)
                    <input className={inputClass} type="number" min={1} step={1} value={draft.maxRedemptions} onChange={(event) => update("maxRedemptions", event.target.value)} placeholder="Unlimited" />
                  </label>
                </div>
              </div>

              <div className="border-t border-paper/10 bg-ink-2 px-5 py-3">
                {formError && (
                  <p role="alert" className="mb-2 text-sm text-risk">
                    {formError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    disabled={isSaving}
                    className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-paper-2 transition-colors hover:bg-paper/[0.06] hover:text-paper disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : draft.replacesId ? "Save changes" : "Create code"}
                  </button>
                </div>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {loadError ? (
        <p className="rounded-2xl bg-risk/10 px-4 py-3 text-sm leading-6 text-paper">{loadError}</p>
      ) : codes.length ? (
        <div className="overflow-x-auto rounded-[22px] bg-paper/[0.04] ring-1 ring-paper/[0.08]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="text-xs text-paper-3">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-3 py-3 font-medium">Discount</th>
                <th className="px-3 py-3 font-medium">Use</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const state = promotionCodeState(code);
                const busy = busyId === code.id || isRefreshing || isSaving;
                return (
                  <tr key={code.id} className="border-t border-paper/[0.06] align-middle transition-colors hover:bg-paper/[0.02]">
                    <td className="px-5 py-4 font-mono font-medium text-paper">{code.code}</td>
                    <td className="px-3 py-4 text-paper-2">{describeDiscount(code)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-paper-3">
                      <span className="tabular-nums">{usage(code)}</span>
                      {code.expiresAtMs !== null && <span className="block text-xs">{state === "expired" ? "Ended" : "Ends"} {formatDate(code.expiresAtMs)}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={cn(
                            "w-[3.75rem] rounded-full px-2.5 py-1 text-center text-[11px] font-semibold",
                            state === "active" && "bg-success/10 text-success",
                            state === "off" && "bg-paper/[0.07] text-paper-3",
                            state === "expired" && "bg-risk/10 text-risk",
                          )}
                        >
                          {stateLabel[state]}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={code.active}
                          aria-label={`${code.code} promo code`}
                          disabled={busy || (state === "expired" && !code.active)}
                          onClick={() => void toggle(code)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 disabled:cursor-not-allowed disabled:opacity-40",
                            code.active ? "bg-success" : "bg-paper/20",
                          )}
                        >
                          <span aria-hidden="true" className={cn("inline-block size-4 rounded-full bg-paper transition-transform", code.active ? "translate-x-6" : "translate-x-1")} />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDraft(draftFrom(code));
                            setFormError("");
                            setNotice(null);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-paper-2 transition-colors hover:bg-paper/[0.08] hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 disabled:opacity-50"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-[22px] bg-paper/[0.04] px-5 py-10 text-center text-sm text-paper-3 ring-1 ring-paper/[0.08]">No promo codes yet. Create one with New promo code.</p>
      )}
    </section>
  );
}
