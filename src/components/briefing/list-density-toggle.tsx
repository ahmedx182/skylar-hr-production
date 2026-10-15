"use client";

import { LayoutGrid, List, Rows3, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LIST_DENSITIES,
  LIST_DENSITY_COOKIE,
  writePreferenceCookie,
  type ListDensity,
} from "@/features/preferences/layout-preferences";
import { cn } from "@/lib/utils/cn";

const options: Record<ListDensity, { label: string; icon: LucideIcon }> = {
  comfortable: { label: "Comfortable", icon: Rows3 },
  compact: { label: "Compact", icon: List },
  grid: { label: "Grid", icon: LayoutGrid },
};

/** Without onChange, the server-rendered list is refreshed to pick up the new cookie. */
export function ListDensityToggle({
  value,
  onChange,
}: {
  value: ListDensity;
  onChange?: (density: ListDensity) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [isPending, startTransition] = useTransition();

  function choose(density: ListDensity) {
    if (density === selected) return;
    setSelected(density);
    writePreferenceCookie(LIST_DENSITY_COOKIE, density);
    if (onChange) {
      onChange(density);
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="List layout"
      aria-busy={isPending}
      className="inline-flex shrink-0 rounded-xl bg-ink/70 p-1"
    >
      {LIST_DENSITIES.map((density) => {
        const { label, icon: Icon } = options[density];
        const isActive = selected === density;
        return (
          <button
            key={density}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => choose(density)}
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              isActive ? "bg-paper text-ink" : "text-paper-3 hover:text-paper",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
