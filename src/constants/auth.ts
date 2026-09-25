export const ROLES = ["employee", "admin"] as const;

export const SESSION_COOKIE_NAME = "__session";

/** Explicit session lifetime (§16). Firebase accepts 5 minutes to 14 days. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/** Cross-device magic-link email hand-off (§15.3). */
export const MAGIC_EMAIL_STORAGE_KEY = "skylar_magic_email";
