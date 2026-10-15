import { ACCOUNT_DELETED_PATH, ACCOUNT_SUSPENDED_PATH } from "@/constants/routes";

/**
 * Why an account can't sign in. A deleted account is only "deleted" to the person it belonged to;
 * platform admins can still restore it during the retention period.
 */
export type AccountBlockState = "suspended" | "deleted";

export const ACCOUNT_BLOCK_CODES: Record<AccountBlockState, string> = {
  suspended: "account_suspended",
  deleted: "account_deleted",
};

const PATHS: Record<AccountBlockState, string> = {
  suspended: ACCOUNT_SUSPENDED_PATH,
  deleted: ACCOUNT_DELETED_PATH,
};

export function accountBlockPath(state: AccountBlockState): string {
  return PATHS[state];
}

/** Null means the account can sign in. */
export function accountBlockStateOf(user: { status: string; deletedAt?: unknown }): AccountBlockState | null {
  if (user.status === "active" && user.deletedAt == null) return null;
  return user.deletedAt != null ? "deleted" : "suspended";
}

export function accountBlockStateFromCode(code: unknown): AccountBlockState | null {
  return (Object.keys(ACCOUNT_BLOCK_CODES) as AccountBlockState[]).find((state) => ACCOUNT_BLOCK_CODES[state] === code) ?? null;
}

/** Thrown in the browser when the server says this account is blocked, so forms can send the person to the right page. */
export class AccountBlockedClientError extends Error {
  readonly path: string;

  constructor(state: AccountBlockState) {
    super(state === "deleted" ? "This account has been deleted." : "This account has been suspended.");
    this.path = accountBlockPath(state);
  }
}
