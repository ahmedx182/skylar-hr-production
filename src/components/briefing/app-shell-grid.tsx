"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { NAV_COLLAPSED_COOKIE, writePreferenceCookie } from "@/features/preferences/layout-preferences";
import { cn } from "@/lib/utils/cn";

export function AppShellGrid({
  initialCollapsed,
  title,
  tagline,
  bottomSlot,
  sidebar,
  children,
}: {
  initialCollapsed: boolean;
  title: string;
  tagline?: string;
  bottomSlot?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    writePreferenceCookie(NAV_COLLAPSED_COOKIE, next ? "1" : "0");
  }

  return (
    <section
      data-collapsed={collapsed}
      className={cn(
        "group/shell grid flex-1 gap-4 py-4 motion-safe:transition-[grid-template-columns] motion-safe:duration-200 motion-safe:ease-out",
        collapsed
          ? "lg:grid-cols-[56px_minmax(0,1fr)]"
          : "lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[212px_minmax(0,1fr)] 2xl:grid-cols-[224px_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "skylar-sidebar flex flex-col gap-3 border-t border-paper/10 pt-4 lg:sticky lg:top-[72px] lg:z-10 lg:h-[calc(100dvh-88px)] lg:self-start lg:overscroll-contain lg:border-r lg:border-t-0 lg:pt-2",
          // Collapsed items fit without scrolling, and visible overflow lets hover labels extend past the rail.
          collapsed ? "lg:overflow-visible lg:pr-2" : "lg:overflow-y-auto lg:pr-3",
        )}
      >
        <div className="flex items-start justify-between gap-2 lg:group-data-[collapsed=true]/shell:justify-center">
          <div className="min-w-0 pl-2 pt-1 lg:group-data-[collapsed=true]/shell:hidden">
            <p className="truncate text-xs font-semibold uppercase text-paper-3">{title}</p>
            {tagline && <p className="mt-1 text-xs leading-5 text-paper-2">{tagline}</p>}
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden size-8 shrink-0 place-items-center rounded-lg text-paper-3 transition-colors hover:bg-paper/[0.06] hover:text-paper lg:grid"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {sidebar}
        {bottomSlot && (
          <div className="mt-auto border-t border-paper/10 pt-3 lg:sticky lg:bottom-0 lg:bg-ink lg:pb-1">{bottomSlot}</div>
        )}
      </aside>

      <div className="skylar-page-content min-w-0">{children}</div>
    </section>
  );
}
