import { MAGIC_EMAIL_STORAGE_KEY } from "@/constants/auth";

// Storage can be unavailable (private mode, blocked). The verify page falls back
// to asking for the email, so failing quietly here loses nothing.

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
