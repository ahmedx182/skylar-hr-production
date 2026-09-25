import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/constants/auth";
import { resolveSession } from "./resolve-session";

/** Deduped per request, so a layout and its page can both call it for one lookup. */
export const getSession = cache(() =>
  resolveSession(cookies().get(SESSION_COOKIE_NAME)?.value),
);
