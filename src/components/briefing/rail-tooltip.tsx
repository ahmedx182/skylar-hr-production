/** Hover/focus label for icon-only sidebar items. The parent needs `group relative`. */
export function RailTooltip({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:group-data-[collapsed=true]/shell:block"
    >
      {label}
    </span>
  );
}
