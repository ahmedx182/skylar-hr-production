"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationLedgerSummary } from "@/features/briefing/ledger-display";

export function ConversationActionPanel({
  summary,
  storageKey,
}: {
  summary: ConversationLedgerSummary;
  storageKey: string;
}) {
  const actions = useMemo(
    () =>
      [
        ...summary.prepItems.map((item) => ({ group: "Before the conversation", text: item })),
        ...summary.outlineItems.map((item) => ({ group: "Conversation outline", text: item })),
        ...summary.nextSteps.map((item) => ({ group: "After the conversation", text: item })),
      ].slice(0, 10),
    [summary.outlineItems, summary.prepItems, summary.nextSteps],
  );
  const actionIds = useMemo(
    () => new Set(actions.map((action) => `${action.group}:${action.text}`)),
    [actions],
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  const localStorageKey = `skylar:conversation-checklist:${storageKey}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(localStorageKey);
      const saved = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(saved)) {
        setChecked(new Set(saved.filter((id): id is string => typeof id === "string" && actionIds.has(id))));
      }
    } catch {
      setChecked(new Set());
    } finally {
      setHasLoadedSavedState(true);
    }
  }, [actionIds, localStorageKey]);

  useEffect(() => {
    if (!hasLoadedSavedState) return;
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(Array.from(checked).filter((id) => actionIds.has(id))));
    } catch {
      // Browser storage can be unavailable in private modes. The checklist still works for this session.
    }
  }, [actionIds, checked, hasLoadedSavedState, localStorageKey]);

  if (actions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-4 text-ink md:px-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Action checklist</p>
          <p className="mt-1 text-sm leading-6 text-ink/55">Use this as the working view before you open the full transcript.</p>
        </div>
        <span className="rounded-full bg-ink/[0.06] px-3 py-1 font-mono text-xs uppercase text-ink/55">
          {checked.size}/{actions.length}
        </span>
      </div>

      <div className="mt-4 grid overflow-hidden rounded-xl border border-ink/10 bg-paper/70">
        {actions.map((action, index) => {
          const id = `${action.group}:${action.text}`;
          const isChecked = checked.has(id);

          return (
            <label
              key={id}
              className="grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-ink/10 px-3 py-3 transition-colors last:border-b-0 hover:bg-ink/[0.035]"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  setChecked((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-5 place-items-center rounded-full border ${
                  isChecked ? "border-success bg-success text-ink" : "border-ink/20 text-transparent"
                }`}
              >
                <CheckCircle2 className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="font-mono text-[11px] uppercase text-ink/40">
                  {index + 1}. {action.group}
                </span>
                <span className={`mt-1 block text-sm leading-6 ${isChecked ? "text-ink/35 line-through" : "text-ink/68"}`}>
                  {action.text}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
