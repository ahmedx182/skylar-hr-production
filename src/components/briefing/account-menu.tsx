"use client";

import { Building2, CheckCircle2, LogOut, Settings } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogoutButton } from "@/components/auth/logout-button";
import type { AuthSession } from "@/types/auth";

function initials(email: string | null) {
  if (!email) return "S";
  return email.slice(0, 1).toUpperCase();
}

export function AccountMenu({ session }: { session: AuthSession }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 72, right: 24 });

  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 12,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative z-[80]">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex cursor-pointer list-none items-center gap-2 rounded-full px-1.5 py-1.5 text-left transition-colors hover:bg-paper/[0.06]"
      >
        <span className="grid size-9 place-items-center rounded-full bg-paper text-sm font-semibold text-ink">
          {initials(session.email)}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block max-w-52 truncate text-sm font-semibold text-paper">
            {session.email ?? "Signed in"}
          </span>
          <span className="mt-0.5 block font-mono text-xs uppercase text-paper-3">
            {session.role}
          </span>
        </span>
      </button>

      {isOpen && isMounted && createPortal(
      <div
        ref={menuRef}
        className="fixed z-[200] w-72 rounded-xl border border-paper/[0.08] bg-[#151519] p-3 text-paper shadow-[0_28px_90px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(244,239,231,0.06)]"
        style={{ top: position.top, right: position.right }}
      >
        <div className="flex items-center gap-3 px-1 pb-3">
          <span className="grid size-10 place-items-center rounded-full bg-paper text-sm font-semibold text-ink">
            {initials(session.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.email ?? "Signed in"}</p>
            <p className="mt-1 text-xs text-paper-3">Signed in as {session.role}</p>
          </div>
        </div>

        <div className="grid gap-1 border-y border-paper/10 py-2 text-sm">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Building2 className="size-4 text-paper-3" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-paper-3">Workspace</p>
              <p className="truncate font-semibold text-paper">{session.companyId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            <div>
              <p className="text-xs text-paper-3">Session</p>
              <p className="font-semibold text-paper">Secure</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-paper-2 transition-colors hover:bg-paper/[0.06] hover:text-paper"
          >
            <Settings className="size-4" aria-hidden="true" />
            <span className="text-sm font-semibold">Account settings</span>
          </button>
        </div>

        <div className="pt-2">
          <LogoutButton>
            <LogOut className="size-4" aria-hidden="true" />
            <span>Sign out</span>
          </LogoutButton>
        </div>
      </div>,
      document.body,
      )}
    </div>
  );
}
