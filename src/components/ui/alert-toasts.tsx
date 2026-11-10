"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type AlertToast = {
  id: string;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
};

/** Pop-up alerts stacked under the header. Each one can be dismissed, and offers at most two actions. */
export function AlertToasts({ toasts, onDismiss }: { toasts: AlertToast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (toasts.length === 0 || !mounted) return null;

  // Rendered on the page root: inside an animated or transformed page section, `fixed` would anchor to that section
  // instead of the window, and inherit its fade.
  return createPortal(
    <div className="pointer-events-none fixed right-3 top-16 z-40 grid w-[min(360px,calc(100vw-1.5rem))] gap-2" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto grid gap-1.5 rounded-xl bg-ink-2 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(244,239,231,0.08)]"
        >
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-paper">{toast.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-paper-3">{toast.body}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="grid size-6 shrink-0 place-items-center rounded-md text-paper-3 transition-colors hover:bg-paper/[0.08] hover:text-paper"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          {(toast.action || toast.secondary) && (
            <div className="flex flex-wrap items-center gap-2 pl-6">
              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.onClick}
                  className="inline-flex h-7 items-center rounded-full bg-paper px-3 text-xs font-semibold text-ink transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  {toast.action.label}
                </button>
              )}
              {toast.secondary && (
                <button type="button" onClick={toast.secondary.onClick} className="text-xs font-semibold text-paper-3 underline-offset-2 transition-colors hover:text-paper hover:underline">
                  {toast.secondary.label}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}
