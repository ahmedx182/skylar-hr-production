"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type Tab = { id: string; label: string };

export function SettingsTabs({
  tabs,
  children,
}: {
  tabs: Tab[];
  children: React.ReactNode[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl bg-paper/[0.04] p-1 ring-1 ring-paper/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
              active === tab.id
                ? "bg-paper text-ink shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                : "text-paper-3 hover:text-paper",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {/* `grid` overrides the `hidden` attribute's display:none, so render only the active panel. */}
      {tabs.map((tab, i) =>
        active === tab.id ? (
          <div
            key={tab.id}
            role="tabpanel"
            className="grid content-start gap-4 animate-[fadeUp_0.25s_ease_both]"
          >
            {children[i]}
          </div>
        ) : null,
      )}
    </div>
  );
}
