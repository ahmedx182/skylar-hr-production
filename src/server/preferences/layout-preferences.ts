import "server-only";
import { cookies } from "next/headers";
import {
  LIST_DENSITY_COOKIE,
  NAV_COLLAPSED_COOKIE,
  parseListDensity,
  parseNavCollapsed,
} from "@/features/preferences/layout-preferences";

export function getLayoutPreferences() {
  const store = cookies();
  return {
    listDensity: parseListDensity(store.get(LIST_DENSITY_COOKIE)?.value),
    navCollapsed: parseNavCollapsed(store.get(NAV_COLLAPSED_COOKIE)?.value),
  };
}
