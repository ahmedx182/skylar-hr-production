import { MAGIC_EMAIL_STORAGE_KEY } from "@/constants/auth";

// Storage can be unavailable (private mode, blocked). The verify page falls back
// to asking for the email, so failing quietly here loses nothing.

const PENDING_SIGNUP_STORAGE_KEY = "skylar.pendingSignup";

export type PendingSignup = {
  email: string;
  companyName: string;
};

export function saveMagicEmail(email: string): void {
  try {
    window.localStorage.setItem(MAGIC_EMAIL_STORAGE_KEY, email);
  } catch {
    /* storage unavailable; verify will ask for the email */
  }
}

export function readMagicEmail(): string | null {
  try {
    return window.localStorage.getItem(MAGIC_EMAIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearMagicEmail(): void {
  try {
    window.localStorage.removeItem(MAGIC_EMAIL_STORAGE_KEY);
  } catch {
    /* storage unavailable; nothing to clear */
  }
}

export function savePendingSignup(signup: PendingSignup): void {
  try {
    window.localStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(signup));
  } catch {
    /* storage unavailable; verify will fall back to normal sign-in */
  }
}

export function readPendingSignup(email: string): PendingSignup | null {
  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSignup>;
    if (
      typeof parsed.email === "string" &&
      typeof parsed.companyName === "string" &&
      parsed.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      parsed.companyName.trim()
    ) {
      return {
        email: parsed.email.trim().toLowerCase(),
        companyName: parsed.companyName.trim(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function clearPendingSignup(): void {
  try {
    window.localStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
  } catch {
    /* storage unavailable; nothing to clear */
  }
}
