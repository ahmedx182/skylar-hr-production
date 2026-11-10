/** Desktop (system) notifications, used only when the person has allowed them and isn't looking at the tab. */

export function desktopAlertsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function desktopAlertsPermission(): NotificationPermission | "unsupported" {
  return desktopAlertsSupported() ? Notification.permission : "unsupported";
}

export async function requestDesktopAlerts(): Promise<NotificationPermission | "unsupported"> {
  if (!desktopAlertsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notification if allowed and the tab is in the background. Returns whether one was shown. */
export function desktopNotify(title: string, body: string, onClick?: () => void): boolean {
  if (!desktopAlertsSupported() || Notification.permission !== "granted" || document.visibilityState === "visible") return false;
  try {
    const notification = new Notification(title, { body, tag: title + body });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Puts "(3) " in front of the page title, and takes it off again at zero. */
export function setTitleCount(count: number): void {
  if (typeof document === "undefined") return;
  const base = document.title.replace(/^\(\d+\)\s/, "");
  document.title = count > 0 ? `(${count}) ${base}` : base;
}
