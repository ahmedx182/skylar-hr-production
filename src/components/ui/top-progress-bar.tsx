"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const START_PROGRESS = 18;
const HOLD_PROGRESS = 78;
const COMPLETE_PROGRESS = 100;

function isInternalNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) return false;
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
    return nextUrl.hash !== currentUrl.hash ? false : false;
  }

  return true;
}

export function TopProgressBar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousPathname = useRef(pathname);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    hideTimer.current = null;
    trickleTimer.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setIsVisible(true);
    setProgress(START_PROGRESS);

    requestAnimationFrame(() => setProgress(42));
    trickleTimer.current = setInterval(() => {
      setProgress((current) => {
        if (current >= HOLD_PROGRESS) return current;
        return Math.min(HOLD_PROGRESS, current + Math.random() * 8);
      });
    }, 420);
  }, [clearTimers]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigationClick(event)) start();
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      start();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function replaceState(...args) {
      start();
      return originalReplaceState.apply(this, args);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      clearTimers();
    };
  }, [clearTimers, start]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (!isVisible) return;

    if (trickleTimer.current) clearInterval(trickleTimer.current);
    trickleTimer.current = null;
    setProgress(COMPLETE_PROGRESS);

    hideTimer.current = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 260);
  }, [pathname, isVisible]);

  return (
    <div
      aria-hidden={!isVisible}
      className="pointer-events-none fixed left-0 top-0 z-[100] h-1 w-full overflow-hidden bg-transparent"
    >
      <div
        className={
          isVisible
            ? "h-full bg-sun shadow-[0_0_24px_rgba(245,173,68,0.65)] transition-[width,opacity] duration-300 ease-out"
            : "h-full bg-sun opacity-0 transition-opacity duration-200"
        }
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function TopProgressFallback() {
  return (
    <div
      aria-label="Loading"
      role="progressbar"
      className="fixed left-0 top-0 z-[100] h-1 w-full overflow-hidden bg-paper/10"
    >
      <div className="h-full w-1/2 animate-[skylar-progress-slide_1.05s_ease-in-out_infinite] bg-sun shadow-[0_0_24px_rgba(245,173,68,0.65)]" />
    </div>
  );
}
