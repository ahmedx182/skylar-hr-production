"use client";

import { Archive, ArrowUpFromLine, CheckCircle2, CloudCheck, CloudOff, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { displayFeatures, formatPackagePrice, isFreePackage, type PricingPackage } from "@/features/pricing/package";
import { cn } from "@/lib/utils/cn";

export type PackageWithStats = PricingPackage & { subscribers: number };

type Draft = {
  id: string | null;
  name: string;
  description: string;
  priceUsd: string;
  interval: "month" | "year";
  featuresText: string;
  advisorMessageLimit: string;
  highlighted: boolean;
  badge: string;
  published: boolean;
  sortOrder: string;
};

type Notice = { tone: "success" | "warning" | "error"; text: string } | null;
type StripeResult = { status: "synced" | "skipped" | "failed"; message?: string; createdNewPrice?: boolean };

function emptyDraft(sortOrder: number): Draft {
  return {
    id: null,
    name: "",
    description: "",
    priceUsd: "",
    interval: "month",
    featuresText: "",
    advisorMessageLimit: "",
    highlighted: false,
    badge: "",
    published: true,
    sortOrder: String(sortOrder),
  };
}

function draftFrom(pkg: PricingPackage): Draft {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    priceUsd: pkg.priceCents ? String(pkg.priceCents / 100) : "0",
    interval: pkg.interval,
    featuresText: pkg.features.join("\n"),
    advisorMessageLimit: pkg.advisorMessageLimit === null ? "" : String(pkg.advisorMessageLimit),
    highlighted: pkg.highlighted,
    badge: pkg.badge ?? "",
    published: pkg.published,
    sortOrder: String(pkg.sortOrder),
  };
}

function previewPackage(draft: Draft): PricingPackage {
  const price = Number.parseFloat(draft.priceUsd);
  const limit = Number.parseInt(draft.advisorMessageLimit, 10);
  return {
    id: draft.id ?? "preview",
    name: draft.name.trim() || "Package name",
    description: draft.description.trim(),
    priceCents: Number.isFinite(price) ? Math.round(price * 100) : 0,
    interval: draft.interval,
    features: draft.featuresText.split("\n").map((line) => line.trim()).filter(Boolean),
    advisorMessageLimit: Number.isFinite(limit) ? limit : null,
    highlighted: draft.highlighted,
    badge: draft.badge.trim() || null,
    published: draft.published,
    archived: false,
    sortOrder: 0,
    stripeProductId: null,
    stripePriceId: null,
    createdAtMs: null,
    updatedAtMs: null,
  };
}

function stripeNotice(result: StripeResult | undefined, subject: string): Notice {
  if (!result || result.status === "synced") {
    return {
      tone: "success",
      text: result?.createdNewPrice
        ? `${subject} saved and a new Stripe price was created. Existing subscribers keep their current price.`
        : `${subject} saved.`,
    };
  }
  return { tone: result.status === "failed" ? "error" : "warning", text: result.message ?? `${subject} saved.` };
}

const inputClass =
  "h-10 w-full rounded-lg border border-paper/10 bg-ink px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/30 disabled:opacity-50";
const labelClass = "grid gap-1.5 text-xs font-semibold text-paper-3";

function PreviewCard({ pkg }: { pkg: PricingPackage }) {
  const price = formatPackagePrice(pkg);
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl p-6",
        pkg.highlighted ? "bg-sun/[0.06] ring-1 ring-sun/30" : "bg-paper/[0.04] ring-1 ring-paper/[0.08]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-paper">{pkg.name}</p>
        {pkg.badge && <span className="rounded-full bg-sun/15 px-2.5 py-1 text-[11px] font-semibold text-sun">{pkg.badge}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold leading-none text-paper">{price.amount}</span>
        <span className="text-sm text-paper-3">{price.period}</span>
      </div>
      {pkg.description && <p className="mt-2 text-sm leading-6 text-paper-3">{pkg.description}</p>}
      <ul className="mt-5 space-y-2.5">
        {displayFeatures(pkg).map((feature, index) => (
          <li key={`${feature}-${index}`} className="flex items-start gap-2.5 text-sm leading-5 text-paper-2">
            <CheckCircle2 className={cn("mt-px size-4 shrink-0", pkg.highlighted ? "text-sun" : "text-paper-3")} aria-hidden="true" />
            {feature}
          </li>
        ))}
        {displayFeatures(pkg).length === 0 && <li className="text-sm text-paper-3">No features listed yet.</li>}
      </ul>
    </div>
  );
}

