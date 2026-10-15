export type ListDensity = "comfortable" | "compact" | "grid";

export const LIST_DENSITIES: readonly ListDensity[] = ["comfortable", "compact", "grid"];
export const LIST_DENSITY_COOKIE = "skylar_list_density";
export const NAV_COLLAPSED_COOKIE = "skylar_nav_collapsed";

export function parseListDensity(value: string | undefined): ListDensity {
  return LIST_DENSITIES.includes(value as ListDensity) ? (value as ListDensity) : "comfortable";
}

export function parseNavCollapsed(value: string | undefined): boolean {
  return value === "1";
}

/** Client-only: remembers a layout choice in this browser for a year. */
export function writePreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}
