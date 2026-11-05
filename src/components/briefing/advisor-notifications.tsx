"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertToasts, type AlertToast } from "@/components/ui/alert-toasts";
import { freshActivity, noticeText, unreadNotices, type CaseNotice, type SeenMap } from "@/features/advisor/notices";
import { desktopAlertsPermission, desktopNotify, requestDesktopAlerts, setTitleCount } from "@/lib/desktop-notify";
import { useEventStream } from "@/lib/use-event-stream";

const EVENTS = ["notices"] as const;
const SEEN_KEY = "skylar:advisor-seen";
const SINCE_KEY = "skylar:advisor-since";
const ASKED_KEY = "skylar:desktop-alerts-asked";
const MAX_TOASTS = 3;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked; notifications still work for this session.
  }
}

/** When this browser first started listening, so history from before then never shows up as unread. */
function listeningSince(): number {
  const saved = readJson<number | null>(SINCE_KEY, null);
  if (saved) return saved;
  const now = Date.now();
  writeJson(SINCE_KEY, now);
  return now;
}

/**
 * Tells a manager, wherever they are in the app, when an HR advisor joins, replies or closes their chat:
 * a pop-up, an unread count on the Skylar button, the page title, and a desktop notification if allowed.
 * It listens to one server-sent stream and stays quiet about a chat they are looking at.
 */
export function AdvisorNotifications() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const [unread, setUnread] = useState(0);
  const notices = useRef<CaseNotice[]>([]);
  const previous = useRef<CaseNotice[] | null>(null);
  const seen = useRef<SeenMap>({});
  const since = useRef(0);
  const viewing = useRef(new Set<string>());

  const recount = useCallback(() => {
    const count = unreadNotices(notices.current, seen.current, since.current).length;
    setUnread(count);
    window.dispatchEvent(new CustomEvent("skylar:unread", { detail: { count } }));
  }, []);

  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const openChat = useCallback(
    (notice: CaseNotice) => {
      window.dispatchEvent(new CustomEvent("skylar:open", { detail: { employeeId: notice.employeeId, employeeName: notice.employeeName } }));
      dismiss(notice.escalationId);
    },
    [dismiss],
  );

  useEffect(() => {
    seen.current = readJson<SeenMap>(SEEN_KEY, {});
    since.current = listeningSince();

    function onThread(event: Event) {
      const { escalationId, mounted } = (event as CustomEvent<{ escalationId: string; mounted: boolean }>).detail;
      if (mounted) viewing.current.add(escalationId);
      else viewing.current.delete(escalationId);
    }
    function onRead(event: Event) {
      const { escalationId } = (event as CustomEvent<{ escalationId: string }>).detail;
      const notice = notices.current.find((item) => item.escalationId === escalationId);
      seen.current = { ...seen.current, [escalationId]: Math.max(Date.now(), notice?.activityAtMs ?? 0) };
      writeJson(SEEN_KEY, seen.current);
      dismiss(escalationId);
      recount();
    }
    window.addEventListener("skylar:advisor-thread", onThread);
    window.addEventListener("skylar:advisor-read", onRead);
    return () => {
      window.removeEventListener("skylar:advisor-thread", onThread);
      window.removeEventListener("skylar:advisor-read", onRead);
    };
  }, [dismiss, recount]);

  const onEvent = useCallback(
    (_event: string, data: unknown) => {
      const next = data as CaseNotice[];
      const fresh = freshActivity(previous.current, next);
      previous.current = next;
      notices.current = next;

      const pageVisible = document.visibilityState === "visible";
      for (const notice of fresh) {
        // They're reading this chat right now, so a pop-up would only repeat it.
        if (pageVisible && viewing.current.has(notice.escalationId)) continue;
        const text = noticeText(notice);
        const shownDesktop = desktopNotify(text.title, text.body, () => openChat(notice));
        if (shownDesktop && !pageVisible) continue;
        const asked = readJson<boolean>(ASKED_KEY, false);
        setToasts((current) =>
          [
            ...current.filter((toast) => toast.id !== notice.escalationId),
            {
              id: notice.escalationId,
              title: text.title,
              body: text.body,
              action: { label: "Open chat", onClick: () => openChat(notice) },
              secondary:
                !asked && desktopAlertsPermission() === "default"
                  ? {
                      label: "Turn on desktop alerts",
                      onClick: () => {
                        writeJson(ASKED_KEY, true);
                        void requestDesktopAlerts();
                        dismiss(notice.escalationId);
                      },
                    }
                  : undefined,
            },
          ].slice(-MAX_TOASTS),
        );
      }
      recount();
    },
    [dismiss, openChat, recount],
  );

  useEventStream("/api/briefing/advisor-notices", EVENTS, onEvent);

  // The page title can be reset by navigation, so it is applied again after every route change.
  useEffect(() => {
    setTitleCount(unread);
  }, [unread, pathname]);

  return <AlertToasts toasts={toasts} onDismiss={dismiss} />;
}