export function PricingManager({ packages, stripeConfigured }: { packages: PackageWithStats[]; stripeConfigured: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const busy = isSaving || isRefreshing || busyId !== null;
  const editorOpen = draft !== null;

  useEffect(() => {
    if (!editorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDraft(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen]);
  const isFreeDraft = draft?.id !== null && draft?.id !== undefined && isFreePackage({ id: draft.id });

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const payload = (await response.json().catch(() => null)) as { stripe?: StripeResult; error?: { message?: string } } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? "That change could not be saved.");
    return payload;
  }

  async function save() {
    if (!draft) return;
    setIsSaving(true);
    setError("");
    try {
      const limit = draft.advisorMessageLimit.trim();
      const body = {
        name: draft.name,
        description: draft.description,
        priceUsd: Number.parseFloat(draft.priceUsd || "0"),
        interval: draft.interval,
        features: draft.featuresText.split("\n").map((line) => line.trim()).filter(Boolean),
        advisorMessageLimit: limit === "" ? null : Number.parseInt(limit, 10),
        highlighted: draft.highlighted,
        badge: draft.badge.trim() || null,
        published: draft.published,
        sortOrder: Number.parseInt(draft.sortOrder || "0", 10),
      };
      const payload = await request(draft.id ? `/api/platform/pricing/${encodeURIComponent(draft.id)}` : "/api/platform/pricing", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setNotice(stripeNotice(payload?.stripe, draft.name.trim() || "Package"));
      setDraft(null);
      startRefresh(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function act(pkg: PackageWithStats, action: "archive" | "restore" | "sync") {
    setBusyId(pkg.id);
    setNotice(null);
    try {
      const payload = await request(`/api/platform/pricing/${encodeURIComponent(pkg.id)}`, { method: "POST", body: JSON.stringify({ action }) });
      setNotice(
        action === "sync"
          ? stripeNotice(payload?.stripe, pkg.name)
          : { tone: "success", text: action === "archive" ? `${pkg.name} archived. Existing subscribers keep their plan.` : `${pkg.name} restored.` },
      );
      startRefresh(() => router.refresh());
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "That change could not be saved." });
    } finally {
      setBusyId(null);
    }
  }

  const nextSort = packages.reduce((max, pkg) => Math.max(max, pkg.sortOrder), 0) + 1;
  const buttonBase = "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="grid gap-5">
      {!stripeConfigured && (
        <p className="rounded-2xl bg-sun/10 px-4 py-3 text-sm leading-6 text-paper">
          Stripe isn&apos;t connected (no <code className="font-mono">STRIPE_SECRET_KEY</code>). Packages are saved here and shown on the landing page, but
          customers can&apos;t buy a paid package until it is synced to Stripe. Add the key, restart, then press Sync on each paid package.
        </p>
      )}

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-6 text-paper",
            notice.tone === "success" && "bg-success/10",
            notice.tone === "warning" && "bg-sun/10",
            notice.tone === "error" && "bg-risk/10",
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-paper-3">{packages.length} packages. The order below is the order on the landing page.</p>
        {!draft && (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft(nextSort));
              setError("");
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New package
          </button>
        )}
      </div>

      {draft && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={draft.id ? `Edit ${draft.name || "package"}` : "New package"}>
          <button
            type="button"
            aria-label="Close editor"
            tabIndex={-1}
            onClick={() => !busy && setDraft(null)}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-ink-2 shadow-[-24px_0_60px_rgba(0,0,0,0.45)] ring-1 ring-paper/[0.08]">
            <div className="flex items-center justify-between gap-3 border-b border-paper/10 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-paper">{draft.id ? `Edit ${draft.name || "package"}` : "New package"}</p>
                <p className="mt-0.5 text-xs text-paper-3">{draft.id ? "Changes apply to the landing page and Billing straight away." : "It appears on the landing page once published."}</p>
              </div>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="grid size-9 shrink-0 place-items-center rounded-lg text-paper-3 hover:bg-paper/[0.06] hover:text-paper">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Name
                    <input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={40} autoFocus className={inputClass} placeholder="Professional" />
                  </label>
                  <label className={labelClass}>
                    Badge (optional)
                    <input value={draft.badge} onChange={(event) => update("badge", event.target.value)} maxLength={24} className={inputClass} placeholder="Most teams" />
                  </label>
                </div>

                <label className={labelClass}>
                  Short description
                  <input value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={160} className={inputClass} placeholder="Per workspace, billed monthly." />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className={labelClass}>
                    Price (USD)
                    <input
                      value={isFreeDraft ? "0" : draft.priceUsd}
                      onChange={(event) => update("priceUsd", event.target.value)}
                      inputMode="decimal"
                      disabled={isFreeDraft}
                      className={inputClass}
                      placeholder="49"
                    />
                  </label>
                  <label className={labelClass}>
                    Billed
                    <select
                      value={draft.interval}
                      onChange={(event) => update("interval", event.target.value as Draft["interval"])}
                      disabled={isFreeDraft}
                      className={inputClass}
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Order on page
                    <input value={draft.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} inputMode="numeric" className={inputClass} />
                  </label>
                </div>

                {isFreeDraft && (
                  <label className={labelClass}>
                    Free advisor messages per workspace
                    <input
                      value={draft.advisorMessageLimit}
                      onChange={(event) => update("advisorMessageLimit", event.target.value)}
                      inputMode="numeric"
                      className={cn(inputClass, "sm:max-w-40")}
                    />
                    <span className="text-[11px] font-normal text-paper-3">Applies to every free workspace straight away, including ones that already used some.</span>
                  </label>
                )}

                <label className={labelClass}>
                  Features (one per line)
                  <textarea
                    value={draft.featuresText}
                    onChange={(event) => update("featuresText", event.target.value)}
                    rows={6}
                    className="rounded-lg border border-paper/10 bg-ink px-3 py-2 text-sm font-normal text-paper outline-none placeholder:text-paper-3 focus:border-paper/30"
                    placeholder={"Unlimited advisor messages\nPriority support"}
                  />
                  {isFreeDraft && <span className="text-[11px] font-normal text-paper-3">The message allowance is listed first automatically.</span>}
                </label>

                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm text-paper-2">
                    <input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="size-4 accent-[#F5AD44]" />
                    Show on landing page and in Billing
                  </label>
                  <label className="flex items-center gap-2 text-sm text-paper-2">
                    <input type="checkbox" checked={draft.highlighted} onChange={(event) => update("highlighted", event.target.checked)} className="size-4 accent-[#F5AD44]" />
                    Highlight this package
                  </label>
                </div>

                {!isFreeDraft && draft.id && (
                  <p className="text-xs leading-5 text-paper-3">
                    Changing the price creates a new Stripe price. Current subscribers stay on the price they signed up at.
                  </p>
                )}

                <div className="border-t border-paper/10 pt-4">
                  <p className="mb-2 text-xs font-semibold text-paper-3">Preview on the landing page</p>
                  <PreviewCard pkg={previewPackage(draft)} />
                </div>
              </div>
            </div>

            <div className="border-t border-paper/10 bg-ink-2 px-5 py-3">
              {error && <p className="mb-2 text-sm text-risk">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" disabled={busy} onClick={() => setDraft(null)} className={cn(buttonBase, "h-10 px-4 text-paper-2 hover:bg-paper/[0.06] hover:text-paper")}>
                  Cancel
                </button>
                <button type="button" disabled={busy} onClick={() => void save()} className={cn(buttonBase, "h-10 bg-paper px-5 text-ink hover:opacity-90")}>
                  {isSaving ? "Saving..." : draft.id ? "Save changes" : "Create package"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {packages.map((pkg) => {
          const price = formatPackagePrice(pkg);
          const isFree = isFreePackage(pkg);
          const synced = Boolean(pkg.stripePriceId);
          return (
            <div
              key={pkg.id}
              className={cn(
                "grid gap-4 rounded-2xl bg-paper/[0.045] p-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
                pkg.archived && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-paper">{pkg.name}</p>
                  {isFree && <span className="rounded-full bg-paper/[0.1] px-2 py-0.5 text-[11px] font-semibold text-paper-2">Default plan</span>}
                  {pkg.archived ? (
                    <span className="rounded-full bg-paper/[0.1] px-2 py-0.5 text-[11px] font-semibold text-paper-2">Archived</span>
                  ) : pkg.published ? (
                    <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">Published</span>
                  ) : (
                    <span className="rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-semibold text-sun">Draft</span>
                  )}
                  {pkg.highlighted && <span className="rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-semibold text-sun">Highlighted</span>}
                </div>
                <p className="mt-1 text-sm text-paper-2">
                  <span className="font-semibold text-paper">{price.amount}</span> {price.period}
                  <span className="mx-2 text-paper/20">|</span>
                  {isFree ? `${pkg.advisorMessageLimit ?? 0} free advisor messages` : "Unlimited advisor messages"}
                  <span className="mx-2 text-paper/20">|</span>
                  {pkg.features.length} features
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper-3">
                  {isFree ? (
                    <span>{pkg.subscribers} workspaces on this plan</span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        {synced ? <CloudCheck className="size-3.5 text-success" aria-hidden="true" /> : <CloudOff className="size-3.5 text-sun" aria-hidden="true" />}
                        {synced ? "Synced to Stripe" : "Not synced to Stripe"}
                      </span>
                      <span>{pkg.subscribers} subscribers</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(draftFrom(pkg));
                    setError("");
                  }}
                  className={cn(buttonBase, "bg-paper/[0.08] text-paper hover:bg-paper hover:text-ink")}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit
                </button>
                {!isFree && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(pkg, "sync")}
                    className={cn(buttonBase, "bg-sun/15 text-sun hover:bg-sun hover:text-ink")}
                  >
                    <ArrowUpFromLine className="size-3.5" aria-hidden="true" />
                    {busyId === pkg.id ? "Working..." : "Sync to Stripe"}
                  </button>
                )}
                {!isFree &&
                  (pkg.archived ? (
                    <button type="button" disabled={busy} onClick={() => void act(pkg, "restore")} className={cn(buttonBase, "bg-success/15 text-success hover:bg-success hover:text-ink")}>
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Restore
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => void act(pkg, "archive")} className={cn(buttonBase, "text-paper-3 hover:bg-paper/[0.08] hover:text-paper")}>
                      <Archive className="size-3.5" aria-hidden="true" />
                      Archive
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
